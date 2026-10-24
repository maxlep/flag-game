// js/ui/parts/entry.js: A study entry, shared by the study list and the map's list.
// Needs before it at load time: nothing.

function studyVar(btn, i) {
  const en = btn.closest(".entry");
  en.dataset.v = i;
  showVariant(en.dataset.c, i);
}
// A meter: MASTER segments, one per point, after an icon that says which: a flag's (a flag, blue), full when the flag is
// learned, or a place's (a pin, purple; cls "place", filled by rounds with no flag on screen), full when it is located.
// The same icons go before "learned" and "located" (doneTag).
const MICON = {
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4m0 0c4-2.5 7 2.5 14 0v10c-7 2.5-10-2.5-14 0"/></svg>`,
  place: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>`
};
const doneTag = place =>
  `<span class="pill ok${place ? " place" : ""}"><span class="mi" aria-hidden="true">${MICON[place ? "place" : "flag"]}</span>${place ? "located" : "learned"}</span>`;
// s is where a meter stands now; from, where it stood before an answer, marks the segments that answer filled (new) or emptied (lost). The meter shows 0 to
// MASTER; the reserve kept beyond full, and the debt below empty, aren't drawn.
function meter(s, from, cls = "") {
  const at = x => Math.max(0, Math.min(MASTER, x || 0)),
    a = at(s),
    b = from === undefined ? a : at(from);
  let segs = "";
  for (let i = 0; i < MASTER; i++)
    segs += `<i class="${i < a ? (i >= b ? "on new" : "on") : i < b ? "lost" : ""}"></i>`;
  const place = /\bplace\b/.test(cls);
  return `<span class="meter${cls ? " " + cls : ""}" role="img" aria-label="${a} of ${MASTER} toward ${place ? "located" : "learned"}"><span class="mi" aria-hidden="true">${MICON[place ? "place" : "flag"]}</span>${segs}</span>`;
}
// Where a flag stands: learned, its meter (empty after misses alone), nothing before it has been asked, or not
// quizzed at all.
const studyPill = f =>
  NOQUIZ.has(f.c)
    ? '<span class="pill">not quizzed</span>'
    : mastered(f.c)
      ? doneTag(false)
      : rec(f.c).c + rec(f.c).w > 0
        ? meter(rec(f.c).s)
        : "";
// Where a place stands, under the flag's standing at the entry's top right: located, its meter, or nothing before it
// has been asked.
const placePill = f =>
  isLocated(f.c) ? doneTag(true) : loc(f.c).c + loc(f.c).w > 0 ? meter(loc(f.c).s, undefined, "place") : "";
// One study entry: flag (opens the viewer), design chips, a small map (drawn later, by wireMiniMaps), name, standing,
// capital and description. The explorable map's card is the same entry with no small map; its flag says how to open it.
const scopeLabel = () => SCOPES.find(x => x[0] === SET.scope)[1];
// An entry's flag opens its designs with no Map chip: the entry's own small map is the way to the map.
function studyEntry(f, mixed, o = {}) {
  const fl = o.flagClick || `openFlag('${f.c}',+this.closest('.entry').dataset.v,{noMap:true})`;
  return `<div class="entry" data-c="${f.c}" data-v="0"><div class="fcol"><button class="flink" type="button" onclick="${fl}" title="View large">${img(f.c, "flag sm")}</button>${vchips(f.c, 0, "studyVar(this,%i)")}${o.noMap || !mapHas(f.c) ? "" : `<button type="button" class="mapbtn mini" data-c="${f.c}" onclick="studyMap('${f.c}')" title="See it on the map" aria-label="See ${esc(f.n)} on the map"></button>`}</div><div class="t"><span class="head"><span class="name">${nameLine(f.c, mixed)}</span><span class="meters">${o.pill || studyPill(f)}${mapHas(f.c) ? placePill(f) : ""}</span></span><span class="facts">${facts(f.c)}</span>${VARS(f.c) || NOQUIZ.has(f.c) ? useLine(f.c, 0) : ""}<p>${esc(f.m)}</p></div></div>`;
}
// Whether the region shows beside a name, by the cards' rule: in a round, when it mixes regions; in a study list, when
// the list does (the world list, or a scope with territories); elsewhere, yes.
function whereShown(c) {
  if (!c) return false;
  if (S.view === "quiz" || S.view === "done") return S.qs ? mixedRound() : true;
  if (S.view === "study") return WIDE.includes(S.region) || SET.scope !== "countries";
  return true;
}
