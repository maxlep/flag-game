# Working notes

What the project is and where files live: see README.md. This file holds the rules that aren't visible in the code.

## Source of truth and targets

- This repo is canonical. `index.html` is a complete document; open it from disk to run the app. No build step, no bundler, no dependencies.
- Two deploy targets from the same files:
  - GitHub Pages: push to `main`; it serves the repo as-is.
  - The claude.ai artifact: it needs a bare fragment, not a full document. Generate it with `tools/artifact_fragment.py index.html` and publish that fragment together with `css/`, `js/`, `flags/`, `flags-true/`, `icons/`, `favicon.ico` and `manifest.webmanifest` as supporting files.
- Keep both targets in sync: every change is published to the artifact and pushed to GitHub in the same step.
- Before each commit run `tools/stamp_version.py` and stage `js/version.js`. The home screen shows the time in small print and checks GitHub for a newer stamp.

## Data rules

- Country names: the official short name in the country's own preferred English form (Czechia, Türkiye, Eswatini, Timor-Leste, Côte d'Ivoire, Cabo Verde). Older or common names go in `ALIASES` in `js/data/names.js`, never in the display name.
- Descriptions (the `blurb` field): two or three plain sentences for a learner, no bullet points, legends labelled as legends, no superlatives ("the only flag that…") unless the Wikipedia flag article states them. Every description shipped so far has been checked against the English Wikipedia "Flag of …" article; keep that bar for edits and additions, and record what was verified. Blurbs are JavaScript string literals in double quotes, so they must not contain a double quote.
- Capitals: the conventional choice; where disputed, say so in the field itself ("Sucre (constitutional), La Paz (seat of government)", "None").
- The 197 countries (193 UN members plus Vatican City, Palestine, Kosovo, Taiwan) are `sov: true`; everything else is a set in `SETS`. "Whole world" and the Flag Lord badge mean the 197; "Everything" means all flags.
- Each non-country flag has a geographic region in `GEO` (`js/data/names.js`), or none for organisations and the Antarctic. With the "Territories: Include" setting on, region rounds, region study lists and the look-alike region filter add those flags; the region cards and "Whole world" stay countries only.
- Look-alike sets (`js/data/groups.js`): each needs a `k` kind from the five used, and a hint that states a concrete visual difference for every flag in the set. Hints were fact-checked too.

## Adding or changing flag artwork

- Two artwork sets: `flags/` is 4:3 (from flag-icons), `flags-true/` is official proportions (from svg-country-flags). A flag needs both; if the true-proportion file is missing, the app falls back to 4:3.
- Run `tools/snap_edges.py` on every new SVG, in both folders. It stops hairline seams between stripes.
- Add the true-proportion ratio to `TRUER` in `js/data/names.js` (width ÷ height from the SVG's viewBox). Non-rectangular flags go in `BARE`.
- A new flag also needs: an entry in `js/data/flags.js`, a Wikipedia title in `FLAGWIKI` if "Flag_of_<Name>" isn't the article, and a `CAPWIKI` entry if the capital's name is ambiguous on Wikipedia.

## Behaviour that the code relies on

- Settings and progress live in localStorage under `flaglore.*` keys; the storage format must stay backward compatible (`rec()` migrates old records).
- Badges are awarded only in `checkBadges()` at round end and are never revoked.
- The round in progress is saved under `flaglore.round` on every answer and restored on load; `saveRound()` must run after any change to `S` during a round, and the key is cleared when leaving.
- Typed answers (Expert): exact → unique exact prefix/substring → typo-tolerant only when nothing matches exactly. Don't let fuzzy matches widen the "one suggestion left" rule; precise typists rely on it. Master is exact names and aliases only, no suggestions.
- Keyboard: Enter starts/continues, Esc goes back, Tab never leaves the page during a round. A swipe in from the left edge is also back (for the home-screen app).

## Copy

- Plain, short sentences. No em-dash asides, no "not X but Y", no marketing adjectives. The person who owns this project reads copy closely and will say when it sounds generated.
