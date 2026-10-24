// js/core/round.js: The round: S (what is on screen and the round in progress), building a round, answering, moving on.
// Needs before it at load time: nothing.

// A round's cards show the region only when its flags come from more than one (a Europe round doesn't need it).
function mixedRound() {
  return new Set(S.qs.map(q => whereOf(q.c))).size > 1;
}

// ---------- STATE ----------
let S = {view: "home"};
function poolFor(mode, arg, flt) {
  if (mode === "region") return regionFlags(arg).map(f => f.c);
  if (mode === "all") return SCOPED().map(f => f.c);
  if (mode === "weak")
    return SCOPED()
      .map(f => f.c)
      .filter(c => rec(c).w > 0 && !mastered(c));
  if (mode === "group") return GROUPS[arg].f.filter(c => inScope(BY[c]) && inFilter(c, flt));
  if (mode === "lookmix") return [...new Set(GROUPS.flatMap(g => g.f))].filter(c => inScope(BY[c]) && inFilter(c, flt));
  return [];
}
function pickOrder(pool, n) {
  // unseen first, then weakest, then random; take n
  const w = pool.map(c => {
    const r = rec(c);
    let s = Math.random();
    if (!seen(c)) s += 3;
    else s += Math.max(0, r.w * 1.5 - r.c);
    if (mastered(c)) s -= 1;
    return [s, c];
  });
  w.sort((a, b) => b[0] - a[0]);
  return w.slice(0, n).map(x => x[1]);
}
// Pick-the-flag grows the grid instead of removing options: 4 flags up to Hard, 9 on Expert, 16 on Master.
const optCount = (diff, dir) =>
  dir === "flag" && diff === "master" ? 16 : dir === "flag" && diff === "expert" ? 9 : 4;
