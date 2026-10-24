// js/ui/screens/study.js: The study list.
// Needs before it at load time: nothing.

// From the study list: the wide list's name follows the scope.
function studyScope(v) {
  if (SET.scope === v) return;
  if (WIDE.includes(S.region))
    S.region = {countries: "Whole world", all: "Everything", territories: "All territories"}[v];
  setOpt("scope", v);
}
const WIDE = ["Whole world", "Everything", "All territories"];
// The flags a study list shows, in name order: a region's, or the whole scope's for the wide card.
const studyList = r =>
  (WIDE.includes(r) ? SCOPED(true) : regionFlags(r, true)).slice().sort((a, b) => a.n.localeCompare(b.n));
function viewStudy() {
  const r = S.region;
  const wide = WIDE.includes(r);
  const list = studyList(r);
  const G = groupList(list, wide);
  const index = list.length ? `<div class="alpha" id="alpha">${groupIndex(G)}</div>` : "";
  const mixed = wide || SET.scope !== "countries";
  const body = G.groups.map(g => groupHead(g, G.mode) + g.items.map(f => studyEntry(f, mixed)).join("")).join("");
  const mode = wide ? "all" : "region",
    arg = mode === "region" ? r : null;
  const mapb = exploreOf(
    wide ? "World" : r,
    regionAll(r).map(f => f.c)
  )
    ? `<button type="button" class="mapopen" onclick="openExplore(S.region,null,studyTop())" title="Study on the map">${MAPICON}Map</button>`
    : "";
  return `${shell({title: wide ? scopeName() : r, stat: list.length + " flags", extra: mapb, below: `<div class="pills">${scopeChips("studyscope", "studyScope")}${sortChips("studysort", "setSort", wide)}</div>`})}${index}
  <div class="study${index ? " indexed" : ""}">${body}</div>
  ${list.length ? `<button class="btn" onclick="openSetup('${mode}',${arg ? `'${arg}'` : "null"},'${wide ? scopeName() : r}')">Quiz me on ${esc(wide ? scopeName() : r)}</button>` : '<p class="muted small">No flags in this region for the current scope.</p>'}`;
}
// The study list's small maps are drawn as they scroll into view; drawing all of them at once would be heavy.
function wireMiniMaps() {
  const boxes = [...app.querySelectorAll(".mapbtn.mini")];
  if (!boxes.length) return;
  const draw = b => {
    if (!b.dataset.c) return;
    b.innerHTML = mapSVG({code: b.dataset.c, cls: "sm", fit: 1.4, pad: 0});
    delete b.dataset.c;
  };
  if (!("IntersectionObserver" in window)) {
    boxes.forEach(draw);
    return;
  }
  const io = new IntersectionObserver(
    es =>
      es.forEach(x => {
        if (x.isIntersecting) {
          draw(x.target);
          io.unobserve(x.target);
        }
      }),
    {rootMargin: "300px 0px"}
  );
  boxes.forEach(b => io.observe(b));
}
// A study entry's small map opens the region's map, the same one the Map button opens, with that place selected.
function studyMap(c) {
  openExplore(S.view === "study" ? S.region : geoOf(BY[c]), null, c, c);
}
