// js/core/store.js: Progress (prog), badges as stored (badges), and the saved round: loading and saving each in localStorage.
// Needs before it at load time: nothing.

// Flags of the World: state, quiz logic and views. Data lives in js/data/.
// ---------- STORAGE ----------
const KEY = "flaglore.v1";
let prog = {}; // code -> {c,w}
function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) prog = JSON.parse(s) || {};
  } catch (e) {
    prog = {};
  }
  // migrate records from before scoring by difficulty
  Object.values(prog).forEach(r => {
    if (r.s === undefined) r.s = Math.max(-4, Math.min(8, (r.c - r.w) * 2));
  });
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(prog));
  } catch (e) {}
}
const rec = c => prog[c] || {c: 0, w: 0, s: 0};
const PTS = {easy: 0, medium: 1, hard: 2, expert: 3, master: 4},
  MASTER = 4; // typed Master: one unaided correct answer = learned
const mastered = c => rec(c).s >= MASTER;
const seen = c => {
  const r = rec(c);
  return r.c + r.w > 0;
};

// ---------- BADGES ----------
const BKEY = "flaglore.badges";
let badges = {};
function loadB() {
  try {
    badges = JSON.parse(localStorage.getItem(BKEY)) || {};
  } catch (e) {
    badges = {};
  }
}
function saveB() {
  try {
    localStorage.setItem(BKEY, JSON.stringify(badges));
  } catch (e) {}
}
// ---------- LOCATED ----------
// Rounds with no flag on screen (a name found on the map, a map named) test geography, not flags, so they leave the
// flag's progress alone and are counted here: code -> {c, w}, for the "located" progress planned in docs/map-plan.md.
const LKEY = "flaglore.located";
let located = {};
function loadL() {
  try {
    located = JSON.parse(localStorage.getItem(LKEY)) || {};
  } catch (e) {
    located = {};
  }
}
function saveL() {
  try {
    localStorage.setItem(LKEY, JSON.stringify(located));
  } catch (e) {}
}
// The round in progress (and its results screen) is kept in localStorage so a refresh resumes it.
const RKEY = "flaglore.round";
function saveRound() {
  try {
    if (S.view === "quiz" || S.view === "done") {
      const {timer, ...rest} = S;
      localStorage.setItem(RKEY, JSON.stringify(rest));
    } else localStorage.removeItem(RKEY);
  } catch (e) {}
}
function loadRound() {
  try {
    const s = localStorage.getItem(RKEY);
    if (!s) return null;
    const r = JSON.parse(s);
    if (r && r.mode === "everything") {
      r.mode = "all";
      r.scope = "all";
    }
    if (r && !r.scope) r.scope = r.mode === "region" && !REGIONS.includes(r.arg) ? "all" : "countries";
    if (r && !r.ask) r.ask = r.dir === "flag" ? "name" : "flag"; // saved before Ask with existed
    return r && r.qs && r.qs.length ? r : null;
  } catch (e) {
    return null;
  }
}