function distractors(c, diff, mode, n = 3) {
  const f = BY[c];
  const out = new Set();
  const add = list =>
    list.forEach(x => {
      if (out.size < n) out.add(x);
    });
  const groups = GROUP_OF[c] || [];
  const gm = shuffle(groups.flatMap(i => GROUPS[i].f).filter(x => x !== c));
  const same = shuffle(QUIZ.filter(x => geoOf(x) === geoOf(f) && x.c !== c).map(x => x.c));
  const any = shuffle(QUIZ.map(x => x.c).filter(x => x !== c));
  if (mode === "group" || mode === "lookmix" || diff === "hard" || TYPED(diff)) {
    add(gm);
    add(same);
  } else if (diff === "medium") {
    add(same);
  }
  add(any);
  return [...out];
}
function startRound(mode, arg, label, flt = null) {
  const pool = poolFor(mode, arg, flt);
  if (!pool.length) return;
  const from = S.view === "quiz" || S.view === "done" || S.view === "setup" ? S.from : here();
  const diff = SET.diff;
  let order, full;
  const grp = mode === "group" || mode === "lookmix";
  if (mode === "group") {
    full = SET.len === "all";
    const n = SET.len === "all" ? pool.length * 2 : SET.len;
    order = [];
    while (order.length < n) {
      let sh = shuffle(pool);
      if (pool.length > 1 && order.length && sh[0] === order[order.length - 1]) sh.push(sh.shift());
      order.push(...sh);
    }
    order = order.slice(0, n);
  } else {
    const n = SET.len === "all" ? pool.length : Math.min(SET.len, pool.length);
    full = n === pool.length;
    order = pickOrder(pool, n);
  }
  const nOpt = optCount(diff, SET.dir);
  const qs = order.map(c => {
    const opts = shuffle([c, ...distractors(c, diff, mode, nOpt - 1)]);
    return {
      c,
      opts,
      v: variantIdx(c, SET.variant),
      ov: opts.map(o => variantIdx(o, SET.variant)),
      ans: null,
      typed: ""
    };
  });
  S = {
    view: "quiz",
    mode,
    arg,
    label,
    flt,
    scope: SET.scope,
    qs,
    i: 0,
    streak: 0,
    best: 0,
    diff: grp && !TYPED(diff) ? "hard" : diff,
    dir: SET.dir,
    nOpt,
    pace: SET.pace,
    variant: SET.variant,
    from,
    full
  };
  saveRound();
  render();
  window.scrollTo(0, 0);
}
function submitTyped() {
  const inp = $("#typeIn");
  if (!inp) return;
  if (S.qs[S.i].ans) {
    next();
    return;
  }
  const text = inp.value.trim();
  if (!text) return;
  // Expert: if what you typed still fits several names, Check takes the first suggestion, as shown in the row.
  let k = S.diff === "master" ? matchStrict(text) : matchTyped(text);
  if (!k && S.diff !== "master") {
    const sg = suggest(text);
    if (sg.length) k = sg[0];
  }
  const q = S.qs[S.i];
  q.typed = text;
  answer(k || "__wrong__");
}
function typeInput(v) {
  const q = S.qs[S.i];
  q.typed = v;
  const box = $("#sugg");
  if (!box) return;
  box.innerHTML = suggest(v)
    .map(
      c =>
        `<button type="button" onmousedown="event.preventDefault()" onclick="if(this.dataset.done)return;this.dataset.done=1;pickSugg('${c}')">${esc(BY[c].n)}</button>`
    )
    .join("");
}
function pickSugg(c) {
  const inp = $("#typeIn");
  if (inp) inp.value = BY[c].n;
  submitTyped();
}
function answer(k) {
  const q = S.qs[S.i];
  if (q.ans) return;
  q.ans = k;
  const ok = k === q.c;
  S.confirmLeave = false; // carrying on answers the "leave this round?" question
  const r = rec(q.c);
  const pts = S.diff === "master" && S.dir === "flag" ? 3 : PTS[S.diff] || 0;
  if (ok) {
    r.c++;
    r.s = Math.min(8, (r.s || 0) + pts);
    q.pts = pts;
  } else {
    r.w++;
    r.s = Math.max(-4, (r.s || 0) - 2);
    q.pts = -2;
  }
  q.nowMastered = ok && r.s >= MASTER && r.s - pts < MASTER;
  prog[q.c] = r;
  save();
  S.streak = ok ? S.streak + 1 : 0;
  S.best = Math.max(S.best, S.streak);
  saveRound();
  render();
  if (S.pace === "drill" && ok) {
    clearTimeout(S.timer);
    S.timer = setTimeout(next, 650);
    return;
  }
  // A card is about to be read: on a phone the keyboard gives the room back. Next (a tap) brings it up again.
  if (document.body.classList.contains("kb")) {
    const t = $("#typeIn");
    if (t && document.activeElement === t) {
      S.kbOff = true;
      t.blur();
    }
  } // stays off until Next
  requestAnimationFrame(() => {
    const mid = $("#qmid"),
      card = mid && mid.querySelector(".card.lore");
    if (!card) return;
    // The whole card if it fits under the flag, otherwise its top.
    card.scrollIntoView({block: card.offsetHeight < mid.clientHeight * 0.6 ? "end" : "start", behavior: "smooth"});
  });
}
function next() {
  clearTimeout(S.timer);
  S.timer = null;
  S.confirmLeave = false;
  S.kbOff = false;
  if (S.i + 1 < S.qs.length) {
    S.i++;
    saveRound();
    render();
    window.scrollTo(0, 0);
    wake();
  } else {
    S.earned = checkBadges();
    S.view = "done";
    saveRound();
    render();
    window.scrollTo(0, 0);
  }
}
function showLore() {
  const q = S.qs[S.i];
  q.lore = true;
  render();
}
// A phone can hide its keyboard while the box keeps focus; a blur and focus during the tap brings it back.
function wake() {
  const t = $("#typeIn");
  if (t && document.activeElement === t && !document.body.classList.contains("kb")) {
    t.blur();
    t.focus({preventScroll: true});
  }
}
function setQVar(i) {
  const q = S.qs[S.i];
  q.v = i;
  saveRound();
  showVariant(q.c, i);
}
