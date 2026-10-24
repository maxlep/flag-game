#!/usr/bin/env python3
"""Split js/app.js into the files of docs/split-plan.md.

Usage: tools/split_app.py [source]   (source defaults to js/app.js)

Cuts the source into top-level statements (each function, const/let, listener or other statement, with the
comment lines directly above it), looks each up in TABLE (name -> file), and writes each file with a header and its
statements in their original order. A statement the table doesn't know stops the script, with its key, so nothing
added on preview is dropped or misplaced. Then it checks that no statement was lost or changed (the new files'
statements, sorted, equal the source's, sorted), moves js/map.js to js/ui/map.js, deletes the source and rewrites the
script tags in index.html in load order.

Meant to be rerun: to rebuild the split from a newer preview, check out its js/app.js and js/map.js and run again.
Once the split is merged, js/app.js is gone and this script with it.
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def scan_depth_lines(src):
    """For each line, the bracket depth at its end, with strings, templates, regexes and comments skipped."""
    depth=0;stack=[];i=0;n=len(src);out=[];prev_sig=""
    line_end_depth=[]
    mode=None # None, 'line', 'block', '"', "'", 'tpl', 're', 'reclass'
    tpl_stack=[] # depth at which each ${ opened inside a template
    while i<n:
        c=src[i]
        if mode is None:
            if c=='\n':line_end_depth.append(depth);i+=1;continue
            if c=='/' and src[i+1:i+2]=='/':mode='line';i+=2;continue
            if c=='/' and src[i+1:i+2]=='*':mode='block';i+=2;continue
            if c in '"\'':mode=c;i+=1;continue
            if c=='`':mode='tpl';i+=1;continue
            if c=='/':
                # a regex if the last significant char can't end an expression
                if prev_sig=="" or prev_sig in "(,=:[!&|?{};+-*%<>~^" or re.search(r'\b(return|typeof|case|in|of|delete|void)$',src[max(0,i-8):i].rstrip()):
                    mode='re';i+=1;continue
            if c in '([{':depth+=1
            elif c in ')]}':
                if c=='}' and tpl_stack and tpl_stack[-1]==depth:tpl_stack.pop();depth-=1;mode='tpl';prev_sig='}';i+=1;continue
                depth-=1
            if not c.isspace():prev_sig=c
            i+=1;continue
        if mode=='line':
            if c=='\n':mode=None;continue
            i+=1;continue
        if mode=='block':
            if c=='\n':line_end_depth.append(depth)
            if src[i:i+2]=='*/':mode=None;i+=2;continue
            i+=1;continue
        if mode in '"\'':
            if c=='\\':i+=2;continue
            if c==mode:mode=None;prev_sig='"';i+=1;continue
            if c=='\n':raise SyntaxError("newline in string at %d"%i)
            i+=1;continue
        if mode=='tpl':
            if c=='\\':i+=2;continue
            if c=='\n':line_end_depth.append(depth)
            if c=='`':mode=None;prev_sig='`';i+=1;continue
            if src[i:i+2]=='${':depth+=1;tpl_stack.append(depth);mode=None;prev_sig='{';i+=2;continue
            i+=1;continue
        if mode=='re':
            if c=='\\':i+=2;continue
            if c=='[':mode='reclass';i+=1;continue
            if c=='/':
                mode=None;i+=1
                while i<n and src[i].isalpha():i+=1
                prev_sig=')';continue
            i+=1;continue
        if mode=='reclass':
            if c=='\\':i+=2;continue
            if c==']':mode='re'
            i+=1;continue
    if not src.endswith('\n'):line_end_depth.append(depth)
    assert depth==0,("unbalanced",depth)
    return line_end_depth

CONT=tuple(".+?:,)]}*-|&")
def statements(src):
    lines=src.split('\n')
    if lines and lines[-1]=='':lines=lines[:-1]
    dep=scan_depth_lines(src+('' if src.endswith('\n') else '\n'))
    stmts=[];pending=[];cur=None;blank_before=False
    for k,l in enumerate(lines):
        d=dep[k]
        if cur is None:
            if l.strip()=="":pending=[] if not pending else pending;blank_before=True if not pending else blank_before;
            if l.strip()=="":
                if pending:pending.append(l)
                continue
            if l.startswith("//") and not pending: pending=[l];continue
            if l.startswith("//"):pending.append(l);continue
            cur={"lead":pending,"code":[l],"blank":blank_before};pending=[];blank_before=False
        else:
            cur["code"].append(l)
        if d==0:
            nxt=next((x for x in lines[k+1:k+2]),None)
            if nxt is None or nxt=="" or (not nxt[0].isspace() and not nxt.startswith(CONT)):
                stmts.append(cur);cur=None
    assert cur is None and not [p for p in pending if p.strip()],("trailing",cur,pending)
    return stmts


def key_of(code):
    """A statement's key in TABLE: its declared name, or for anything else (listeners, IIFEs, calls) its first line,
    cut to 60 characters, which is both readable in the table and specific enough to catch a changed or new one."""
    first = code[0]
    m = re.match(r'(?:async\s+)?function\s+([\w$]+)', first)
    if m: return m.group(1)
    m = re.match(r'(?:const|let|var)\s+([\w$]+)', first)
    if m: return m.group(1)
    return first[:60]

# A line at column 0 that starts with one of these continues the statement above rather than starting one.
CONT = tuple(".+?:,)]}*-|&")

def statements(src):
    """Top-level statements: {"lead": comment lines above it, "code": its lines, "blank": a blank line before it}."""
    lines = src.split("\n")
    if lines and lines[-1] == "": lines = lines[:-1]
    dep = scan_depth_lines(src if src.endswith("\n") else src + "\n")
    out, lead, cur, blank = [], [], None, False
    for k, l in enumerate(lines):
        if cur is None:
            if l.strip() == "":
                if not lead: blank = True
                continue
            if l.startswith("//"):
                lead.append(l); continue
            cur = {"lead": lead, "code": [l], "blank": blank}; lead, blank = [], False
        else:
            cur["code"].append(l)
        if dep[k] == 0:
            nxt = lines[k + 1] if k + 1 < len(lines) else None
            if nxt is None or nxt == "" or (not nxt[0].isspace() and not nxt.startswith(CONT)):
                out.append(cur); cur = None
    if cur is not None or lead:
        sys.exit("split_app: the source ends inside a statement or with a stray comment")
    return out

def text(st): return "\n".join(st["lead"] + st["code"])

# ---- where each statement goes ----
# Files in load order, each with its header: what it owns, and which earlier files its load-time code needs. Code
# inside functions may call into any file; only code that runs while a file loads must find its names already there.
FILES = [
 ("js/core/util.js", "Small helpers with no DOM and no state: escaping, shuffling, normalising names, edit distance, dates.", "nothing"),
 ("js/core/settings.js", "The saved settings: SET, loading and setting them (setOpt draws the screen again), the difficulty notes.", "nothing (setOpt calls render, in ui/router.js, when it runs)"),
 ("js/core/store.js", "Progress (prog), badges as stored (badges), and the saved round: loading and saving each in localStorage.", "nothing"),
 ("js/core/match.js", "Typed answers: matching a name or alias, exactly or with typos, and the suggestions.", "core/util.js (norm), the data files (FLAGS, ALIASES)"),
 ("js/core/scope.js", "Regions and scope: which region a flag is in, which flags a scope and a region hold.", "the data files (FLAGS, NOQUIZ, REGIONS, GEO)"),
 ("js/core/flag.js", "Facts about one flag, as data: its designs, its Wikipedia links, its region label, its years.", "nothing"),
 ("js/core/sort.js", "Sorting and grouping a list: A–Z, by region, by area.", "the data files (AREAS)"),
 ("js/core/badges.js", "The badges and the titles, and awarding them at the end of a round.", "nothing"),
 ("js/core/share.js", "The text of a result to share: the emoji grid, the missed flags.", "nothing"),
 ("js/core/round.js", "The round: S (what is on screen and the round in progress), building a round, answering, moving on.", "nothing"),
 ("js/ui/dom.js", "Reaching the page: $, app, pointer capture, a Wikipedia link.", "nothing"),
 ("js/ui/map.js", None, None),
 ("js/ui/parts/flag.js", "Drawing a flag and its facts: the image with its designs, the design chips, the name and capital lines, the card's flag and map.", "nothing"),
 ("js/ui/parts/card.js", "Home and region cards, their icons and buttons, the scope control on the home screen, and the pinned header of every screen.", "nothing"),
 ("js/ui/parts/entry.js", "A study entry, shared by the study list and the map's list.", "nothing"),
 ("js/ui/parts/list.js", "What both lists share: the scope and sort pills, group headers, the letter index.", "nothing"),
 ("js/ui/viewport.js", "The phone keyboard and the pinned quiz layout: the viewport's height, the flag's size, the suggestion row's touches. SUG lives here.", "ui/dom.js (app)"),
 ("js/ui/router.js", "Which screen shows: going to a screen and back, drawing it (render), the keys, the edge swipe.", "nothing"),
 ("js/ui/screens/home.js", "The home screen and the version check.", "nothing"),
 ("js/ui/screens/setup.js", "The setup screen before a round.", "nothing"),
 ("js/ui/screens/quiz.js", "The quiz screen, and the question flag's way into the viewer.", "nothing"),
 ("js/ui/screens/done.js", "The results screen, copying and sharing a result.", "nothing"),
 ("js/ui/screens/study.js", "The study list.", "nothing"),
 ("js/ui/screens/look.js", "The look-alikes page.", "nothing"),
 ("js/ui/screens/badges.js", "The badges page.", "nothing"),
 ("js/ui/viewer.js", "The viewer, the only zoom: a flag's designs, a map, or the explorable map. LB lives here.", "nothing"),
 ("js/ui/explore/open.js", "Opening and framing the explorable map: its region, scope and sort, its back button, the insets the list and card leave. EXRET lives here.", "nothing"),
 ("js/ui/explore/select.js", "Picking a place on the explorable map: a tap, the selection and its card, bringing a place into view, the hatch.", "nothing"),
 ("js/ui/explore/list.js", "The list beside the explorable map: its drawer and tab, moving between it and the study list, the keys.", "nothing"),
 ("js/boot.js", "Starting the app: loading what is saved, restoring a round, the first draw.", "every file before it"),
]

T = {}
def put(path, *keys):
    for k in keys:
        k = k[:60]  # the same cut key_of makes
        if k in T: sys.exit(f"split_app: {k} is in the table twice")
        T[k] = path
put("js/core/util.js", "esc", "shuffle", "norm", "editDist", "fmtDate")
put("js/core/settings.js", "SKEY", "SET", "loadSet", "setOpt", "DIFF", "TYPED")
put("js/core/store.js", "KEY", "prog", "load", "save", "rec", "PTS", "mastered", "seen", "BKEY", "loadB", "saveB", "RKEY", "saveRound", "loadRound")
put("js/core/match.js", "NAMES", "ALIASN", "matchStrict", "matchTyped", "CANDS", "allowed", "suggestAll", "suggest")
put("js/core/scope.js", "geoOf", "inScope", "QUIZ", "SCOPED", "ALLREGIONS", "regionFlags", "regionAll", "scopeName", "SCOPES", "inFilter", "filterLabel")
put("js/core/flag.js", "VARS", "useLabel", "variantIdx", "links", "whereOf", "flagYears")
put("js/core/sort.js", "AREA_OF", "letterOf", "sortModes", "sortMode", "groupList", "setSort")
put("js/core/badges.js", "BADGES", "TITLE", "BADGE", "checkBadges")
put("js/core/share.js", "SITE", "flagEmoji", "shareGrid", "shareMissed", "shareText")
put("js/core/round.js", "S", "poolFor", "pickOrder", "optCount", "distractors", "startRound", "submitTyped", "typeInput", "pickSugg", "answer", "next", "showLore", "wake", "setQVar", "mixedRound")
put("js/ui/dom.js", "$", "app", "capture", "wl")
put("js/ui/parts/flag.js", "img", "showVariant", "useLine", "vchips", "nameLink", "nameLine", "facts", "cardFlag", "mapCard")
put("js/ui/parts/card.js", "BOOK", "CARDN", "PLAYICON", "MAPICON", "card", "setCards", "scopeSeg", "wideDesc", "shell")
put("js/ui/parts/entry.js", "studyVar", "studyPill", "scopeLabel", "studyEntry", "whereShown")
put("js/ui/parts/list.js", "scopeChips", "sortChips", "groupHead", "groupIndex", "grpCover", "stickyHeight", "wireAlpha",
    'addEventListener("resize",()=>{if(S.view==="study")stickyHeight()});')
put("js/ui/viewport.js", "shade", "VVH", "keyboard", "fitFlag", "PRE_T", "preKeyboard", "TOUCH_T", "SUG",
    'window.addEventListener("scroll",shade,{passive:true});window.addEv',
    'app.addEventListener("touchmove",e=>{if(S.view!=="quiz")return;const m',
    'app.addEventListener("pointerdown",e=>{const sg=e.target.closest&&e.ta',
    'app.addEventListener("pointermove",e=>{if(!SUG||e.pointerId!==SUG.id)r',
    'app.addEventListener("pointerup",e=>{const d=SUG;SUG=null;if(!d||e.poi',
    'app.addEventListener("pointercancel",()=>{SUG=null},{capture:true});',
    'if(window.visualViewport){window.visualViewport.addEventListener("resi',
    'window.addEventListener("resize",keyboard);',
    'document.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"',
    'document.addEventListener("focusin",e=>{if(e.target.id!=="typeIn")retu')
put("js/ui/router.js", "here", "goBack", "stayInRound", "HOME_Y", "goHome", "leaveHome", "openSetup", "openStudy", "openLook", "openBadges", "render", "renderQuiz", "patchAround",
    'document.addEventListener("keydown",e=>{', '(()=>{let sx=null,sy=null,fired=false;')
put("js/ui/screens/home.js", "viewHome", "hardReload", "VER_CHECKED", "checkVersion", "resetAsk")
put("js/ui/screens/setup.js", "viewSetup")
put("js/ui/screens/quiz.js", "viewQuiz", "wireZoom")
put("js/ui/screens/done.js", "CLIP", "copyResult", "share", "viewDone")
put("js/ui/screens/study.js", "WIDE", "studyList", "viewStudy", "studyScope", "studyMap", "wireMiniMaps")
put("js/ui/screens/look.js", "viewLook")
put("js/ui/screens/badges.js", "viewBadges")
put("js/ui/viewer.js", "LB", "openFlag", "openMap", "openViewer", "lbDown", "lbMove", "lbUp", "lbToggle", "lbBox", "lbCenter", "lbMax", "lbZoom", "lbSettle", "lbApply",
    "lbMapHome", "lbTrack", "lbGo", "lbShow", "lbStep", "lbMapChip", "lbPick", "lbFit", "lbCaption", "closeFlag", "lbAnimate",
    'window.addEventListener("resize",()=>{if(LB&&LB.scale===1){lbFit();LB.')
put("js/ui/explore/open.js", "EXRET", "openExplore", "exRegionSel", "exRegion", "exScope", "exSort", "exBackTo", "exFlag", "lbExHome", "exLayout", "exVis",
    'addEventListener("resize",()=>{if(LB&&LB.what==="explore")exLayout()})')
put("js/ui/explore/select.js", "exTap", "exSelect", "exCaption", "exCard", "exMark", "exPick", "lbHatch")
put("js/ui/explore/list.js", "exWide", "exFolded", "exListBuild", "exFoldTo", "exFull", "exTabSync", "exTabWire", "exTop", "studyTop", "exToList", "exArrow", "exStep",
    "exScreenOf", "exMidView", "exNearest")
put("js/boot.js", "load();loadSet();loadB();", "start",
    "if(window.claude?.hot?.snapshot)window.claude.hot.snapshot(()=>({S}));",
    "window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.")

def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else "js/app.js"
    src = open(src_path, encoding="utf-8").read()
    st = statements(src)
    unknown = [key_of(s["code"]) for s in st if key_of(s["code"]) not in T]
    if unknown:
        sys.exit("split_app: not in the table (add each to TABLE in tools/split_app.py):\n  " + "\n  ".join(unknown))
    seen = {}
    for s in st:
        k = key_of(s["code"])
        if k in seen: sys.exit(f"split_app: two statements have the key {k!r}; give the table a longer one")
        seen[k] = 1
    missing = [k for k in T if k not in seen]
    if missing: sys.exit("split_app: in the table but not in the source (remove them):\n  " + "\n  ".join(missing))

    by_file = {p: [] for p, _, _ in FILES}
    for s in st: by_file[T[key_of(s["code"])]].append(s)

    written = []
    for path, what, needs in FILES:
        if what is None: continue  # moved, not written
        body = by_file[path]
        if not body: sys.exit(f"split_app: {path} would be empty")
        out = [f"// {path}: {what}", f"// Needs before it at load time: {needs}.", ""]
        for j, s in enumerate(body):
            if j and s["blank"]: out.append("")
            out.append(text(s))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
        written.append(path)

    # Nothing lost or changed: the statements of the new files, sorted, equal the source's, sorted.
    new = []
    for p in written:
        s2 = statements(open(p, encoding="utf-8").read())
        if s2 and s2[0]["lead"] and s2[0]["lead"][0].startswith(f"// {p}: "):
            s2[0]["lead"] = s2[0]["lead"][2:]  # the header this script wrote
        new += [text(s) for s in s2]
    old = [text(s) for s in st]
    if sorted(new) != sorted(old):
        a, b = set(old) - set(new), set(new) - set(old)
        sys.exit(f"split_app: statement check failed: {len(a)} in the source only, {len(b)} in the new files only")
    print(f"split_app: {len(st)} statements into {len(written)} files; statement check passed")

    if os.path.exists("js/map.js"):
        subprocess.run(["git", "mv", "-f", "js/map.js", "js/ui/map.js"], check=True)
    if os.path.abspath(src_path) == os.path.abspath("js/app.js"):
        subprocess.run(["git", "rm", "-q", "-f", "js/app.js"], check=True)

    # index.html: the data files and version.js as they were, then the code in load order.
    html = open("index.html", encoding="utf-8").read()
    tags = re.findall(r'<script src="js/[^"]+"></script>\n', html)
    keep = [t for t in tags if re.search(r'src="js/(data/|version\.js)', t)]
    code = [f'<script src="{p}"></script>\n' for p, _, _ in FILES]
    first = html.index(tags[0]); last = html.index(tags[-1]) + len(tags[-1])
    html = html[:first] + "".join(keep + code) + html[last:]
    open("index.html", "w", encoding="utf-8").write(html)
    print("split_app: index.html loads", len(keep) + len(code), "scripts")

if __name__ == "__main__":
    main()
