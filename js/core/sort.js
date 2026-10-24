// js/core/sort.js: Sorting and grouping a list: A–Z, by region, by area.
// Needs before it at load time: the data files (AREAS).

// The study list and the map's list share one saved sort (SET.sort): A–Z (the default), by Region (the world lists
// only), or by Area, the UN sub-regions in AREAS. A region's list offered Region shows Area instead. Groups come in
// their geographic order, places A–Z within them, under a header that stays pinned while its group scrolls by.
const AREA_OF = {},
  AREA_IDX = {};
Object.keys(AREAS).forEach((a, i) => {
  AREA_IDX[a] = i;
  AREAS[a].forEach(c => {
    AREA_OF[c] = a;
  });
});
const letterOf = f =>
  f.n
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")[0]
    .toUpperCase();
const sortModes = wide =>
  wide
    ? [
        ["az", "A–Z"],
        ["region", "Region"],
        ["area", "Area"]
      ]
    : [
        ["az", "A–Z"],
        ["area", "Area"]
      ];
const sortMode = wide => {
  const s = SET.sort || "az";
  return !wide && s === "region" ? "area" : s;
};
// A name-ordered list, grouped for display: [{key, label, items}].
function groupList(list, wide) {
  const m = sortMode(wide);
  const key = m === "az" ? letterOf : m === "region" ? f => geoOf(f) : f => AREA_OF[f.c] || "Other";
  const rank =
    m === "az" ? () => 0 : m === "region" ? f => ALLREGIONS.indexOf(geoOf(f)) : f => AREA_IDX[AREA_OF[f.c]] ?? 999;
  const out = [];
  for (const f of list.slice().sort((a, b) => rank(a) - rank(b) || a.n.localeCompare(b.n))) {
    const k = key(f);
    if (!out.length || out[out.length - 1].key !== k) out.push({key: k, label: k, items: []});
    out[out.length - 1].items.push(f);
  }
  return {mode: m, groups: out};
}
function setSort(v) {
  if (SET.sort === v) return;
  setOpt("sort", v);
}
