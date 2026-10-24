// js/ui/quizmap.js: The map you answer on in a map round: drawn for the question, panned and zoomed in place, a tap
// selecting a place. Its view is kept across redraws of the same question (QMV). Also the answer card's map, which
// pans and zooms the same way and returns to the place when let go.
// Needs before it at load time: nothing.

// The view of the current question's map, kept while the question is redrawn: {i, c, vb: [x, y, w, h], shown}.
let QMV = null;
// The frame a question's map shows: the round's region when all its places share one (a Europe round is always
// Europe: starting from the whole world would only add zooming). A round that mixes regions shows the place's region
// on Easy and Medium and the whole world from Hard, since knowing the region is then part of the question.
const qmFrames = new WeakMap();
function qmFrame(c) {
  let f = qmFrames.get(S.qs);
  if (f === undefined) {
    const fs = new Set(S.qs.map(q => mapFrameFor(q.c)));
    f = fs.size === 1 ? [...fs][0] : null;
    qmFrames.set(S.qs, f);
  }
  return f || (S.diff === "easy" || S.diff === "medium" ? mapFrameFor(c) : "World");
}
// In the round's scope: the round records the scope it ran under.
const qmInScope = f => S.scope === "all" || (S.scope === "countries" ? f.sov : !f.sov);
// The map's markup: every place of the frame tappable, those in the round's scope above the rest (so in Countries the
// United Kingdom is found above England). Drawn as the explorable map draws, without the hatch; Expert and Master
// have no borders.
function qmSVG(q) {
  const frame = qmFrame(q.c);
  const codes = (frame === "World" ? FLAGS : FLAGS.filter(f => geoOf(f) === frame)).map(f => f.c);
  const on = new Set(FLAGS.filter(qmInScope).map(f => f.c));
  return mapExploreSVG({frame, codes, on, cls: "qmapsvg" + (TYPED(S.diff) ? " noborder" : "")});
}
// The map's controls: zoom in and out, for a mouse with no wheel or a keyboard.
const QMCTL = `<div class="qmctl"><button type="button" onmousedown="event.preventDefault()" onclick="qmZoom(1.6)" aria-label="Zoom in">+</button><button type="button" onmousedown="event.preventDefault()" onclick="qmZoom(1/1.6)" aria-label="Zoom out">−</button></div>`;

