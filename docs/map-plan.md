# Plan: maps and geography

Not started. Written 2026-10-23 so the thinking isn't lost.

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

The thumbnails and the learn card keep the 50m file. The viewer should load a second file, `js/data/map10.js`, built by the same script from `ne_10m_admin_0_countries` at the same 8% simplification, the first time it opens, and use it for every map it draws. Measured: 1.6 MB, 480 KB gzipped (3.5x the 50m file), 131k vertices; first paint of a region map about 80 ms in desktop Chrome, so about 0.2 s on a phone; zoom frames stay under budget. Keeping 25% of the points (4 MB, 1 MB gzipped, 220 ms) is too much. What it buys: small islands and microstates get their real coastlines, since the build keeps small shapes unsimplified and 10m has many more of them; large countries look much as now. The hybrid of 10m outlines only for small flags over 50m land was considered and set aside: cheaper, but a 10m island on a 50m neighbour shows slivers where they touch.

## Later: project on the fly

Step 1 ships pre-projected paths (Equal Earth, one canvas, a Pacific-centred copy for Oceania, a per-frame correction of the vertical stretch). For the whole-world quiz the map should instead be projected in the app around the centre of the view, as a globe you spin: the build writes quantized lon/lat, the app rotates to the view centre and applies one azimuthal projection (about 40 lines). About 60,000 vertices to project per redraw, a few milliseconds; drawing is the cost, so canvas rather than SVG if it isn't smooth. The hard part is clipping shapes at the horizon; azimuthal equidistant shows the whole sphere with no clipping, orthographic needs a cheap back-face clip. The stretch correction and the Pacific set go away with it.

## Order

1. Data and the map component: script, data file, drawing, highlight, framing, zoom and pan, a check page. This step has the unknowns (file size, tiny places, which shapes need 10m).
2. Learn integration: info card, study list, viewer slide, capitals.
3. Quiz modes and the setup changes. These sit inside the reworked quiz layout (pinned answer drawer), so that layout comes first.
4. Progress and badges.
