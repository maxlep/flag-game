# Working notes

What the project is and where files live: see README.md. This file holds the rules that aren't visible in the code.

## Source of truth and targets

- This repo is canonical. `index.html` is a complete document; open it from disk to run the app. No build step, no bundler, no dependencies.
- Two deploy targets from the same files:
  - GitHub Pages: `.github/workflows/pages.yml` deploys `main` at the site root and the `preview` branch under `/preview/` (same site, so both can sit on a phone's home screen; the preview is renamed "Flags preview" and its stamp line says preview). Push to either branch to redeploy. Work meant for comparison goes on `preview`; merge to `main` when it's agreed.
  - The claude.ai artifact: it needs a bare fragment, not a full document. Generate it with `tools/artifact_fragment.py index.html` and publish that fragment together with `css/`, `js/` (including `js/map.js` and `js/data/map.js`), `flags-true/`, `icons/`, `favicon.ico` and `manifest.webmanifest` as supporting files. From `flags/` publish only the files with no `flags-true/` counterpart; the artifact holds at most 511 files.
- Keep both targets in sync: every change is published to the artifact and pushed to GitHub in the same step.
- Before each commit run `tools/stamp_version.py` and stage `js/version.js` and `index.html`: it writes the stamp and puts it on the asset links (`?v=`), so a fresh page never mixes old and new files. The home screen shows the time in small print, compares it with the `js/version.js` the site is serving, and offers a hard reload (a fresh `index.html` via `?r=`). GitHub Pages caches for about ten minutes, so a push can take that long to show.

## Data rules

- Country names: the official short name in the country's own preferred English form (Czechia, Türkiye, Eswatini, Timor-Leste, Côte d'Ivoire, Cabo Verde). Older or common names go in `ALIASES` in `js/data/names.js`, never in the display name.
- Descriptions (the `blurb` field): two or three plain sentences for a learner, no bullet points, legends labelled as legends, no superlatives ("the only flag that…") unless the Wikipedia flag article states them. Every description shipped so far has been checked against the English Wikipedia "Flag of …" article; keep that bar for edits and additions, and record what was verified. Blurbs are JavaScript string literals in double quotes, so they must not contain a double quote.
- Capitals: the conventional choice; where disputed, say so in the field itself ("Sucre (constitutional), La Paz (seat of government)", "None").
- The 197 countries (193 UN members plus Vatican City, Palestine, Kosovo, Taiwan) are `sov: true`; everything else is a territory in the app's sense (territories, nations and regions, organisations, the Antarctic). `SETS` in `js/data/flags.js` only labels where a non-country row came from.
- Every non-country flag has a region in `GEO` (`js/data/names.js`): one of the five continents, "Antarctic" or "Organisations". `geoOf()` in `js/app.js` is the one place that decides a flag's region.
- Scope is one saved setting (`SET.scope`: countries, all, territories) shown on the home screen and the setup screen. It filters every region, the wide card ("Whole world", "Everything", "All territories"), study lists, weak spots and look-alikes; empty region cards are dropped. Rounds record the scope they ran under. Titles are one per scope, at region and world level: Lord (Countries), Warden (Territories), Emperor (All), each a full round on Master, typed, with no misses; earned ones show as marks on the cards whatever the current scope. Explorer stays the easy one: a full All-territories round at any difficulty.
- A flag with no design of its own (Northern Ireland, which flies the Union Jack) goes in `NOQUIZ` (`js/data/names.js`): it appears in study lists with a "not quizzed" pill and its `USE` line explains why, and it is never asked, never a distractor and never counted.
- Run `tools/check_data.py` before committing data or artwork changes. It fails on missing artwork, two flags with identical artwork, a `TRUER` ratio that disagrees with the file's viewBox, and a `VARIANTS` entry without its file.
- The map (`js/data/map.js`) is generated, never edited by hand. `tools/build_map.js` projects Natural Earth (public domain) with Equal Earth onto a 1000-wide canvas and writes, per set (world, and a Pacific-centred one for Oceania), the land outlines, one shape per flag, its centre and box, its capital, and a frame box per region. The header of the script says how to fetch Natural Earth and the npm packages it needs; the app itself needs neither. Rebuild after adding a flag that has a territory of its own (the script maps codes to Natural Earth features; the organisations have no shape). Borders are Natural Earth's de-facto drawing (Taiwan, Kosovo, Western Sahara, Crimea, Kashmir); capitals it can't match by name fall back to the shape's centre, and the build prints which. `js/map.js` is the one place that draws a map: `mapSVG({code, frame})` frames the flag's region (`mapFrameFor`), widens the frame when the flag's centre lies outside it, and adds a dot for a place too small to see at that scale.
- Look-alike sets (`js/data/groups.js`): each needs a `k` kind from the five used, and a hint that states a concrete visual difference for every flag in the set. Hints were fact-checked too.

