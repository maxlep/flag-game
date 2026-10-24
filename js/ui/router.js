// js/ui/router.js: Which screen shows: going to a screen and back, drawing it (render), the keys, the edge swipe.
// Needs before it at load time: nothing.

const here = () => ({view: S.view, region: S.region, pick: S.pick, flt: S.flt, scroll: window.scrollY});
// Leaving mid-round asks first; a second Esc or the Leave button confirms.
function goBack() {
  if (S.view === "quiz" && S.qs.some(q => q.ans) && !S.confirmLeave) {
    S.confirmLeave = true;
    render();
    return;
  }
  clearTimeout(S.timer);
  const f = S.from || {view: "home"};
  S = {view: f.view, region: f.region, pick: f.pick, flt: f.flt};
  saveRound();
  render();
  window.scrollTo(0, f.scroll || 0);
}
function stayInRound() {
  S.confirmLeave = false;
  render();
}
let HOME_Y = 0;
function goHome() {
  clearTimeout(S.timer);
  S = {view: "home"};
  saveRound();
  render();
  window.scrollTo(0, HOME_Y);
}
function leaveHome() {
  if (S.view === "home") HOME_Y = window.scrollY;
}
function openSetup(mode, arg, label, flt = null) {
  leaveHome();
  const from = here();
  S = {view: "setup", pick: {mode, arg, label: flt ? label + " · " + filterLabel(flt) : label, flt}, from};
  render();
  window.scrollTo(0, 0);
}
function openStudy(r) {
  leaveHome();
  const from = here();
  S = {view: "study", region: r, from};
  render();
  window.scrollTo(0, 0);
}
function openLook(flt = null) {
  leaveHome();
  const from = here();
  S = {view: "look", from, flt};
  render();
  window.scrollTo(0, 0);
}
function openBadges() {
  leaveHome();
  const from = here();
  S = {view: "badges", from};
  render();
  window.scrollTo(0, 0);
}
// Keyboard: A-D or 1-4 pick an option, Enter moves on.
document.addEventListener("keydown", e => {
  if (LB) {
    if (e.key === "Escape") closeFlag();
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") lbStep(e.key === "ArrowRight" ? 1 : -1);
    else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && LB.what === "explore" && e.target.tagName !== "SELECT") {
      e.preventDefault();
      exArrow(e.key === "ArrowDown" ? 1 : -1);
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Tab" && S.view === "quiz") {
    e.preventDefault();
    const inp = $("#typeIn");
    if (inp && document.activeElement !== inp) inp.focus();
    return;
  }
  const t = e.target.tagName;
  if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA" || t === "BUTTON") return;
  if (S.view === "setup") {
    if (e.key === "Enter" && $("#startBtn")) {
      e.preventDefault();
      startRound(S.pick.mode, S.pick.arg, S.pick.label, S.pick.flt);
    } else if (e.key === "Escape") goBack();
    return;
  }
  if (S.view === "study" || S.view === "look" || S.view === "badges") {
    if (e.key === "Escape") goBack();
    return;
  }
  if (S.view !== "quiz") return;
  const q = S.qs[S.i];
  if (e.key === "Escape") {
    goBack();
    return;
  }
  if (e.key === "Enter") {
    if (q.ans) {
      e.preventDefault();
      next();
    } else if (S.dir === "map" && q.sel) {
      e.preventDefault();
      qmCheck();
    }
    return;
  }
  if (q.ans || S.dir === "map") return;
  const k = e.key.toLowerCase();
  let i = -1;
  if (k >= "a" && k <= "p") i = k.charCodeAt(0) - 97;
  else if (k >= "1" && k <= "9") i = +k - 1;
  if (i >= 0 && q.opts && q.opts[i]) {
    e.preventDefault();
    answer(q.opts[i]);
  }
});
// Rebuild the screen around one element that must survive (the focused answer box): walk up from it, and at each
// level keep the old ancestor, copy the new one's attributes onto it, and swap all its other children for the new ones.
function patchAround(oldLeaf, newLeaf) {
  let o = oldLeaf,
    n = newLeaf;
  while (o !== app) {
    const op = o.parentNode,
      np = n.parentNode,
      top = op === app;
    if (!top) {
      [...op.attributes].forEach(a => {
        if (!np.hasAttribute(a.name)) op.removeAttribute(a.name);
      });
      [...np.attributes].forEach(a => op.setAttribute(a.name, a.value));
    }
    [...op.childNodes].forEach(c => {
      if (c !== o) c.remove();
    });
    const kids = [...np.childNodes],
      i = kids.indexOf(n);
    kids.slice(0, i).forEach(k => op.insertBefore(k, o));
    kids.slice(i + 1).forEach(k => op.appendChild(k));
    o = op;
    n = np;
  }
}
function render() {
  requestAnimationFrame(shade);
  document.body.classList.toggle("quiz", S.view === "quiz");
  if (S.view === "quiz") {
    window.scrollTo(0, 0);
    keyboard();
    requestAnimationFrame(fitFlag);
  } // the screen's height must be right before it is drawn
  if (S.view === "quiz") {
    // The middle band keeps its scroll position when the same question is drawn again (the leave prompt, a design
    // switch), so the reader doesn't jump back to the flag.
    const mid0 = $("#qmid"),
      keep = mid0 && +mid0.dataset.i === S.i && mid0.scrollTop > 0 ? mid0.scrollTop : 0;
    if (LB && LB.from) closeFlag(); // a flag opened from this screen closes before it is redrawn
    renderQuiz();
    if (keep) {
      const m = $("#qmid");
      if (m) m.scrollTop = keep;
    }
    return;
  }
  if (S.view === "done") return (app.innerHTML = viewDone());
  if (S.view === "setup") return (app.innerHTML = viewSetup());
  if (S.view === "study") {
    app.innerHTML = viewStudy();
    wireAlpha();
    wireMiniMaps();
    stickyHeight();
    return;
  }
  if (S.view === "look") return (app.innerHTML = viewLook());
  if (S.view === "badges") return (app.innerHTML = viewBadges());
  app.innerHTML = viewHome();
  checkVersion();
}
function renderQuiz() {
  const old = document.activeElement,
    oldForm = old && old.id === "typeIn" && app.contains(old) ? old.closest("form.typebox") : null;
  const html = viewQuiz();
  if (!oldForm) {
    app.innerHTML = html;
    const t = $("#typeIn");
    if (t && !S.kbOff) t.focus({preventScroll: true});
    wireZoom();
    wireQuizMap();
    return;
  }
  // A focused answer box is never replaced: phones close the keyboard, or scroll, when focus moves. The box is
  // patched in place (read-only, placeholder, value) and everything around it is swapped for the new screen.
  const tmp = document.createElement("template");
  tmp.innerHTML = html;
  const newForm = tmp.content.querySelector("form.typebox");
  if (!newForm) {
    app.innerHTML = html;
    return;
  }
  const ni = newForm.querySelector("#typeIn");
  for (const a of ["readonly", "placeholder", "enterkeyhint"]) {
    if (ni.hasAttribute(a)) old.setAttribute(a, ni.getAttribute(a));
    else old.removeAttribute(a);
  }
  if (old.value !== ni.value) old.value = ni.value;
  patchAround(old, ni);
  wireZoom();
}

// Swipe in from the left edge = back. Matters in the home-screen app, which has no browser chrome.
(() => {
  let sx = null,
    sy = null,
    fired = false;
  document.addEventListener(
    "touchstart",
    e => {
      const t = e.touches[0];
      if (e.touches.length === 1 && t.clientX <= 24) {
        sx = t.clientX;
        sy = t.clientY;
        fired = false;
      } else sx = null;
    },
    {passive: true}
  );
  document.addEventListener(
    "touchmove",
    e => {
      if (sx === null || fired) return;
      const t = e.touches[0],
        dx = t.clientX - sx,
        dy = Math.abs(t.clientY - sy);
      if (dx > 70 && dy < 60) {
        fired = true;
        if (LB) closeFlag();
        else if (S.view !== "home") goBack();
      } else if (dy > 60) sx = null;
    },
    {passive: true}
  );
  document.addEventListener(
    "touchend",
    () => {
      sx = null;
    },
    {passive: true}
  );
})();
