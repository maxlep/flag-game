# Plan: maps and geography

Written 2026-10-23 so the thinking isn't lost. Steps 1 and 2 of the order below are done; step 3, the explorable map, is in progress.

## Goal

Learn where each country is, and where its capital is, alongside its flag. Maps appear in learn mode, in the study list and viewer, and as new quiz types.

## No map API

Tile maps (Leaflet with OpenStreetMap, Mapbox, Google) need a network, often a key, and attribution, and they still don't know where a border is; the polygons are needed anyway. The app is a static, offline home-screen page with no dependencies, so the borders ship as data and are drawn as plain SVG. Terrain and roads from a tile service would be nice when zoomed in; that can come later as an optional layer, once the SVG map works.

## Data

- Source: Natural Earth (public domain) via the `world-atlas` npm package (TopoJSON at 110m, 50m, 10m).
- A build-time script in `tools/` (run once, not in the page) projects, simplifies and writes `js/data/map.js`: one SVG path per flag code, a centroid, a bounding box, and per-region frames. Target 200–400 KB, one file.
- Natural Earth keys by numeric ISO; map once to our two-letter codes.
- Tiny places (Vatican, Monaco, San Marino, Singapore, the Pacific islands) also get a dot that stays visible and tappable at any zoom.
- Territories: 50m covers most of ours; pull the missing shapes (Gibraltar, Hong Kong, the Channel Islands, …) from 10m individually.
- Capitals: a lat/long per flag (Natural Earth `populated_places` has them, keyed by country), projected with the same projection; drawn as a dot with a label when zoomed in enough. Disputed or dual capitals follow the capital field we already show.
- Disputed borders: keep Natural Earth's de-facto drawing (Taiwan, Kosovo, Western Sahara, Crimea, Kashmir) and say so in CLAUDE.md, as with Northern Ireland.
- Projection: Equal Earth for the world; per-region frames so Europe isn't a thumbnail.

## Where it shows

1. Learn mode, the info card: a small map of the region with the country filled in the accent colour (dot for small ones) and its capital marked. Tap for full screen with the same pinch and scroll zoom as the flag viewer.
2. Study list and viewer: the viewer's slide strip gets a map slide after the designs, so you swipe from the flag to where it is. In the list, a small map link or thumbnail per entry.
3. Quiz types. Setup becomes two choices: Ask with (Flag · Name · Map) and Answer with (Name · Flag · Map), same-same excluded.
   - Find it on the map: tap the country. Framed to its region on Easy and Medium, the whole world on Hard and up. Small countries count a tap on their dot.
   - Which country is highlighted: answer with a name, by typing, or by picking the flag.
   - Capitals could be a later ask type: tap where the capital is, or name the capital of the highlighted country.
4. Progress: geography is tracked separately from flags ("learned" vs "located"), with its own badges later. Flag Lord stays about flags.

## Later: a sharper map for the viewer

(Since this was measured, the 50m file has grown from 394 KB to 508 KB: the build now keeps the small islands that simplification used to shrink to points. The 10m comparison below is against the old size.)

The thumbnails and the learn card keep the 50m file. The viewer should load a second file, `js/data/map10.js`, built by the same script from `ne_10m_admin_0_countries` at the same 8% simplification, the first time it opens, and use it for every map it draws. Measured: 1.6 MB, 480 KB gzipped (3.5x the 50m file), 131k vertices; first paint of a region map about 80 ms in desktop Chrome, so about 0.2 s on a phone; zoom frames stay under budget. Keeping 25% of the points (4 MB, 1 MB gzipped, 220 ms) is too much. What it buys: small islands and microstates get their real coastlines, since the build keeps small shapes unsimplified and 10m has many more of them; large countries look much as now. The hybrid of 10m outlines only for small flags over 50m land was considered and set aside: cheaper, but a 10m island on a 50m neighbour shows slivers where they touch.

## Later: project on the fly

Step 1 ships pre-projected paths (Equal Earth, one canvas, a Pacific-centred copy for Oceania, a per-frame correction of the vertical stretch). For the whole-world quiz the map should instead be projected in the app around the centre of the view, as a globe you spin: the build writes quantized lon/lat, the app rotates to the view centre and applies one azimuthal projection (about 40 lines). About 60,000 vertices to project per redraw, a few milliseconds; drawing is the cost, so canvas rather than SVG if it isn't smooth. The hard part is clipping shapes at the horizon; azimuthal equidistant shows the whole sphere with no clipping, orthographic needs a cheap back-face clip. The stretch correction and the Pacific set go away with it.

## The explorable map

A study list laid out as a map instead of alphabetically. Every flag in the region (and the scope) is drawn as its own shape. Tap one to select it: it fills in the accent colour, its capital is marked, and a card at the bottom shows its flag, name, capital and description. Nothing is scored.

