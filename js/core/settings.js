// js/core/settings.js: The saved settings: SET, loading and setting them (setOpt draws the screen again), the difficulty notes.
// Needs before it at load time: nothing (setOpt calls render, in ui/router.js, when it runs).

// ---------- SETTINGS ----------
const SKEY = "flaglore.settings";
// ask: what a question shows (flag, name, map); dir: what you answer with (name, flag, map). Never the same.
let SET = {len: 10, diff: "medium", ask: "flag", dir: "name", pace: "learn", scope: "countries", variant: "national"};
function loadSet() {
  try {
    const s = localStorage.getItem(SKEY);
    if (s) {
      const o = JSON.parse(s);
      SET = Object.assign(SET, o);
      // Saved before Ask with existed: Pick the flag asked with the name, the rest with the flag.
      if (!o.ask) SET.ask = SET.dir === "flag" ? "name" : "flag";
    }
  } catch (e) {}
}
// Ask with or Answer with: setting one to what the other holds moves the other off it.
function setPair(k, v) {
  const other = k === "ask" ? "dir" : "ask";
  if (SET[other] === v) SET[other] = v === "name" ? "flag" : "name";
  setOpt(k, v);
}
const TYPED = d => d === "expert" || d === "master";
function setOpt(k, v) {
  SET[k] = v;
  try {
    localStorage.setItem(SKEY, JSON.stringify(SET));
  } catch (e) {}
  render();
}
// The difficulty notes for rounds with a map in them, without the points, which a round counted as located doesn't
// earn (MAPPTS adds them for the others).
const MAPDIFF = {
  easy: "The map shows the place's region, and a tap answers.",
  medium: "The map shows the place's region. Tap a place, then Check.",
  hard: "The map shows the whole world. Tap a place, then Check.",
  expert: "The map shows the whole world, as on Hard.",
  master: "The whole world with no borders drawn."
};
const ASKMAP = {
  easy: "Options come from anywhere in the world.",
  medium: "Options come from the same region.",
  hard: "Options are the places nearest to it.",
  expert: "No options. Type the name; close spellings and common names count.",
  master: "Type the exact name, with no suggestions or typo help. The map draws no borders."
};
const ASKMAPF = {
  expert: "Find the flag among the nine places nearest to it.",
  master: "Find the flag among the sixteen places nearest to it. The map draws no borders."
};
const MAPPTS = {
  easy: "Earns no points.",
  medium: "+1 point per correct answer.",
  hard: "+2 per correct answer.",
  expert: "+3 per correct answer.",
  master: "+3 per correct answer."
};
const DIFF = {
  easy: "Options come from anywhere in the world. Good for a first pass; earns no points.",
  medium: "Options come from the same region. +1 point per correct answer.",
  hard: "Options are the flags most often confused with this one. +2 per correct answer.",
  expert: "No options. Type the country; close spellings and common names count. +3 per correct answer.",
  master:
    "Type the exact name, with no suggestions or typo help. Common names still count. +4: one correct answer marks the flag learned."
};
