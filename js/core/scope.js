// js/core/scope.js: Regions and scope: which region a flag is in, which flags a scope and a region hold.
// Needs before it at load time: the data files (FLAGS, NOQUIZ, REGIONS, GEO).

// Look-alike filter: a region name or null for all regions. The scope setting applies on top.
// Scope (Countries / All / Territories) is one saved setting that filters every list and round. geoOf places every flag in a region.
const geoOf = f => (f.sov ? f.r : GEO[f.c]);
const inScope = f => SET.scope === "all" || (SET.scope === "countries" ? f.sov : !f.sov);
// Pools leave out study-only flags (NOQUIZ); study lists ask for them with all=true.
const QUIZ = FLAGS.filter(f => !NOQUIZ.has(f.c));
const SCOPED = all => (all ? FLAGS : QUIZ).filter(inScope);
const ALLREGIONS = [...REGIONS, "Antarctic", "Organisations"];
const regionFlags = (r, all) => SCOPED(all).filter(f => geoOf(f) === r);
const scopeName = () =>
  SET.scope === "countries" ? "Whole world" : SET.scope === "all" ? "Everything" : "All territories";
const inFilter = (c, flt) => !flt || geoOf(BY[c]) === flt;
const filterLabel = flt => (!flt ? "" : flt === "countries" ? "Countries" : flt);
const SCOPES = [
  ["countries", "Countries"],
  ["territories", "Territories"],
  ["all", "All"]
];
// Every flag of the region is drawn and can be tapped, whatever the scope; the scope (set from the bar at the top)
// only decides which are drawn plainly and which hatched. So the frame doesn't change with it.
const regionAll = r => (WIDE.includes(r) ? FLAGS : FLAGS.filter(f => geoOf(f) === r));
