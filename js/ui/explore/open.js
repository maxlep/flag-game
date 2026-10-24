// js/ui/explore/open.js: Opening and framing the explorable map: its region, scope and sort, its back button, the insets the list and card leave. EXRET lives here.
// Needs before it at load time: nothing.

// The explorable map: a study list's flags laid out on the map of its region. A tap selects a shape; the card at the
// bottom is its study entry. The card's flag opens the designs, and closing those comes back here as it was (EXRET).
let EXRET = null;
// at: a flag code whose entry the list opens at (the one at the top of the study list it came from); sel: a place to
// select and show, without motion.
function openExplore(region, keep, at, sel) {
  const wide = WIDE.includes(region),
    ex = exploreOf(
      wide ? "World" : region,
      regionAll(region).map(f => f.c)
    );
  if (!ex) return;
  ex.on = new Set(studyList(region).map(f => f.c));
  openViewer(null, {what: "explore", region, title: wide ? scopeName() : region, ex, keep, at});
  if (sel && LB && LB.what === "explore") exPick(sel, true);
}
// The map is a page, not a pop-up, so it has a back button, not a ×: a square one left of the title, matching the zoom
// buttons on the right, so the bar looks the same wherever the map was opened from. Where it goes (the study list it
// came from, or home) is in its tooltip and label rather than its face, which would repeat the region's name.
function exBackTo() {
  return S.view === "study"
    ? `the ${WIDE.includes(S.region) ? scopeName() : S.region} list`
    : S.view === "home"
      ? "Home"
      : "the last page";
}
// The region picker in the map's title: every region with shapes, then the whole world (named for the scope).
function exRegionSel(cur) {
  const regs = [
    ...ALLREGIONS.filter(r =>
      exploreOf(
        r,
        regionAll(r).map(f => f.c)
      )
    ),
    scopeName()
  ];
  return `<label class="lb-region"><span class="nm">${esc(WIDE.includes(cur) ? scopeName() : cur)}</span><select aria-label="Region" onchange="exRegion(this.value)">${regs.map(r => `<option value="${esc(r)}"${r === cur || (WIDE.includes(cur) && r === scopeName()) ? " selected" : ""}>${esc(r)}</option>`).join("")}</select></label>`;
}
// A new region, from the map: opened afresh, and the study list behind (if that's where it came from) follows it.
function exRegion(r) {
  if (!LB || LB.what !== "explore") return;
  if (S.view === "study") {
    S.region = r;
    render();
  }
  openExplore(r);
}
// The scope, changed from the map: the setting itself (the study list behind follows), then the map again as it was.
function exScope(v) {
  if (!LB || LB.what !== "explore" || SET.scope === v) return;
  const k = {sel: LB.sel, scale: LB.scale, x: LB.x, y: LB.y};
  let r = LB.region;
  if (WIDE.includes(r)) r = S.region = {countries: "Whole world", all: "Everything", territories: "All territories"}[v];
  setOpt("scope", v);
  openExplore(r, k);
}
function exFlag(c, btn) {
  if (!LB || LB.what !== "explore") return;
  const en = btn && btn.closest(".entry"),
    vi = en ? +en.dataset.v : 0,
    b = $("#exBody");
  EXRET = {region: LB.region, sel: LB.sel, scale: LB.scale, x: LB.x, y: LB.y, top: b ? b.scrollTop : 0};
  openFlag(c, vi, {noMap: true});
}
// The explorable map opens with its region filling the stage: the region's frame (data-fit) covers it, so a wide
// region on a tall phone fills the height and pans sideways. No more than twice the size that shows all of it.
function lbExHome() {
  if (!LB) return;
  const fl = LB.fl,
    v = LB.vb0,
    f = (fl.dataset.fit || "").split(" ").map(Number);
  if (f.length !== 4) return;
  // Fitted to the part of the stage that shows (past the list and the title), centred there.
  const u = v.w / LB.baseW,
    V = exVis(),
    vw = (V.right - V.left) * u,
    vh = (V.bottom - V.top) * u,
    C = lbCenter();
  const contain = Math.min(vw / f[2], vh / f[3]),
    cover = Math.max(vw / f[2], vh / f[3]),
    s = Math.max(1, Math.min(lbMax(), cover, contain * 2));
  const P = {x: (V.left + V.right) / 2, y: (V.top + V.bottom) / 2};
  LB.home = s;
  LB.scale = s;
  LB.x = P.x - C.x - (s * (f[0] + f[2] / 2 - (v.x + v.w / 2))) / u;
  LB.y = P.y - C.y - (s * (f[1] + f[3] / 2 - (v.y + v.h / 2))) / u;
  lbApply();
}
// The sort, changed from the map's list: the setting (the study list behind follows), the list again, at the selection.
function exSort(v) {
  if (!LB || LB.what !== "explore" || SET.sort === v) return;
  setOpt("sort", v);
  exListBuild();
  const b = $("#exBody");
  if (LB.sel) exMark(LB.sel, true);
  else if (b) b.scrollTop = 0;
}
// The room the list and the card take, as insets on the map: the stage stays full screen, the map's centre and its
// panning limits move instead. --exh lifts the card above the drawer.
function exLayout() {
  if (!LB || !LB.ex) return;
  const L = $("#exList"),
    wide = exWide(),
    hid = !!SET.exFold,
    top = LB.el.querySelector(".lb-top .title");
  LB.el.classList.toggle("exwide", wide);
  // Sizes as laid out, not as on screen: the list slides away by a transform that may still be running.
  const h = wide || hid ? 0 : L.offsetHeight,
    w = wide && !hid ? L.offsetWidth : 0,
    card = $("#exCard"),
    ch = card && card.firstChild ? card.offsetHeight + 12 : 0;
  LB.el.style.setProperty("--exh", h + "px");
  LB.el.style.setProperty("--exw", w + "px");
  LB.ins = {l: w, t: top ? top.getBoundingClientRect().bottom + 6 : 0, b: h + ch};
}
// The part of the stage the map can be seen in, past the list, the card and the title.
function exVis() {
  const r = LB.stage.getBoundingClientRect(),
    i = LB.ins || {l: 0, t: 0, b: 0};
  return {left: r.left + i.l, top: r.top + i.t, right: r.right, bottom: r.bottom - i.b};
}

addEventListener("resize", () => {
  if (LB && LB.what === "explore") exLayout();
});
