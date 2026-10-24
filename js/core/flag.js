// js/core/flag.js: Facts about one flag, as data: its designs, its Wikipedia links, its region label, its years.
// Needs before it at load time: nothing.

// Wikipedia article names where they differ from the display name; THE marks "Flag of the …".
function links(c) {
  const name = (WIKI[c] || BY[c].n).replace(/ /g, "_");
  const flag = "https://en.wikipedia.org/wiki/" + (FLAGWIKI[c] || "Flag_of_" + (THE.has(c) ? "the_" : "") + name);
  const country = "https://en.wikipedia.org/wiki/" + name;
  const capName = BY[c].cap.split(" (")[0],
    cap = "https://en.wikipedia.org/wiki/" + encodeURIComponent((CAPWIKI[c] || capName).replace(/ /g, "_"));
  return {flag, country, cap, sameCap: capName === BY[c].n};
}
// The region, shown beside the name where the set mixes regions or territories.
function whereOf(c) {
  const f = BY[c];
  return f.sov ? f.r : geoOf(f) + ", territory";
}
// "Flag adopted 1994", or, where the same design is older (ORIGIN), both years with what each was:
// "Flag 1889 (21 stars), 1992 (27 stars)".
function flagYears(c) {
  const y = typeof ADOPTED === "object" && ADOPTED[c],
    o = typeof ORIGIN === "object" && ORIGIN[c];
  if (!y) return "Flag";
  if (!o) return "Flag adopted " + y;
  const [oy, t, n] = o;
  const nw = x => `<span class="nw">${esc(x)}</span>`;
  // each year with its label stays on one line; the line breaks between them
  return `Flag ${nw(oy + (t ? ` (${t})` : "") + ",")} ${nw(y + (n ? ` (${n})` : ""))}`;
} // the comma stays with its year when the line breaks
// Variants: VARIANTS[c] lists a flag's official designs for use on land (civil, state, reverse). Entry 0 is the
// artwork at flags-true/<c>.svg, the rest at flags-true/<c>-<k>.svg. Most flags have one design and no entry.
const VARS = c => (typeof VARIANTS === "object" && VARIANTS[c]) || null;
const useLabel = (c, vi = 0) => {
  const v = VARS(c);
  if (v) return v[vi].l;
  return (typeof USE === "object" && USE[c]) || (BY[c].sov ? "National flag" : "Flag");
};
// Which variant a round shows: the setting names a kind; a flag without that kind shows its main design.
function variantIdx(c, how) {
  const v = VARS(c);
  if (!v) return 0;
  if (how === "random") return Math.floor(Math.random() * v.length);
  const i = v.findIndex(x => x.k === how);
  return i < 0 ? 0 : i;
}
