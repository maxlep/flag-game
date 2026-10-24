// js/boot.js: Starting the app: loading what is saved, restoring a round, the first draw.
// Needs before it at load time: every file before it.

// ---------- BOOT ----------
load();
loadSet();
loadB();
function start(data) {
  if (location.search.startsWith("?r=")) history.replaceState(null, "", location.pathname);
  keyboard();
  if (data && data.S) S = data.S;
  else {
    const r = loadRound();
    if (r) {
      S = r;
      S.confirmLeave = false;
      S.timer = null;
      // a Drill round saved right after a correct answer should move on as it would have
      if (S.view === "quiz" && S.pace === "drill") {
        const q = S.qs[S.i];
        if (q.ans && q.ans === q.c) S.timer = setTimeout(next, 400);
      }
    }
  }
  render();
}
if (window.claude?.hot?.snapshot) window.claude.hot.snapshot(() => ({S}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
