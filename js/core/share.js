// js/core/share.js: The text of a result to share: the emoji grid, the missed flags.
// Needs before it at load time: nothing.

const SITE = "https://maxlep.github.io/flag-game/";
// Flag emoji: regional-indicator pairs for ISO codes; tag sequences for England, Scotland, Wales. Others have none.
function flagEmoji(c) {
  if (EMOJI_EXTRA[c]) return EMOJI_EXTRA[c];
  if (!/^[a-z]{2}$/.test(c)) return "";
  return [...c.toUpperCase()].map(ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join("");
}
function shareGrid() {
  const n = S.qs.length;
  if (n > 25) return "";
  const sq = S.qs.map(q => (q.ans === q.c ? "🟩" : "🟥"));
  const rows = [];
  for (let i = 0; i < n; i += 10) rows.push(sq.slice(i, i + 10).join(""));
  return rows.join("\n");
}
function shareMissed() {
  const seen = new Set(),
    m = S.qs.filter(q => q.ans !== q.c && !seen.has(q.c) && seen.add(q.c)).map(q => q.c);
  if (!m.length) return "Perfect round";
  const show = m.slice(0, 6).map(c => flagEmoji(c) || BY[c].n),
    more = m.length > 6 ? ` +${m.length - 6} more` : "";
  return "Missed " + show.join(" ") + more;
}
// What the round earned, titles first; First Steps is left out, since every first round earns it.
function shareEarned() {
  const ids = (S.earned || []).filter(id => id !== "first" && BADGE[id]),
    rank = id => (BADGE[id].big ? 0 : BADGE[id].title ? 1 : 2);
  ids.sort((a, b) => rank(a) - rank(b));
  return ids.length ? "New: " + ids.map(id => BADGE[id].e + " " + BADGE[id].n).join(", ") : "";
}
function shareText() {
  const n = S.qs.length,
    right = S.qs.filter(q => q.ans === q.c).length;
  const diff = S.diff[0].toUpperCase() + S.diff.slice(1),
    mode =
      S.dir === "map"
        ? "find it on the map"
        : S.ask === "map"
          ? S.dir === "flag"
            ? "pick the flag for the map"
            : "name the place on the map"
          : S.dir === "flag"
            ? "pick the flag"
            : "name the flag";
  const scope =
    S.mode === "region" && S.scope === "all"
      ? " with territories"
      : S.mode === "region" && S.scope === "territories"
        ? " territories"
        : "";
  const variant = S.variant && S.variant !== "national" ? ` · ${S.variant} designs` : "";
  const grid = shareGrid();
  return `Flags of the World · ${S.label}${scope}\n${right}/${n} · ${diff} · ${mode}${variant}${S.best >= 5 ? ` · streak ${S.best}` : ""}${grid ? "\n" + grid : ""}\n${shareMissed()}${shareEarned() ? "\n" + shareEarned() : ""}\n${SITE}`;
}