## Adding or changing flag artwork

- Flags are always drawn in official proportions from `flags-true/` (svg-country-flags). `flags/` (flag-icons, 4:3) is only the fallback for the few flags with no true-proportion file; there is no setting to draw everything at 4:3, since that shows designs that don't exist.
- Variants: `VARIANTS` in `js/data/names.js` lists a flag's official designs for use on land (civil, state, reverse), each with Wikipedia's infobox "Use" label and a short difference. Entry 0 is `flags-true/<code>.svg`; the others are `flags-true/<code>-<kind>.svg`, with an optional ratio and `bare` flag for swallowtails. `USE` holds the infobox label for single-design flags where it isn't "National flag". Civil versions were derived from our artwork by dropping the arms; versions that add arms came from Wikimedia Commons (public domain). Check the infobox before adding one; ensigns and war flags don't count.
- Run `tools/snap_edges.py` on every new SVG, in both folders. It stops hairline seams between stripes.
- Add the true-proportion ratio to `TRUER` in `js/data/names.js` (width ÷ height from the SVG's viewBox). Non-rectangular flags go in `BARE`.
- A new flag also needs: an entry in `js/data/flags.js`, a Wikipedia title in `FLAGWIKI` if "Flag_of_<Name>" isn't the article, and a `CAPWIKI` entry if the capital's name is ambiguous on Wikipedia.

## Behaviour that the code relies on

- The quiz is a fixed-height screen (`.qscreen`), not a scrolling page: header, a middle band (`#qmid`) that scrolls on its own, and an answer drawer (`.qdrawer`) pinned at the bottom. Its height is `--vvh` and its offset `--vvt`, both set from `visualViewport` in `keyboard()`, so with a phone keyboard up the layout fits above it. The question flag is capped to the middle band. Because `.qscreen` has a transform, fixed-positioned descendants (the lifted zoom flag) position against it, and the zoom code measures relative to it.
- In typed rounds the answer box is never replaced during a round: `render()` patches it in place (`patchAround`) so focus, and the phone keyboard, stay put.
- The Design setting (`SET.variant`: national, civil, state, random) picks which variant each question shows; questions store it as `q.v` (and `q.ov` per option) so a restored round looks the same. The info card, study list and viewer let the reader switch designs; that never changes the setting.
- Settings and progress live in localStorage under `flaglore.*` keys; the storage format must stay backward compatible (`rec()` migrates old records).
- Badges are awarded only in `checkBadges()` at round end and are never revoked.
- The round in progress is saved under `flaglore.round` on every answer and restored on load; `saveRound()` must run after any change to `S` during a round, and the key is cleared when leaving.
- Typed answers (Expert): exact → unique exact prefix/substring → typo-tolerant only when nothing matches exactly. Don't let fuzzy matches widen the "one suggestion left" rule; precise typists rely on it. On Check with several suggestions left, the first suggestion (the one shown first in the row) is what gets submitted. Master is exact names and aliases only, no suggestions.
- The viewer (`openFlag`) shows the designs as slides and the map as the last slide; `openFlag(c,"map")` opens on it. Zoom is done by resizing the element (flag or SVG) so it stays sharp; on the map slide `lbApply` also shrinks the markers back so they keep their size on screen.
- Keyboard: Enter starts/continues, Esc goes back, Tab never leaves the page during a round. A swipe in from the left edge is also back (for the home-screen app).

## Copy

- Plain, short sentences. No em-dash asides, no "not X but Y", no marketing adjectives. The person who owns this project reads copy closely and will say when it sounds generated.
