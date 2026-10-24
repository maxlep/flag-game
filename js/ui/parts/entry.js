// js/ui/parts/entry.js: A study entry, shared by the study list and the map's list.
// Needs before it at load time: nothing.

function studyVar(btn, i) {
  const en = btn.closest(".entry");
  en.dataset.v = i;
  showVariant(en.dataset.c, i);
}
// Where a flag stands: learned, points so far, missed, or not quizzed at all.
const studyPill = f =>
  NOQUIZ.has(f.c)
    ? '<span class="pill">not quizzed</span>'
    : mastered(f.c)
      ? '<span class="pill ok">learned</span>'
      : rec(f.c).s > 0
        ? '<span class="pill">' + rec(f.c).s + " / " + MASTER + "</span>"
        : rec(f.c).w > 0
          ? '<span class="pill bad">missed ' + rec(f.c).w + "</span>"
          : "";
// One study entry: flag (opens the viewer), design chips, a small map (drawn later, by wireMiniMaps), name, standing,
// capital and description. The explorable map's card is the same entry with no small map; its flag says how to open it.
const scopeLabel = () => SCOPES.find(x => x[0] === SET.scope)[1];
// An entry's flag opens its designs with no Map chip: the entry's own small map is the way to the map.
function studyEntry(f, mixed, o = {}) {
  const fl = o.flagClick || `openFlag('${f.c}',+this.closest('.entry').dataset.v,{noMap:true})`;
  return `<div class="entry" data-c="${f.c}" data-v="0"><div class="fcol"><button class="flink" type="button" onclick="${fl}" title="View large">${img(f.c, "flag sm")}</button>${vchips(f.c, 0, "studyVar(this,%i)")}${o.noMap || !mapHas(f.c) ? "" : `<button type="button" class="mapbtn mini" data-c="${f.c}" onclick="studyMap('${f.c}')" title="See it on the map" aria-label="See ${esc(f.n)} on the map"></button>`}</div><div class="t"><span class="head"><span class="name">${nameLine(f.c, mixed)}</span>${o.pill || studyPill(f)}</span><span class="facts">${facts(f.c)}</span>${VARS(f.c) || NOQUIZ.has(f.c) ? useLine(f.c, 0) : ""}<p>${esc(f.m)}</p></div></div>`;
}
// Whether the region shows beside a name, by the cards' rule: in a round, when it mixes regions; in a study list, when
// the list does (the world list, or a scope with territories); elsewhere, yes.
function whereShown(c) {
  if (!c) return false;
  if (S.view === "quiz" || S.view === "done") return S.qs ? mixedRound() : true;
  if (S.view === "study") return WIDE.includes(S.region) || SET.scope !== "countries";
  return true;
}
