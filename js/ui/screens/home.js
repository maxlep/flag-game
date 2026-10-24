// js/ui/screens/home.js: The home screen and the version check.
// Needs before it at load time: nothing.

function viewHome() {
  const weak = poolFor("weak").length,
    nb = BADGES.filter(b => badges[b.id]).length;
  const learned = l => l.filter(f => mastered(f.c)).length;
  return `${shell()}
  <p class="muted small">Name the flag, then read what it stands for. Tap a set to play it, or study it as a list or on a map. Flags you miss come back sooner.</p>
  <div class="kbd"><span class="eyebrow">Keyboard</span><span><kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> answer</span><span><kbd>Enter</kbd> starts and continues</span><span><kbd>Esc</kbd> goes back</span></div>
  ${scopeSeg()}
  <p class="eyebrow">Regions</p>
  <div class="tiles">${setCards(ALLREGIONS)}
    ${card({wide: true, name: scopeName(), marks: TITLES.filter(k => badges[k]).map(k => ({e: BADGE[k].e, n: BADGE[k].n})), count: learned(SCOPED()) + " / " + SCOPED().length, go: `openSetup('all',null,'${scopeName()}')`, study: `openStudy('${scopeName()}')`, map: `openExplore('${scopeName()}')`, ...wideDesc()})}
  </div>
  <p class="eyebrow" style="padding-top:4px">Practice</p>
  <div class="tiles">
    ${card({wide: true, name: "Look-alikes", count: GROUPS.filter(g => g.f.filter(c => inScope(BY[c])).length >= 2).length + " sets · mixed round", go: "openSetup('lookmix',null,'Look-alikes')", study: "openLook()", dq: "Choose the settings and start a round mixing every look-alike set.", dl: "Every set of look-alike flags, with the detail that tells them apart."})}
    ${weak ? card({wide: true, name: "Weak spots", count: weak + " to fix", go: "openSetup('weak',null,'Weak spots')"}) : `<div class="tile wide dim"><span class="tmain"><span class="name">Weak spots</span><span class="count">nothing missed yet</span></span></div>`}
  </div>
  <div class="tiles" style="padding-top:4px">
    ${card({wide: true, cls: "gold", name: "🏅 Badges", count: nb + " / " + BADGES.length + " earned ›", go: "openBadges()"})}
  </div>
  <div class="foot"><span class="small muted">Progress is saved on this device.</span><button class="link" onclick="resetAsk()">Reset progress</button></div>
  <p class="ver" id="ver"><span class="stamp">${location.pathname.includes("/preview/") ? "preview · " : ""}${typeof VERSION === "object" ? "updated " + verLocal(VERSION.at) : ""}<button class="refresh" onclick="hardReload()" title="Reload the page" aria-label="Reload">↻</button></span></p>`;
}
// Compare this build with the one the site is serving; say so if that one is newer. Fails silently from a local file.
// A hard reload fetches a fresh index.html (whose asset links carry the version), so the browser can't mix old and new.
function hardReload() {
  location.replace(location.pathname + "?r=" + Date.now());
}
let VER_CHECKED = null;
// The stamp is written in UTC; it shows in the device's own time zone, which the browser knows without asking.
function verLocal(at) {
  const d = new Date(at.replace(" ", "T").replace(" UTC", "Z"));
  return isNaN(d)
    ? at
    : d.toLocaleString(undefined, {day: "numeric", month: "short", hour: "numeric", minute: "2-digit"});
}
async function checkVersion() {
  if (typeof VERSION !== "object" || VER_CHECKED !== null) return;
  VER_CHECKED = false;
  try {
    const r = await fetch("js/version.js?" + Date.now(), {cache: "no-store"});
    const m = (await r.text()).match(/at:"([^"]+)"/);
    if (!m) return;
    VER_CHECKED = m[1];
    const el = $("#ver");
    if (el && VER_CHECKED > VERSION.at)
      el.innerHTML =
        `<button class="stale" onclick="hardReload()">A newer version is available, reload</button>` + el.innerHTML;
  } catch (e) {}
}
function resetAsk() {
  const f = app.querySelector(".foot");
  f.innerHTML = `<span class="small">Clear all progress?</span><span class="row" style="flex:none"><button class="link" onclick="prog={};badges={};save();saveB();render()">Yes, clear</button><button class="link" onclick="render()">Keep</button></span>`;
}
