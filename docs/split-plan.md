# Plan: splitting js/app.js

Written 2026-10-23 on `preview-coder-1`, branched from `preview` at 1b50f0c. Plan only; nothing is moved yet.

## Why

`js/app.js` is 1,072 lines and 97 KB: about 190 top-level names, long dense lines, eight sections in one file. Finding things, reviewing diffs and working in two sessions at once all suffer. The split is about reading and changing the code, not about behaviour.

## What it is not

- No behaviour change. Every function moves as it is, byte for byte. Renames, tidying and reformatting are separate steps.
- No framework, no bundler, no build step, no dependencies. `index.html` still opens from disk.
- No ES modules. Browsers refuse module scripts from `file://`, so the files stay classic scripts loaded in order, as the data files already are.

## How classic scripts share names

- Function declarations and top-level `const`/`let` in one classic script are visible to every later script and to code that runs later in earlier ones. So code inside functions can call anything in any file.
- What can break is code that runs while a file loads (an event listener being added is fine; calling a function or reading a `const` from a file that hasn't loaded yet is not). Today that code is: the listeners added at the top level (keys, scroll, touch, resize, edge swipe), the `const`s computed from data (`QUIZ`, `NAMES`, `CANDS` and the like), and `start()` at the end.
- Rule for the split: a file may use, at load time, only names from files before it. Each file opens with a short header saying what it owns and which files it needs before it.
- Shared mutable state stays where it is, global, but each piece has one owning file named in that header: `S` (round.js), `SET` and `prog` (store.js), `badges` (store.js), `LB` (viewer.js), `SUG` (quiz.js), `EXRET` (explore.js).

## The files

Decided: two folders, `core/` (no DOM) and `ui/` (draws and listens), organised as finely as is useful, as a step towards a framework. In `ui/`, screens and the pieces they share are kept apart, because that is the line a framework draws between pages and components.

| File | What moves into it |
|---|---|
| `js/core/util.js` | `esc`, `shuffle`, `norm`, `editDist`, `fmtDate` |
| `js/core/store.js` | progress (`KEY`, `prog`, `load`, `save`, `rec`, `PTS`, `mastered`, `seen`), badge storage (`BKEY`, `loadB`, `saveB`), the saved round (`RKEY`, `saveRound`, `loadRound`) |
| `js/core/settings.js` | `SKEY`, `SET`, `loadSet`, `setOpt`, `DIFF`, `TYPED` |
| `js/core/match.js` | typed answers: `NAMES`, `ALIASN`, `matchStrict`, `matchTyped`, `CANDS`, `allowed`, `suggestAll`, `suggest` |
| `js/core/scope.js` | regions and scope: `geoOf`, `inScope`, `QUIZ`, `SCOPED`, `ALLREGIONS`, `regionFlags`, `regionAll`, `scopeName`, `SCOPES`, `inFilter`, `filterLabel` |
| `js/core/flag.js` | facts about one flag, as data: `VARS`, `useLabel`, `variantIdx`, `links`, `whereOf`, `flagYears` |
| `js/core/round.js` | the round: `S`, `poolFor`, `pickOrder`, `optCount`, `distractors`, `startRound`, `submitTyped`, `typeInput`, `pickSugg`, `answer`, `next`, `showLore`, `wake`, `setQVar`, `mixedRound` |
| `js/core/badges.js` | `BADGES`, `TITLE`, `BADGE`, `checkBadges` |
| `js/core/share.js` | `SITE`, `flagEmoji`, `shareGrid`, `shareMissed`, `shareText` |
| `js/ui/dom.js` | `$`, `app`, `capture`, `wl` |
| `js/ui/parts/flag.js` | drawing a flag and its facts: `img`, `showVariant`, `useLine`, `vchips`, `nameLink`, `nameLine`, `facts`, `cardFlag`, `mapCard` |
| `js/ui/parts/card.js` | home and region cards: `BOOK`, `CARDN`, `PLAYICON`, `MAPICON`, `card`, `setCards`, `scopeSeg`, `wideDesc`, `shell` |
| `js/ui/parts/entry.js` | a study entry, shared by the list and the map: `studyVar`, `studyPill`, `scopeLabel`, `studyEntry` |
| `js/ui/router.js` | which screen is showing: `here`, `goBack`, `stayInRound`, `HOME_Y`, `goHome`, `leaveHome`, `openSetup`, `openStudy`, `openLook`, `openBadges`, `render`, `renderQuiz`, `patchAround`, the key handler, the edge swipe |
| `js/ui/screens/home.js` | `viewHome`, `hardReload`, `VER_CHECKED`, `resetAsk` |
| `js/ui/screens/setup.js` | `viewSetup` |
| `js/ui/screens/quiz.js` | `viewQuiz`, `wireZoom` |
| `js/ui/screens/done.js` | `CLIP`, `viewDone` |
| `js/ui/screens/study.js` | `WIDE`, `studyList`, `viewStudy`, `wireMiniMaps`, `wireAlpha` |
| `js/ui/screens/look.js` | `viewLook` |
| `js/ui/screens/badges.js` | `viewBadges` |
| `js/ui/viewport.js` | the phone keyboard and the pinned quiz layout: `shade`, `VVH`, `keyboard`, `fitFlag`, `PRE_T`, `preKeyboard`, `TOUCH_T`, the touch, scroll and resize listeners, `SUG` and the suggestion-row listeners |
| `js/ui/viewer.js` | the viewer: `LB`, `openFlag`, `openMap`, `openViewer`, the `lb*` gesture, zoom, settle, slide and caption functions, `closeFlag`, `lbAnimate` |
| `js/ui/explore.js` | the explorable map: `EXRET`, `openExplore`, `exRegionSel`, `exRegion`, `exScope`, `exFlag`, `lbHatch`, `lbExHome`, and the `ex*` functions |
| `js/ui/map.js` | today's `js/map.js` (drawing maps), moved |
| `js/boot.js` | `start()` and the artifact's hot-reload hook |

Some names sit on the line between files (for example `wl` builds a link, so it is UI, while `links` only computes URLs, so it is core). The split script's table is where each one is decided, and a misplaced one is a one-line move later.

Load order in `index.html`: the data files and `js/version.js` as now, then `core/` in the order of the table (util, settings, store, match, scope, flag, badges, share, round), then `ui/dom`, `ui/map`, `ui/parts/*`, `ui/viewport`, `ui/router`, `ui/screens/*`, `ui/viewer`, `ui/explore`, and `boot` last.

## Doing it so it can be redone

Another session is working on `preview`, so `app.js` will keep changing while this branch exists. The split is therefore done by a script, not by hand:

- `tools/split_app.py` reads `js/app.js`, cuts it into top-level statements (each function, `const`/`let`, listener or IIFE with the comment lines above it), looks each one up in a table of name → file, and writes the files in their original order within each file.
- Any statement not in the table stops the script with its name, so nothing new on `preview` is silently dropped or misplaced.
- A check confirms nothing was lost: the statements of all the new files, sorted, equal the statements of the old file, sorted.
- When it's time to merge, the branch is rebuilt from the latest `preview` by running the script again, instead of resolving conflicts in a 97 KB file.

Once merged, `app.js` is gone and the script with it.

## What else changes

- `index.html`: the script tags. `tools/stamp_version.py` already stamps any `js/...` path, subfolders included.
- CLAUDE.md: the artifact line lists the new files; a short "where code lives" note points at the headers; references to `js/app.js` (for example "`geoOf()` in `js/app.js`") become the new file names.
- README: the file list.
- The artifact: about 15 more supporting files, well under the 511 limit; the first publish after the merge removes `js/app.js` with a null entry.
- Pages workflow and `tools/check_data.py`: nothing.
- `.git-blame-ignore-revs`: new, with the move commit and the reformat commit.

## Checking it

- The statement check above.
- A smoke test, `tools/smoke.js` (Playwright, run locally like `tools/build_map.js`, not part of the page): opens the app and goes through home, a study list, the explorable map, a Learn round, a Drill round, a typed round with suggestions, the viewer from the question flag and from the card's map, the results screen and the badges page, and fails on any page error. It runs on `preview` before the split and on the branch after; both must pass. It stays in the repo for later changes.
- A look on the phone at `/preview/` after the merge, since keyboard and touch behaviour can't be fully tested headless.

## Order

1. Write `tools/smoke.js` and run it on `preview` as it is.
2. Write `tools/split_app.py` with the name → file table, run it, run the statement check and the smoke test.
3. Update `index.html`, CLAUDE.md and README. Commit on `preview-coder-1`.
3a. Reformat in its own commit; add both commit hashes to `.git-blame-ignore-revs`.
4. When the other session is done, rebuild from the latest `preview` by rerunning the script, test again, merge into `preview`, publish.

## Reformatting

Decided: right after the split, in one commit that changes whitespace only (Prettier, run locally like `tools/build_map.js`, with a `.prettierrc` committed so later runs agree). Its hash goes in `.git-blame-ignore-revs`, so `git blame` (and GitHub's blame view) skips it and still shows who last changed each line. The commit that moves code into the new files goes in the same list, since it only moves lines.

## Towards a framework

The split is the first step. What it sets up, and what would come after, so each step is small and the app keeps working between them:

1. **This split.** Core logic separate from drawing; screens separate from shared parts; one owner per piece of state.
2. **Events by delegation.** Today the markup calls globals inline (`onclick="answer('fr')"`). A framework can't use those. Replacing them with `data-` attributes and one listener per screen can be done screen by screen, and makes every handler a plain function a component could call.
3. **State behind small stores.** `S`, `SET`, `prog` and `badges` are changed in many places. Giving each a few named update functions, which then call `render()`, gives a framework one place to subscribe.
4. **The renderer.** With 1 to 3 done, a screen becomes a function from state to markup with handlers attached, which is what Preact or lit-html expect. Start with the quiz screen, where `patchAround`, the scroll keeping and the rewiring after each draw would go away, then the other screens one at a time.

The viewer, the explorable map and the keyboard code talk to the browser directly and would stay hand-written inside a component under any framework.

## Open questions

- Keep `tools/smoke.js` in the repo? See the explanation in the chat; it needs Playwright installed locally to run.
