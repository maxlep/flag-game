// js/ui/parts/flag.js: Drawing a flag and its facts: the image with its designs, the design chips, the name and capital lines, the card's flag.
// Needs before it at load time: nothing.

// Country name as a quiet link; capital line carries the capital and flag-article links.
function nameLink(c) {
  return wl(links(c).country, esc(BY[c].n));
}
function nameLine(c, showRegion = true) {
  return nameLink(c) + (showRegion ? `<span class="where">${esc(whereOf(c))}</span>` : "");
}
// Under the name: the capital on one line, the flag's years on the next, each its own link.
function facts(c) {
  const L = links(c),
    f = BY[c],
    plain = L.sameCap || f.cap === "None",
    cap = f.cap === "None" ? "No capital" : f.cap;
  return `<span class="capital">${plain ? esc(cap) : wl(L.cap, esc(cap))}</span><span class="capital">${wl(L.flag, flagYears(c), "The flag on Wikipedia")}</span>`;
}
// The flag on a card: tap to open it in the viewer.
function cardFlag(c, vi) {
  return `<button type="button" class="flink" onclick="openFlag('${c}',+this.querySelector('.fl:not([hidden])').dataset.v)" title="View large">${img(c, "flag", vi)}</button>`;
}
// Official width:height ratios (TRUER); a variant can carry its own ratio. Flags without true-proportion artwork fall
// back to the 4:3 set. Each flag sits in a 4:3 slot and is sized to roughly equal area, capped by the slot, so a wide
// flag like Qatar reads as wider rather than merely shorter.
// A flag with several designs carries all of them, one visible; switching designs then only toggles a hidden
// attribute, so nothing reloads or flickers.
const img = (c, cls = "flag", vi = 0) => {
  const v = VARS(c) || [null],
    tru = TRUER[c],
    src = tru ? "flags-true" : "flags";
  const one = (ve, i) => {
    const stem = ve && i ? c + "-" + ve.k : c,
      r = (ve && ve.r) || (tru ? TRUER[c] : 4 / 3),
      w = tru ? Math.min(100, 75 * r, 100 * Math.sqrt(0.62 * r)) : 100;
    return `<div class="fl${BARE.has(c) || (ve && ve.bare) ? " bare" : ""}" data-v="${i}" style="--r:${r};--w:${w.toFixed(1)}%"${i === vi ? "" : " hidden"}><img src="${src}/${stem}.svg" alt="Flag of ${BY[c].n}"${i === vi ? ' loading="lazy"' : ""}></div>`;
  };
  return `<div class="${cls}" data-c="${c}">${v.map(one).join("")}</div>`;
};
// Switch every rendered copy of flag c to design i, in place.
// The page, and the explorable map's list and card, which live in the viewer outside it. (Not the viewer's own slides:
// each of those shows one design on purpose.)
function showVariant(c, i) {
  const all = q => [app, $("#exList"), $("#exCard")].filter(Boolean).flatMap(r => [...r.querySelectorAll(q)]);
  all(`.flag[data-c="${c}"] .fl`).forEach(fl => {
    fl.hidden = +fl.dataset.v !== i;
  });
  all(`.vchips[data-c="${c}"]`).forEach(ch => [...ch.children].forEach((b, j) => b.classList.toggle("on", j === i)));
  all(`.vline[data-c="${c}"]`).forEach(p => (p.outerHTML = useLine(c, i)));
}
// One line naming the design on screen (text only), and a separate row of chips to switch designs. Keeping them apart
// means the chips sit in a fixed spot under the flag and never move with the length of the label.
function useLine(c, vi) {
  const v = VARS(c),
    cur = v && v[vi];
  return `<p class="vline" data-c="${c}">${cur ? esc(cur.l) + (cur.d ? " · " + esc(cur.d) : "") : esc(useLabel(c))}</p>`;
}
function vchips(c, vi, onpick, hidden) {
  const v = VARS(c);
  if (!v) return "";
  return `<div class="vchips${hidden ? " hide" : ""}" data-c="${c}">${v.map((x, i) => `<button type="button" class="chipbtn${i === vi ? " on" : ""}" onmousedown="event.preventDefault()" onclick="${onpick.replace("%i", i)}">${esc(x.k[0].toUpperCase() + x.k.slice(1))}</button>`).join("")}</div>`;
}
