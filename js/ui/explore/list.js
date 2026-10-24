// js/ui/explore/list.js: The list beside the explorable map: its drawer and tab, moving between it and the study list, the keys.
// Needs before it at load time: nothing.

// The list beside the map: the study list of the places in the scope, in name order, with the letter index. On a phone
// it is a drawer at the bottom that folds down to its handle; on a wide screen a panel on the left that stays.
// A tap on an entry (not on its links or buttons) selects the place and brings it into view; a tap on the map marks
// the entry and scrolls the list to it.
const exWide = () => matchMedia("(min-width: 820px) and (min-height: 480px)").matches;
const exFolded = () => !!SET.exFold;
function exListBuild() {
  const b = $("#exBody"),
    a = $("#exAlpha");
  if (!b) return;
  const wide = WIDE.includes(LB.region);
  const list = studyList(LB.region).filter(f => LB.ex.on.has(f.c)),
    mixed = wide || SET.scope !== "countries",
    G = groupList(list, wide);
  b.innerHTML =
    G.groups
      .map(
        g =>
          groupHead(g, G.mode) +
          g.items.map(f => studyEntry(f, mixed, {noMap: true, flagClick: `exFlag('${f.c}',this)`})).join("")
      )
      .join("") || '<p class="muted small">No places here in this scope.</p>';
  a.innerHTML = groupIndex(G);
  const s = $("#exSort");
  if (s) s.innerHTML = sortChips("exsortchips", "exSort", wide);
  if (b._wired) return;
  b._wired = true;
  wireAlpha(a, b);
  b.addEventListener("click", e => {
    if (e.target.closest("a,button")) return;
    const en = e.target.closest(".entry");
    if (en) exPick(en.dataset.c);
  });
}
// The list has three states on one control, the tab on its edge (over the map): hidden, open beside the map, and the
// full study list, which is the same list grown to fill the screen and then handed to the study view at the same
// place. Up (or right, on a wide screen) goes a step towards the full list; down (left) a step towards hidden. A drag
// on the tab does the same. Hidden or open is remembered.
function exStep(d) {
  if (!LB || LB.what !== "explore") return;
  if (d > 0) {
    if (SET.exFold) exFoldTo(false);
    else exFull();
  } else if (!SET.exFold) exFoldTo(true);
}
function exFoldTo(h) {
  SET.exFold = h;
  try {
    localStorage.setItem(SKEY, JSON.stringify(SET));
  } catch (e) {}
  if (!h && LB.sel) exMark(LB.sel, true); // scrolled there before it slides in, so there is nothing to watch
  $("#exList").classList.toggle("folded", h);
  exTabSync();
  exCard();
  exLayout();
}
function exFull() {
  const L = $("#exList");
  L.classList.add("full");
  LB.el.classList.add("exfull");
  setTimeout(() => {
    if (LB && LB.what === "explore") exToList();
  }, 260);
}
function exTabSync() {
  const t = $("#exTab");
  if (!t) return;
  const h = !!SET.exFold,
    up = t.querySelector(".exup"),
    dn = t.querySelector(".exdown");
  const lab = (b, l) => {
    b.setAttribute("aria-label", l);
    b.title = l;
  };
  lab(up, h ? "Show the list" : "Open the full list");
  up.setAttribute("aria-expanded", String(!h));
  lab(dn, "Hide the list");
  dn.hidden = h;
  t.classList.toggle("folded", h);
}
// A drag on the tab: towards the map's middle a step out, back a step in. A drag doesn't also count as a tap.
function exTabWire() {
  const t = $("#exTab");
  if (!t) return;
  let moved = false;
  // The drag is followed on the window, not by capturing the pointer: a capture would send the click to the tab
  // rather than its button, and the pointer soon leaves a tab this small.
  t.addEventListener("pointerdown", e => {
    const p = {x: e.clientX, y: e.clientY};
    moved = false;
    const mv = ev => {
      if (!moved && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > 8) moved = true;
    };
    const up = ev => {
      removeEventListener("pointermove", mv);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      if (ev.type === "pointercancel") return;
      const d = exWide() ? ev.clientX - p.x : p.y - ev.clientY;
      if (moved && Math.abs(d) > 30) exStep(d > 0 ? 1 : -1);
    };
    addEventListener("pointermove", mv);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
  });
  t.addEventListener(
    "click",
    e => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    },
    true
  );
}
// The list and the map are two views of one list, and keep their place between them. From the map: the study list of
// the region, at the selected place, or else at the entry at the top of the drawer. From the study list: the map,
// its drawer at the entry at the top of the page (studyTop).
function exTop() {
  const b = $("#exBody");
  if (!b || exFolded()) return null;
  const t = b.getBoundingClientRect().top;
  const en = [...b.querySelectorAll(".entry")].find(e => e.getBoundingClientRect().bottom > t + 20);
  return en ? en.dataset.c : null;
}
function studyTop() {
  const head = app.querySelector(".sticky"),
    t = head ? head.getBoundingClientRect().bottom : 0;
  const en = [...app.querySelectorAll(".study .entry")].find(e => e.getBoundingClientRect().bottom > t + 20);
  return en ? en.dataset.c : null;
}
function exToList() {
  if (!LB || LB.what !== "explore") return;
  const r = LB.region,
    c = LB.sel && LB.ex.on.has(LB.sel) ? LB.sel : exTop();
  closeFlag();
  if (S.view === "study") {
    if (S.region !== r) {
      S.region = r;
      render();
    }
  } else openStudy(r);
  const en = c && app.querySelector(`.study .entry[data-c="${c}"]`);
  if (!en) return;
  const head = app.querySelector(".sticky"),
    off = (head ? head.getBoundingClientRect().height : 0) + 8 + grpCover(app.querySelector(".study"));
  window.scrollTo(0, en.getBoundingClientRect().top + window.scrollY - off);
}
// The up and down keys walk the list, in its order (so in Area order they go from neighbour to neighbour), whether
// the list shows or not: hidden, the card follows. They wrap round at the ends. With nothing in the list selected
// they start at the first entry in view, or with the list hidden at the place nearest the middle of the map; with a
// place outside the scope selected, at the place in the list nearest it.
function exArrow(d) {
  if (!LB) return;
  const b = $("#exBody");
  if (!b) return;
  const ens = [...b.querySelectorAll(".entry")];
  if (!ens.length) return;
  const i = ens.findIndex(e => e.dataset.c === LB.sel);
  let n;
  if (i >= 0) n = (i + d + ens.length) % ens.length;
  else {
    const c = LB.sel
      ? exNearest(exScreenOf(LB.sel))
      : exFolded()
        ? exNearest(exMidView())
        : exTop() || exNearest(exMidView());
    n = Math.max(
      0,
      ens.findIndex(e => e.dataset.c === c)
    );
  }
  if (n === i) return;
  exPick(ens[n].dataset.c);
}
// Where a place's centre is on screen, the middle of the part of the map that shows, and the list's place nearest a point.
function exScreenOf(c) {
  const S = MAP.set[MAP.frame[LB.ex.frame].set],
    p = S.pt[c];
  if (!p) return exMidView();
  const fl = LB.fl,
    m = fl.getScreenCTM(),
    pt = fl.createSVGPoint();
  pt.x = p[0];
  pt.y = p[1] * (+fl.dataset.sy || 1);
  const q = pt.matrixTransform(m);
  return {x: q.x, y: q.y};
}
function exMidView() {
  const V = exVis();
  return {x: (V.left + V.right) / 2, y: (V.top + V.bottom) / 2};
}
function exNearest(P) {
  let best = null,
    bd = 1e18;
  for (const en of $("#exBody").querySelectorAll(".entry")) {
    const q = exScreenOf(en.dataset.c),
      d = (q.x - P.x) ** 2 + (q.y - P.y) ** 2;
    if (d < bd) {
      bd = d;
      best = en.dataset.c;
    }
  }
  return best;
}