Most of what it needs, the map quiz needs too: telling which shape a tap landed on, dots for small places that stay big enough to hit, and panning and zooming as the main thing you do rather than a side feature of the viewer. With it in place, "Find it on the map" is mostly rules on top.

It comes in two parts:

1. By region, on the current pre-projected map. The viewer already pans within a region's frame, so a region is the bounds. Builds the tap test, the dots, the selection and the card.
2. The whole world, scrollable. This is where projecting on the fly pays off: the flat canvas has a seam at the antimeridian (why Oceania has its own copy) and its stretch correction is fixed per frame, so panning from the world into Scandinavia shows it squashed. A view projected around its own centre has neither problem, and a region becomes a limit on where the centre may go rather than a separate picture. Explore is a gentler first user for it than a timed quiz. The 10m file is decided here too, since explore is where deep zoom happens.

Starting with part 2 would skip a version that gets replaced, at the cost of putting the riskiest work (smooth panning, horizon clipping, perhaps canvas) before anything is usable.

Choices made for the first version, open to change:

- The study list of the places in the set sits beside the map: a drawer at the bottom on a phone, which folds to its handle, and a panel on the left on a wide screen. A tap on an entry selects the place and brings it into view; a tap on the map marks the entry. The selected entry is the card, so a separate card shows only when the list is folded or the place is outside the scope.
- A card pinned at the bottom rather than a popup tied to the spot. A popup has to follow pans and zooms, covers the neighbours you tap next, and has nowhere to sit near a phone's edge. The spot is still marked on the map.
- Entered from a region card (a map button joined to the book that opens the list) or the study list (a Map button beside the scope). The region is picked from the map's title, and the scope from its top bar. The top line gives only the count: the hatch and dots should explain themselves.
- Built as a mode of the viewer, so the viewer stays the only zoom. The card's flag opens the designs, and closing them comes back to the map where it was.
- Where shapes overlap (the United Kingdom and England, a country and its territory), the smaller is on top and a second tap on the same spot goes to the next one under it.
- Every place in the region can be tapped whatever the scope. The scope is shown and set in the map's top bar; places outside it are hatched and their card says so, and they sit under the places in it. Land outside the region is grey. (From feedback on the first version: an area you can't tap, with no visible reason, is confusing.)

### Open questions

- Whether the map is bounded by region or is one world map you can scroll. Bounding is cheap now; the whole world wants projection on the fly.
- What a tap on sea, or on land outside the region, does: clear the selection (as now), or nothing.
- Whether exploring counts toward "located" progress. Probably not, as browsing the study list doesn't count as learned.
- Whether explore is a mode of the viewer (keeps "the viewer is the only zoom") or its own screen built on the same map code (that rule would change).
- Popup at the spot or card at the bottom, if the card doesn't feel right in use.

## The map quiz

Decided 2026-10-24. Both parts are built. Asked with the map, the options are the place's neighbours, and the map is its region's on every difficulty (Master without borders).

- Setup has two choices, Ask with (Flag · Name · Map) and Answer with (Name · Flag · Map), never the same. Settings `SET.ask` and `SET.dir` (the answer); an old saved setting without `ask` gets the one it implied (Pick the flag asked with the name).
- Built in two parts: the map as the answer first ("find it on the map", from a flag or a name), then the map as the question ("which place is this?", answered with its name, typed or picked, or its flag).
- Answering on the map: the map fills the middle of the quiz screen under the question, framed to the place's region on Easy and Medium and the whole world from Hard. It pans and zooms in place. A tap selects a place without naming it (naming it would let you hunt by tapping), and Check answers; on Easy the tap answers at once. Overlapping places cycle on a second tap, places in the set sit above those outside it, small places have their dots. After the answer the right place is filled and a wrong pick marked, and the map moves to show them if they are out of view.
- Master hides the borders (one idea to try; others may follow).
- Progress: a round with a flag on screen (flag to map, map to flag) counts toward the flag's learning as now. One without (name to map, map to name) tests geography only: it is kept apart, as "located" (`flaglore.located`), for the separate progress planned below.
- Titles and badges stay about flags: map rounds earn none for now (only the first-round badge).

## Order

1. Data and the map component: script, data file, drawing, highlight, framing, zoom and pan, a check page. This step has the unknowns (file size, tiny places, which shapes need 10m). Done.
2. Learn integration: info card, study list, viewer slide, capitals. Done.
3. The explorable map, by region first, then the whole world with projection on the fly.
4. Quiz modes and the setup changes (the pinned answer drawer they needed is in place). In progress: see The map quiz.
5. Progress and badges.
