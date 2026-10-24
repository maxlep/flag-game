// js/ui/screens/look.js: The look-alikes page.
// Needs before it at load time: nothing.

function viewLook() {
  const flt = S.flt || null;
  const order = [
    "Horizontal stripes",
    "Vertical stripes",
    "Cantons & crosses",
    "Discs & stars",
    "Triangles & serrations"
  ];
  const sorted = GROUPS.map((g, i) => ({g, i, r: g.k, f: g.f.filter(c => inScope(BY[c]) && inFilter(c, flt))}))
    .filter(x => x.f.length >= 2)
    .sort((a, b) => order.indexOf(a.r) - order.indexOf(b.r) || a.g.t.localeCompare(b.g.t));
  let lastR = "";
  const body = sorted
    .map(
      ({g, i, r, f}) =>
        (r !== lastR ? `<p class="eyebrow" style="padding-top:6px">${esc((lastR = r))}</p>` : "") +
        `<div class="group"><h3>${esc(g.t)}</h3><div class="flags">${f.map(c => `<figure><button class="flink" type="button" onclick="openFlag('${c}')" title="View large">${img(c, "flag sm")}</button><figcaption>${esc(BY[c].n)}</figcaption></figure>`).join("")}</div><p class="hint">${esc(g.h)}</p><button class="btn line" onclick="openSetup('group',${i},GROUPS[${i}].t,S.flt||null)">Quiz me on this set</button></div>`
    )
    .join("");
  const opt = (v, l) => `<option value="${v}" ${(flt || "") === v ? "selected" : ""}>${l}</option>`;
  const sel = `<select id="lookSel" onchange="S.flt=this.value||null;render();window.scrollTo(0,0)">${opt("", "All regions")}${ALLREGIONS.map(r => opt(r, r)).join("")}</select>`;
  return `${shell({title: "Look-alikes", stat: sorted.length + " sets", extra: sel})}
  ${scopeSeg()}
  <div class="study">${body || '<p class="muted small">No look-alike sets have two or more flags in this filter.</p>'}</div>
  ${sorted.length ? `<button class="btn" onclick="openSetup('lookmix',null,'Look-alikes',S.flt||null)">Mixed round across ${flt ? "these" : "all"} sets</button>` : ""}`;
}
