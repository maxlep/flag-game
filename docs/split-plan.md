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

Sizes are from the current line ranges and will shift a little.

| File | What moves into it | Roughly |
|---|---|---|
| `js/core/util.js` | `$`, `app`, `esc`, `shuffle`, `norm`, `editDist`, `wl`, `fmtDate`, `capture` | small |
| `js/core/store.js` | progress (`KEY`, `prog`, `load`, `save`, `rec`, `PTS`, `mastered`, `seen`), settings (`SKEY`, `SET`, `loadSet`, `setOpt`, `DIFF`, `TYPED`), badge storage (`BKEY`, `loadB`, `saveB`), the saved round (`RKEY`, `saveRound`, `loadRound`) | 6 KB |
| `js/core/match.js` | typed answers: `NAMES`, `ALIASN`, `matchStrict`, `matchTyped`, `CANDS`, `allowed`, `suggestAll`, `suggest` | 4 KB |
| `js/core/catalog.js` | what the app knows about a flag: scope and regions (`geoOf`, `inScope`, `QUIZ`, `SCOPED`, `ALLREGIONS`, `regionFlags`, `regionAll`, `scopeName`, `SCOPES`, `inFilter`, `filterLabel`), designs (`VARS`, `useLabel`, `variantIdx`, `img`, `showVariant`, `useLine`, `vchips`), names and facts (`links`, `nameLink`, `whereOf`, `nameLine`, `facts`, `flagYears`, `cardFlag`, `mapCard`, `flagEmoji`) | 12 KB |
| `js/core/round.js` | the round: `S`, `poolFor`, `pickOrder`, `optCount`, `distractors`, `startRound`, `submitTyped`, `typeInput`, `pickSugg`, `answer`, `next`, `showLore`, `wake`, `setQVar`, `mixedRound` | 9 KB |
| `js/core/badges.js` | `BADGES`, `TITLE`, `BADGE`, `checkBadges` | 6 KB |
| `js/ui/nav.js` | moving between screens and drawing them: `here`, `goBack`, `stayInRound`, `HOME_Y`, `goHome`, `leaveHome`, `openSetup`, `openStudy`, `openLook`, `openBadges`, `render`, `renderQuiz`, `patchAround`, `shell`, the key handler, the edge swipe | 9 KB |
| `js/ui/quiz.js` | the quiz screen: `viewQuiz`, `shade`, `VVH`, `keyboard`, `fitFlag`, `PRE_T`, `preKeyboard`, `TOUCH_T`, the touch and suggestion-row listeners, `SUG`, `wireZoom` | 16 KB |
| `js/ui/home.js` | home and setup: `BOOK`, `CARDN`, `PLAYICON`, `card`, `setCards`, `scopeSeg`, `wideDesc`, `viewHome`, `hardReload`, `VER_CHECKED`, `resetAsk`, `viewSetup` | 12 KB |
| `js/ui/done.js` | the results screen and sharing: `SITE`, `shareGrid`, `shareMissed`, `shareText`, `CLIP`, `viewDone` | 5 KB |
| `js/ui/study.js` | study list and look-alikes: `studyVar`, `studyPill`, `scopeLabel`, `studyEntry`, `WIDE`, `studyList`, `MAPICON`, `viewStudy`, `wireMiniMaps`, `wireAlpha`, `viewLook` | 7 KB |
| `js/ui/badges.js` | `viewBadges` | 2 KB |
| `js/ui/viewer.js` | the viewer: `LB`, `openFlag`, `openMap`, `openViewer`, the `lb*` gesture, zoom, settle, slide and caption functions, `closeFlag`, `lbAnimate` | 12 KB |
| `js/ui/explore.js` | the explorable map: `EXRET`, `openExplore`, `exRegionSel`, `exRegion`, `exScope`, `exFlag`, `lbHatch`, `lbExHome`, and the `ex*` functions | 10 KB |
| `js/boot.js` | `start()` and the artifact's hot-reload hook | small |

`js/map.js` (drawing maps) stays where it is for now; it could become `js/ui/map.js` later, with the rest of the map code.

Two folders, because the line between them is useful: `core/` has no DOM drawing and could be tested on its own; `ui/` draws and listens. The alternative is one flat `js/` folder with the same file names; it saves a level of nesting and loses that line.

Load order in `index.html`: the data files as now, `js/map.js`, `js/version.js`, then `core/util`, `core/store`, `core/match`, `core/catalog`, `core/badges`, `core/round`, `ui/nav`, `ui/quiz`, `ui/home`, `ui/done`, `ui/study`, `ui/badges`, `ui/viewer`, `ui/explore`, `boot`.

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

## Checking it

- The statement check above.
- A smoke test, `tools/smoke.js` (Playwright, run locally like `tools/build_map.js`, not part of the page): opens the app and goes through home, a study list, the explorable map, a Learn round, a Drill round, a typed round with suggestions, the viewer from the question flag and from the card's map, the results screen and the badges page, and fails on any page error. It runs on `preview` before the split and on the branch after; both must pass. It stays in the repo for later changes.
- A look on the phone at `/preview/` after the merge, since keyboard and touch behaviour can't be fully tested headless.

## Order

1. Write `tools/smoke.js` and run it on `preview` as it is.
2. Write `tools/split_app.py` with the name → file table, run it, run the statement check and the smoke test.
3. Update `index.html`, CLAUDE.md and README. Commit on `preview-coder-1`.
4. When the other session is done, rebuild from the latest `preview` by rerunning the script, test again, merge into `preview`, publish.

## Later, separate steps

- Reformatting the long lines (Prettier, run locally). A large diff of whitespace only; worth doing once, right after the split, so later diffs read well. Your call.
- A small renderer for the quiz screen when the map quiz is built, as discussed: it would replace `patchAround`, the scroll keeping and the rewiring after each draw.

## Open questions

- Two folders (`core/`, `ui/`) or one flat `js/`?
- Reformat right after the split, or leave the lines as they are?
- Keep `tools/smoke.js` in the repo? It needs Playwright installed locally to run.