// How far in a wide frame opens on a tall map.
const QMZ = 1.6;
const qmSvg = () => app.querySelector(".qmap svg.map");
// After each draw of a map question: size the map to the room left under the question, restore its view (or open on
// the frame), mark the selection or the answer, and listen for gestures.
function wireQuizMap() {
  const box = app.querySelector(".qmap"),
    svg = box && box.querySelector("svg.map");
  if (!svg || svg._wired) return;
  svg._wired = true;
  svg._box = box;
  qmFit(box);
  const q = S.qs[S.i],
    asp = box.clientWidth / Math.max(1, box.clientHeight);
  const fit = svg.dataset.fit.split(" ").map(Number);
  let [x, y, w, h] = fit;
  if (w / h < asp) {
    const nw = h * asp;
    x -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / asp;
    y -= (nh - h) / 2;
    h = nh;
  }
  // The bounds: the whole frame, fitted to the box. The view it opens on: the frame's height filling a box taller than
  // it, up to 1.6 times in, so a wide frame on a phone opens large enough to tap and pans sideways.
  svg._bounds = [x, y, w, h];
  const hw = Math.min(fit[2], Math.max(fit[2] / QMZ, fit[3] * asp));
  svg._home = [fit[0] + fit[2] / 2 - hw / 2, fit[1] + fit[3] / 2 - hw / asp / 2, hw, hw / asp];
  const keep = QMV && QMV.i === S.i && QMV.c === q.c && QMV.vb;
  const shown = keep && QMV.shown;
  if (!keep) QMV = null;
  qmSet(svg, keep ? QMV.vb : svg._home);
  if (q.ans && !shown) qmShow(svg, q);
  qmMark(svg, q);
  qmGestures(svg, box);
}
// The map fills the middle band under the question. With a card to read it gives up a third of that, and the band
// scrolls to the card under it.
function qmFit(box) {
  const mid = $("#qmid"),
    p = mid && mid.querySelector(".qprompt");
  if (!mid) return;
  const cs = getComputedStyle(mid),
    gap = parseFloat(cs.rowGap) || 10;
  const h =
    mid.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (p ? p.offsetHeight + gap : 0);
  const q = S.qs[S.i],
    card = q.ans && !(S.pace === "drill" && q.ans === q.c);
  box.style.height = Math.floor(Math.max(card ? 200 : 220, card ? h * 0.62 : h)) + "px";
}
// Set the view: never wider than the frame, never closer than 40 times in, never off the frame's edge.
function qmSet(svg, vb) {
  const H = svg._bounds,
    box = svg._box,
    asp = box.clientWidth / Math.max(1, box.clientHeight);
  const cx = vb[0] + vb[2] / 2,
    cy = vb[1] + vb[3] / 2;
  const w = Math.min(H[2], Math.max(H[2] / 40, vb[2])),
    h = w / asp;
  const x = Math.min(H[0] + H[2] - w, Math.max(H[0], cx - w / 2)),
    y = Math.min(H[1] + H[3] - h, Math.max(H[1], cy - h / 2));
  svg.setAttribute("viewBox", `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  QMV = {i: S.i, c: S.qs[S.i].c, vb: [x, y, w, h], shown: QMV && QMV.i === S.i && QMV.shown};
  qmSize(svg);
}
// Dots, tap rings and marks keep their size on screen at any zoom. A place's dot goes once it is large enough on
// screen to tap (20px across).
const QMNEAR = 150;
function qmSize(svg) {
  // Hard and Master give a small place no dot until the view is zoomed in close: under 40% of the frame's width, and
  // never wider than QMNEAR units.
  const hide = (S.diff === "hard" || S.diff === "master") && QMV.vb[2] > Math.min(QMNEAR, svg._bounds[2] * 0.4),
    u = QMV.vb[2] / Math.max(1, svg._box.clientWidth),
    M = MAP.set[MAP.frame[qmFrame(S.qs[S.i].c)].set],
    sy = +svg.dataset.sy || 1;
  svg.querySelectorAll("circle").forEach(k => {
    const c = k.dataset.c,
      b = c && M.box[c];
    const l = k.classList;
    if (b)
      k.style.display =
        Math.hypot(b[2] - b[0], (b[3] - b[1]) * sy) / u > 20 || (hide && !l.contains("ring")) ? "none" : "";
    const px = l.contains("hit") ? 12 : l.contains("ring") ? 11 : l.contains("cap") ? 3.5 : l.contains("out") ? 3 : 4.5;
    k.setAttribute("r", (px * u).toFixed(3));
  });
}
// After an answer the map moves to show the right place and a wrong pick, closer in when they are small at the
// current view (never closer than 120 units across).
function qmShow(svg, q) {
  const M = MAP.set[MAP.frame[qmFrame(q.c)].set],
    sy = +svg.dataset.sy || 1;
  const cs = [q.c, q.ans].filter(c => M.box[c]);
  if (!cs.length) return;
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  for (const c of cs) {
    const b = M.box[c];
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1] * sy);
    x1 = Math.max(x1, b[2]);
    y1 = Math.max(y1, b[3] * sy);
  }
  const v = QMV.vb,
    asp = v[2] / v[3],
    near = Math.max(120, (x1 - x0) * 3, (y1 - y0) * 3 * asp);
  if (x0 < v[0] || y0 < v[1] || x1 > v[0] + v[2] || y1 > v[1] + v[3] || v[2] > near * 2) {
    const w = Math.max((x1 - x0) * 1.4, (y1 - y0) * 1.4 * asp, Math.min(v[2], near));
    qmSet(svg, [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - w / asp / 2, w, w / asp]);
  }
  QMV.shown = true;
}
// The marks: before the answer, the place selected; after it, the right place, the wrong pick and the capital.
function qmMark(svg, q) {
  // Easy's hint: until the answer, only the part of the region the place is in (its area, as the study list groups
  // them, named in the instruction) can be tapped; the rest is faded like land outside the scope.
  const area = S.diff === "easy" && !q.ans && AREAS[AREA_OF[q.c]] ? new Set(AREAS[AREA_OF[q.c]]) : null;
  svg
    .querySelectorAll(".cts [data-c], .dots [data-c]")
    .forEach(n => n.classList.toggle("far", !!area && !area.has(n.dataset.c)));
  const M = MAP.set[MAP.frame[qmFrame(q.c)].set],
    sy = +svg.dataset.sy || 1;
  const shape = (c, cls) => (M.shape[c] ? `<path class="${cls}" d="${M.shape[c]}"/>` : "");
  const ring = (c, cls) => {
    const d = svg.querySelector(`.dot.ex[data-c="${c}"]`);
    return d
      ? `<circle class="ring ${cls}" data-c="${c}" cx="${d.getAttribute("cx")}" cy="${d.getAttribute("cy")}"/>`
      : "";
  };
  let h = "",
    m = "";
  if (!q.ans) {
    if (q.sel) {
      h = shape(q.sel, "pick");
      m = ring(q.sel, "pick");
    }
  } else {
    if (q.ans !== q.c && M.shape[q.ans]) {
      h += shape(q.ans, "wrong");
      m += ring(q.ans, "wrong");
    }
    h += shape(q.c, "right");
    m += ring(q.c, "right");
    if (M.cap[q.c]) m += `<circle class="cap" cx="${M.cap[q.c][0]}" cy="${(M.cap[q.c][1] * sy).toFixed(1)}"/>`;
  }
  svg.querySelector(".sel").innerHTML = h;
  svg.querySelector(".marks").innerHTML = m;
  qmSize(svg);
}
// A tap selects the place under it, without naming it (naming it would let you hunt by tapping); a tap on the place
// already selected keeps it. A double tap answers with the place selected, if the second tap also lands on it, so a
// second tap a little off target never answers for a neighbour. A long press goes to the next place under the finger
// (the United Kingdom under England, Italy around San Marino); a tap on that same stack of places then keeps it.
function qmTap(x, y, how) {
  const q = S.qs[S.i],
    svg = qmSvg();
  if (!svg || q.ans) return;
  // A small place's dot or the wider tap ring round it comes first, nearest dot first, then the shapes, smallest
  // (topmost) first: a tap beside San Marino's dot is San Marino, not the Italy around it. Dots go once a place is
  // large enough on screen to tap, so this only applies where the place itself would be hard to hit.
  const near = n => {
    if (n.tagName !== "circle") return 1e9;
    const r = n.getBoundingClientRect();
    return Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
  };
  const hits = [
    ...new Set(
      document
        .elementsFromPoint(x, y)
        .filter(n => svg.contains(n) && n.dataset && n.dataset.c)
        .map((n, i) => [near(n), i, n.dataset.c])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1])
        .map(a => a[2])
    )
  ];
  // The selection stays when it is the place on top here, or was reached by a long press on this same stack of places
  // (the United Kingdom picked over England stays from England, while a tap on Wales picks Wales).
  const i = hits.indexOf(q.sel),
    stack = hits.join(" "),
    keep = i >= 0 && (i === 0 || stack === qmStack);
  if (how === "long") {
    q.sel = !hits.length ? null : i >= 0 ? hits[(i + 1) % hits.length] : hits[0];
    qmStack = stack;
  } else if (!keep) {
    q.sel = hits[0] || null;
    qmStack = "";
  }
  if (how === "double" && keep) return qmCheck();
  qmPick(svg, q);
}
let qmStack = "";
// A selection changed: saved with the round, marked on the map, Check enabled.
function qmPick(svg, q) {
  saveRound();
  qmMark(svg, q);
  const b = $("#qmCheck");
  if (b) b.disabled = !q.sel;
}
function qmCheck() {
  const q = S.qs[S.i];
  if (q.sel && !q.ans) answer(q.sel);
}
// Zoom a view by f about a point on screen (the middle of the box when none is given).
function zoomAt(box, v, f, P) {
  const r = box.getBoundingClientRect(),
    u = v[2] / r.width;
  P = P || {x: r.left + r.width / 2, y: r.top + r.height / 2};
  const wx = v[0] + (P.x - r.left) * u,
    wy = v[1] + (P.y - r.top) * u,
    w = v[2] / f;
  return [wx - (P.x - r.left) * (w / r.width), wy - (P.y - r.top) * (w / r.width), w, v[3] / f];
}
function qmZoom(f, P) {
  const svg = qmSvg();
  if (svg) qmSet(svg, zoomAt(svg._box, QMV.vb, f, P));
}
// Drag pans, two fingers pinch, the wheel zooms. A press that doesn't move is a tap ("tap", "double" when it follows
// a tap within 350ms and 30px, "long" when held over 450ms). Shared by the map you answer on and the card's map: h gives
// the view (vb), sets it (set), takes taps (tap) and hears when a drag or pinch is let go or the wheel stops (rest).
function mapGestures(box, h) {
  const pts = new Map();
  let st = null,
    moved = false,
    downT = 0,
    last = null,
    wheelT = 0;
  const begin = () => {
    st = {vb: h.vb().slice(), pts: [...pts.values()].map(p => ({...p}))};
  };
  box.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    // The first finger of a new touch (and any mouse press) starts afresh: a finger whose lift never reached the map
    // would otherwise stay held, and the next one-finger drag would pinch.
    if (e.isPrimary) pts.clear();
    try {
      box.setPointerCapture(e.pointerId);
    } catch (x) {}
    pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (pts.size === 1) {
      moved = false;
      downT = Date.now();
      if (h.down) h.down();
    }
    begin();
  });
  box.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId) || !st) return;
    pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const cur = [...pts.values()],
      r = box.getBoundingClientRect(),
      u = st.vb[2] / r.width;
    if (cur.length === 1 && st.pts.length === 1) {
      const dx = cur[0].x - st.pts[0].x,
        dy = cur[0].y - st.pts[0].y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (moved) h.set([st.vb[0] - dx * u, st.vb[1] - dy * u, st.vb[2], st.vb[3]]);
    } else if (cur.length >= 2 && st.pts.length >= 2) {
      moved = true;
      const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        k = d(st.pts[0], st.pts[1]) / Math.max(1, d(cur[0], cur[1]));
      const m0 = {x: (st.pts[0].x + st.pts[1].x) / 2 - r.left, y: (st.pts[0].y + st.pts[1].y) / 2 - r.top},
        m1 = {x: (cur[0].x + cur[1].x) / 2 - r.left, y: (cur[0].y + cur[1].y) / 2 - r.top};
      const wx = st.vb[0] + m0.x * u,
        wy = st.vb[1] + m0.y * u,
        w = st.vb[2] * k,
        u1 = w / r.width;
      h.set([wx - m1.x * u1, wy - m1.y * u1, w, st.vb[3] * k]);
    }
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size) return begin();
    st = null;
    if (moved || e.type === "pointercancel") {
      if (h.rest) h.rest();
      return;
    }
    const now = Date.now(),
      quick = last && now - last.t < 350 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30;
    const how = now - downT > 450 ? "long" : quick ? "double" : "tap";
    last = how === "tap" ? {t: now, x: e.clientX, y: e.clientY} : null;
    h.tap(e.clientX, e.clientY, how);
  };
  box.addEventListener("pointerup", end);
  box.addEventListener("pointercancel", end);
  box.addEventListener("lostpointercapture", e => end({type: "pointercancel", pointerId: e.pointerId}));
  box.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      if (h.down) h.down();
      h.set(zoomAt(box, h.vb(), Math.exp(-e.deltaY * 0.0015), {x: e.clientX, y: e.clientY}));
      clearTimeout(wheelT);
      if (h.rest) wheelT = setTimeout(h.rest, 250);
    },
    {passive: false}
  );
}
function qmGestures(svg, box) {
  mapGestures(box, {vb: () => QMV.vb, set: vb => qmSet(svg, vb), tap: qmTap});
}

// The card's map, after an answer in a round that isn't on the map: the place on its region's map, panned and zoomed
// as the map you answer on is, and back on the place when let go (its zoom kept). A tap, or Enter, opens it in the
// viewer.
function cardMap(c) {
  if (!mapHas(c)) return "";
  return `<div class="cmap" data-c="${c}" role="button" tabindex="0" aria-label="Open the map" title="Open the map" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openMap('${c}')}">${mapSVG({code: c, pad: 0.3})}<div class="qmctl"><button type="button" onmousedown="event.preventDefault()" onclick="cmZoom(this,1.6)" aria-label="Zoom in">+</button><button type="button" onmousedown="event.preventDefault()" onclick="cmZoom(this,1/1.6)" aria-label="Zoom out">−</button></div></div>`;
}
function wireCardMaps() {
  app.querySelectorAll(".cmap").forEach(box => {
    const svg = box.querySelector("svg.map");
    if (!svg || svg._wired) return;
    svg._wired = true;
    const c = box.dataset.c,
      frame = mapFrameFor(c),
      M = MAP.set[MAP.frame[frame].set],
      sy = +(svg
        .querySelector("g[transform]")
        .getAttribute("transform")
        .match(/,([\d.]+)/) || [0, 1])[1],
      asp = box.clientWidth / Math.max(1, box.clientHeight);
    // The bounds: the region and a margin round it (a place at its edge, Cyprus or Iceland, still sits in the middle when
    // home), widened to the box. Home: the place's close frame at the box's shape.
    let [x, y, w, h] = svg.getAttribute("viewBox").trim().split(/\s+/).map(Number);
    if (w / h < asp) {
      x -= (h * asp - w) / 2;
      w = h * asp;
    } else {
      y -= (w / asp - h) / 2;
      h = w / asp;
    }
    const sea = svg.querySelector(".sea");
    if (sea)
      for (const [k, v] of [
        ["x", x],
        ["y", y],
        ["width", w],
        ["height", h]
      ])
        sea.setAttribute(k, v.toFixed(1));
    const f = mapFit(frame, c, asp, sy);
    const st = {box, c, M, sy, bounds: [x, y, w, h], home: [f[0], f[1] * sy, f[2] - f[0], (f[3] - f[1]) * sy]};
    svg._cm = st;
    cmSet(svg, st.home);
    mapGestures(box, {
      vb: () => st.vb,
      set: vb => cmSet(svg, vb),
      down: () => cancelAnimationFrame(st.anim),
      rest: () => cmHome(svg),
      tap: (x, y, how) => how !== "long" && openMap(c)
    });
  });
}
// Set the card map's view, kept inside the region and never closer than 40 times in; the markers keep their size on
// screen, and the place's dot goes once the place itself is 20px across.
function cmSet(svg, vb) {
  const st = svg._cm,
    H = st.bounds,
    asp = st.box.clientWidth / Math.max(1, st.box.clientHeight);
  const cx = vb[0] + vb[2] / 2,
    cy = vb[1] + vb[3] / 2,
    w = Math.min(H[2], Math.max(H[2] / 40, vb[2])),
    h = w / asp;
  const x = Math.min(H[0] + H[2] - w, Math.max(H[0], cx - w / 2)),
    y = Math.min(H[1] + H[3] - h, Math.max(H[1], cy - h / 2));
  st.vb = [x, y, w, h];
  svg.setAttribute("viewBox", `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  const u = w / Math.max(1, st.box.clientWidth),
    b = st.M.box[st.c],
    big = Math.hypot(b[2] - b[0], (b[3] - b[1]) * st.sy) / u > 20;
  svg.querySelectorAll("circle").forEach(k => {
    const l = k.classList,
      cap = l.contains("cap");
    k.style.display = big && !cap ? "none" : "";
    k.setAttribute("r", ((cap ? 3.5 : l.contains("ring") ? 10 : 4.5) * u).toFixed(3));
  });
}
// Back on the place: its centre at the current zoom, eased over a quarter of a second.
function cmHome(svg) {
  const st = svg._cm,
    v0 = st.vb.slice(),
    hm = st.home,
    t0 = performance.now();
  const to = [hm[0] + hm[2] / 2 - v0[2] / 2, hm[1] + hm[3] / 2 - v0[3] / 2, v0[2], v0[3]];
  cancelAnimationFrame(st.anim);
  const step = t => {
    const p = Math.min(1, (t - t0) / 250),
      e = 1 - Math.pow(1 - p, 3);
    cmSet(
      svg,
      v0.map((a, i) => a + (to[i] - a) * e)
    );
    if (p < 1) st.anim = requestAnimationFrame(step);
  };
  st.anim = requestAnimationFrame(step);
}
function cmZoom(btn, f) {
  const svg = btn.closest(".cmap").querySelector("svg.map");
  if (!svg || !svg._cm) return;
  const st = svg._cm;
  cancelAnimationFrame(st.anim);
  cmSet(svg, zoomAt(st.box, st.vb, f));
  cmHome(svg);
}
// A new window size needs the map sized again; the view is kept.
addEventListener("resize", () => {
  if (S.view === "quiz" && S.dir === "map" && !LB) render();
});
// The page itself must not zoom on a double tap during a round (iOS does, whatever touch-action says). The second quick
// touch's default is cancelled anywhere on the quiz screen except on controls, which need their clicks. It listens on
// the document, once, so it survives the redraw a tap can cause: the tap that answers redraws the map, and a guard on
// the old map's box missed the touch that followed.
let qmLastTouch = 0;
document.addEventListener(
  "touchend",
  e => {
    if (S.view !== "quiz" || LB) return;
    const now = Date.now(),
      quick = now - qmLastTouch < 400;
    qmLastTouch = now;
    if (quick && !e.target.closest("button, input, a, select, label")) e.preventDefault();
  },
  {passive: false}
);
document.addEventListener("dblclick", e => {
  if (S.view === "quiz" && !LB) e.preventDefault();
});
