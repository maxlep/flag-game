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
// The difficulty note on the setup screen is two lines: what a right answer fills of a flag's meter, the same for every
// kind of round (scoreGain, drawn by gainLine), then what the difficulty changes for this kind of round (DIFF, PICK,
// MAPDIFF, ASKMAP, ASKMAPF, none of which mention it).
// Each option list is described the same way: how many, and where they come from.
const MAPDIFF = {
  easy: "Only its area can be tapped.",
  medium: "",
  hard: "Small places have no dot until you zoom in close.",
  expert: "No borders are drawn. Small places keep their dots.",
  master: "No borders, and small places have no dot until you zoom in close."
};
// Asked with the map, answered with the name.
const ASKMAP = {
  easy: "4 names from anywhere.",
  medium: "4 names from its region.",
  hard: "4 names from the places nearest to it.",
  expert: "No options. Type the name; close spellings and common names count.",
  master: "Type the exact name, with no suggestions or typo help. The map draws no borders."
};
// Asked with the map, answered with the flag.
const ASKMAPF = {
  easy: "4 flags from anywhere.",
  medium: "4 flags from its region.",
  hard: "4 flags from the places nearest to it.",
  expert: "9 flags from the places nearest to it.",
  master: "16 flags from the places nearest to it. The map draws no borders."
};
// Asked with the flag, answered with the name.
const DIFF = {
  easy: "4 names from anywhere.",
  medium: "4 names from its region.",
  hard: "4 names from its look-alikes and region.",
  expert: "No options. Type the name; close spellings and common names count.",
  master: "Type the exact name, with no suggestions or typo help. Common names still count."
};
// Asked with the name, answered with the flag: the grid grows instead of asking you to type.
const PICK = {
  easy: "4 flags from anywhere.",
  medium: "4 flags from its region.",
  hard: "4 flags from its look-alikes and region.",
  expert: "9 flags from its look-alikes and region.",
  master: "16 flags from its look-alikes and region."
};
// What a right answer adds to the meter at difficulty d, as answer() scores it: the flag's meter, or the place's for a
// round with no flag on screen.
function scoreGain(d, ask, dir) {
  return d === "master" && dir === "flag" ? 3 : PTS[d] || 0;
}
// Which meters a round fills: the flag's when a flag is on screen (asked or picked), the place's when the map is
// (asked or answered on). Flag and map together fill both.
const roundMeters = (ask, dir) => ({flag: ask === "flag" || dir === "flag", place: ask === "map" || dir === "map"});
