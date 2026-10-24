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
        : "The map shows the whole world, since this set spans regions. ",
    t = SET.dir === "map" ? where + MAPDIFF[d] : (SET.dir === "flag" && ASKMAPF[d]) || ASKMAP[d];
  return t;
}
// The first line of the difficulty note: the meter this round fills, lit as far as one right answer fills it.
function gainLine(g, place) {
  if (!g) return "Practice: a right answer doesn't fill the meter.";
  return `${meter(g, undefined, place ? "place" : "")} ${g >= MASTER ? (place ? "A right answer locates the place." : "A right answer learns the flag.") : "per right answer"}`;
}
// The rules behind the meter, in full, folded under More.
const LEARNING = `<div class="seg"><span class="label">How learning works</span><span class="note">Each flag has a meter of ${MASTER}, drawn as bars, and a full meter means learned. A right answer fills 1 on Medium, 2 on Hard, 3 on Expert, and on Master 3 when picking or ${MASTER} when typing; Easy fills none. A miss empties 2. The meter keeps up to 4 more beyond full and can fall up to 4 below empty, neither of which shows. Rounds with no flag on screen (name to map, map to name) fill the place's meter instead, drawn as dots, by the same rules; a full one means located.</span></div>`;
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
        : SET.dir === "flag" && PICK[SET.diff]
          ? PICK[SET.diff]
          : DIFF[SET.diff];
  if (p.mode === "all") p.label = scopeName();
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
    <div class="seg"><span class="label">Difficulty</span><div class="btns">
      ${["easy", "medium", "hard", "expert", "master"].map(d => `<button class="${eff === d ? "on" : ""}${grp && !TYPED(d) && d !== "hard" && SET.dir !== "map" && SET.ask !== "map" ? " off" : ""}" onclick="setOpt('diff','${d}')">${d[0].toUpperCase() + d.slice(1)}</button>`).join("")}</div>
      <span class="note"><span class="dscore">${gainLine(scoreGain(eff, SET.ask, SET.dir), placeRound(SET.ask, SET.dir))}</span>${diffNote}</span></div>
    <div class="seg" id="askSeg"><span class="label">Ask with</span><div class="btns">
      <button class="${SET.ask === "flag" ? "on" : ""}" onclick="setPair('ask','flag')">Flag</button>
      <button class="${SET.ask === "name" ? "on" : ""}" onclick="setPair('ask','name')">Name</button>
      <button class="${SET.ask === "map" ? "on" : ""}" onclick="setPair('ask','map')">Map</button></div></div>
    <div class="seg" id="dirSeg"><span class="label">Answer with</span><div class="btns">
      <button class="${SET.dir === "name" ? "on" : ""}" onclick="setPair('dir','name')">Name</button>
      <button class="${SET.dir === "flag" ? "on" : ""}" onclick="setPair('dir','flag')">Flag</button>
      <button class="${SET.dir === "map" ? "on" : ""}" onclick="setPair('dir','map')">Map</button></div>
      <span class="note">${PAIRNOTE[SET.ask + ">" + SET.dir] || ""}</span></div>
    <div class="seg"><span class="label">Pace</span><div class="btns">
      <button class="${SET.pace === "learn" ? "on" : ""}" onclick="setOpt('pace','learn')">Learn</button>
      <button class="${SET.pace === "drill" ? "on" : ""}" onclick="setOpt('pace','drill')">Drill</button></div>
      <span class="note">${SET.pace === "drill" ? "Correct answers advance automatically." : "Shows what the flag means after each answer."}</span></div>
    ${more.length ? `<details class="more"${S.more ? " open" : ""} ontoggle="S.more=this.open"><summary><span class="label">More</span><span class="sum">${esc(summary)}</span></summary>${more.join("")}</details>` : ""}
  </div>
  <div class="dock">${n ? `<button class="btn" id="startBtn" onclick="startRound(S.pick.mode,S.pick.arg,S.pick.label,S.pick.flt)">Start · ${n} questions</button>` : `<p class="muted small" style="text-align:center">No flags here for this scope. Pick another scope under More.</p>`}</div>`;
}
