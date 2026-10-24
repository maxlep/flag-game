// js/ui/screens/setup.js: The setup screen before a round.
// Needs before it at load time: nothing.

// What a round asks and how it is answered, for the note under the two rows.
const PAIRNOTE = {
  "flag>name": "You see the flag and choose or type its name.",
  "name>flag": "You see the name and choose among the flags.",
  "flag>map": "You see the flag and find the place on the map.",
  "name>map": "You see the name and find it on the map.",
  "map>name": "You see a place on the map and choose or type its name.",
  "map>flag": "You see a place on the map and choose its flag."
};
// What the difficulty changes in a round with a map in it.
function mapNote(pool) {
  const d = SET.diff,
    mixed = new Set(pool.filter(mapHas).map(mapFrameFor)).size > 1,
    where = !mixed
      ? "The map shows the region. "
      : d === "easy" || d === "medium"
        ? "The map shows each place's region. "
        : "The map shows the whole world. ",
    t = SET.dir === "map" ? (where + MAPDIFF[d]).trim() : SET.dir === "flag" ? ASKMAPF[d] : ASKMAP[d];
  return t;
}
// The first line of the difficulty note: what a right answer adds to each meter the round fills, and what a miss
// takes away, as icons and numbers: ✓ +2 [flag] +2 [pin]   ✗ −2 [flag] −2 [pin]. Easy says Practice;
// the others showing what they add is what tells it apart.
const OKICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const MISSICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>`;
function gainLine(g, m) {
  if (!g) return `<span class="gain">Practice</span>`;
  const icon = k => `<span class="mi${k === "place" ? " pl" : ""}" aria-hidden="true">${MICON[k]}</span>`;
  const kinds = [m.flag && "flag", m.place && "place"].filter(Boolean),
    each = (n, sign) => kinds.map(k => `<span class="gn">${sign}${n}${icon(k)}</span>`).join("");
  const say = kinds.map(k => (k === "flag" ? "the flag" : "the place")).join(" and ");
  return `<span class="gain ok" aria-label="A right answer adds ${g} to ${say}"><span class="gi" aria-hidden="true">${OKICON}</span>${each(g, "+")}</span><span class="gain bad" aria-label="A miss takes 2 from ${say}"><span class="gi" aria-hidden="true">${MISSICON}</span>${each(2, "−")}</span>`;
}
// The rules behind the meter, in full, folded under More.
const LEARNING = `<div class="seg"><span class="label">How learning works</span><span class="note">Each flag has a meter of ${MASTER}, marked with a flag, and a full meter means learned. Rounds with a flag on screen fill it. A right answer fills 1 on Medium, 2 on Hard and 3 on Expert. Master fills all ${MASTER} when you give the answer yourself, by typing a name or tapping the map, and 3 when you pick a flag from a grid. A miss empties 2. Easy is practice: nothing is filled or emptied. The meter keeps up to 4 more beyond full and can fall up to 4 below empty, neither of which shows. Each place has a meter too, marked with a pin and drawn in purple, and a full one means you have learned where it is. Rounds with the map fill it by the same rules: name to map and map to name fill only the place's meter, and flag to map and map to flag fill both.</span></div>`;
function viewSetup() {
  const p = S.pick,
    pool = poolFor(p.mode, p.arg, p.flt),
    grp = p.mode === "group" || p.mode === "lookmix",
    nVar = pool.filter(c => VARS(c)).length;
  const n =
    p.mode === "group"
      ? SET.len === "all"
        ? pool.length * 2
        : SET.len
      : SET.len === "all"
        ? pool.length
        : Math.min(SET.len, pool.length);
  const eff = grp && !TYPED(SET.diff) && SET.dir !== "map" && SET.ask !== "map" ? "hard" : SET.diff;
  const diffNote =
    SET.dir === "map" || SET.ask === "map"
      ? mapNote(pool)
      : grp && !TYPED(SET.diff)
        ? "Options always come from the look-alike set itself (Hard); Expert and Master " +
          (SET.dir === "flag" ? "show more of them." : "ask you to type.")
        : SET.dir === "flag"
          ? PICK[SET.diff]
          : DIFF[SET.diff];
  if (p.mode === "all") p.label = scopeName();
  // The rows go from what a round is to how it runs: what it asks and how you answer, then the difficulty (its note
  // describes options that only make sense once those are chosen), the pace and the length.
  // Settings that change which flags and designs you see sit under "More"; the summary line says what they are set to.
  const more = [],
    sumParts = [];
  if (p.mode !== "weak") {
    more.push(scopeSeg("The same setting as on the home screen; changing it here changes it there.", true));
    sumParts.push(SCOPES.find(x => x[0] === SET.scope)[1]);
  }
  if (nVar) {
    more.push(`<div class="seg"><span class="label">Design</span><div class="btns">
      ${[
        ["national", "National"],
        ["civil", "Civil"],
        ["state", "State"],
        ["random", "Random"]
      ]
        .map(
          ([v, l]) =>
            `<button class="${SET.variant === v ? "on" : ""}" onclick="setOpt('variant','${v}')">${l}</button>`
        )
        .join("")}</div>
      <span class="note">${nVar} of these flags have more than one official design, usually a civil version without the arms and a state version with them. ${{national: "National shows the everyday version.", civil: "Civil shows the version citizens fly.", state: "State shows the version government buildings fly.", random: "Random mixes them from question to question."}[SET.variant]}</span></div>`);
    sumParts.push(SET.variant + " designs");
  }
  more.push(LEARNING);
  const summary = sumParts.join(" · ");
  return `${shell({title: p.label, stat: pool.length + (p.mode === "group" ? " flags in the set" : " flags"), back: S.from && S.from.view === "look" ? "Look-alikes" : "Home"})}
  <div class="card">
    <div class="seg" id="askSeg"><span class="label">Ask with</span><div class="btns">
      <button class="${SET.ask === "flag" ? "on" : ""}" onclick="setPair('ask','flag')">Flag</button>
      <button class="${SET.ask === "name" ? "on" : ""}" onclick="setPair('ask','name')">Name</button>
      <button class="${SET.ask === "map" ? "on" : ""}" onclick="setPair('ask','map')">Map</button></div></div>
    <div class="seg" id="dirSeg"><span class="label">Answer with</span><div class="btns">
      <button class="${SET.dir === "name" ? "on" : ""}" onclick="setPair('dir','name')">Name</button>
      <button class="${SET.dir === "flag" ? "on" : ""}" onclick="setPair('dir','flag')">Flag</button>
      <button class="${SET.dir === "map" ? "on" : ""}" onclick="setPair('dir','map')">Map</button></div>
      <span class="note">${PAIRNOTE[SET.ask + ">" + SET.dir] || ""}</span></div>
    <div class="seg"><span class="label">Difficulty</span><div class="btns">
      ${["easy", "medium", "hard", "expert", "master"].map(d => `<button class="${eff === d ? "on" : ""}${grp && !TYPED(d) && d !== "hard" && SET.dir !== "map" && SET.ask !== "map" ? " off" : ""}" onclick="setOpt('diff','${d}')">${d[0].toUpperCase() + d.slice(1)}</button>`).join("")}</div>
      <span class="note"><span class="dscore">${gainLine(scoreGain(eff, SET.ask, SET.dir), roundMeters(SET.ask, SET.dir))}</span><span class="ddesc">${diffNote}</span></span></div>
    <div class="seg"><span class="label">Pace</span><div class="btns">
      <button class="${SET.pace === "learn" ? "on" : ""}" onclick="setOpt('pace','learn')">Learn</button>
      <button class="${SET.pace === "drill" ? "on" : ""}" onclick="setOpt('pace','drill')">Drill</button></div>
      <span class="note">${SET.pace === "drill" ? "Correct answers advance automatically." : "Shows what the flag means after each answer."}</span></div>
    <div class="seg"><span class="label">Round length</span><div class="btns">
      ${[
        [10, "10"],
        [25, "25"],
        ["all", "Full set"]
      ]
        .map(
          ([v, l]) =>
            `<button class="${SET.len === v ? "on" : ""}" onclick="setOpt('len',${typeof v === "string" ? "'all'" : v})">${l}</button>`
        )
        .join("")}</div></div>
    ${more.length ? `<details class="more"${S.more ? " open" : ""} ontoggle="S.more=this.open"><summary><span class="label">More</span><span class="sum">${esc(summary)}</span></summary>${more.join("")}</details>` : ""}
  </div>
  <div class="dock">${n ? `<button class="btn" id="startBtn" onclick="startRound(S.pick.mode,S.pick.arg,S.pick.label,S.pick.flt)">Start · ${n} questions</button>` : `<p class="muted small" style="text-align:center">No flags here for this scope. Pick another scope under More.</p>`}</div>`;
}
