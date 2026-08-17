# Lisa & Andrew’s Scenic Swedish Road Trip — August 2026

## 🌍 OPEN THE LIVE ROAD TRIP

**https://roadtrip-august-2026.vercel.app**

Interactive, map-first road-trip journal for **9–15 August 2026**.

## Source of truth

GitHub `main` is the source of truth for the app, data, media and scenic artwork. There are no parallel V2/V3 app bundles or temporary scenic-asset staging files.

Canonical app files:

- `index.html` — production page shell
- `app.js` — map, itinerary, gallery and edit interactions
- `styles.css` — main UI styling
- `map-fixes.css` — MapLibre positioning/readability corrections
- `scenic-data.js` — canonical scenic coordinates, stay order and route anchors
- `scenic-layout.js` — the single canonical mapping from scenic IDs to permanent artwork and safe-space callout offsets
- `callouts.js` / `callouts.css` — exact scenic pins, leader lines and displaced watercolor cards
- `scenic-art/*.webp` — ten separate sharp watercolor scenic-highlight assets; no sprite is used
- `trip-data.js` — stops, media assignments and trip metadata
- `route-weather.js` — reconstructed Google Timeline route, distance and weather-memory layer
- `media/` — web photographs and MP4 videos
- `thumbs/` — gallery/video thumbnails

Vercel serves the HTML shell. The shell pins its static assets to one immutable GitHub commit, so CSS, JavaScript, data, scenic artwork and media are always loaded from the same release and cannot drift into mixed generations.

## Current reconstruction

- Trip dates: **9–15 August 2026** — 7 days / 6 nights.
- 57 supplied media files: 46 images and 11 short videos.
- 53 files contain usable GPS coordinates.
- Three originally undated/unlocated PNGs have been manually identified: two as **Vadstena** and one as **Ritamäki finngård**.
- One image remains genuinely unassigned: `67ABBC03-B9D2-46F7-A3E8-C7A3937F64AC.png`.
- The driving route uses Andrew’s Google Location History trace where recorded, with sparse gaps reconstructed in chronological order. It is an approximate reconstruction rather than an odometer reading.
- The current reconstructed total is approximately **1,550 km**.

## Map experience

The site uses **MapLibre** with a clean blue/green vector basemap. The route is drawn beneath map labels, with clockwise directional arrows, numbered overnight stays, separate clickable camera-count markers, watercolor scenic callouts, fullscreen mode, day filters and a map-overlay gallery.

Every scenic pin uses the canonical coordinate from `scenic-data.js`. `scenic-layout.js` contains no duplicate latitude/longitude values; it only specifies the permanent artwork file and the card offset. This prevents the art card and its exact geographic pin from drifting apart.

Scenic watercolor cards contain artwork and the scenic name only. Photo/video counts remain separate camera markers. Stockholm remains an overnight/city marker and is not a watercolor scenic highlight.

On the All-days overview, the six major watercolor cards are Håverud Aqueduct, Glava Glasbruk, Ritamäki finngård, Hovfjället, Vadstena and Gränna. Glaskogen, Fryksdalen, Tossebergsklätten and Klarälvdalen retain their exact pins and reveal their watercolor cards in the relevant day view.

## Weather memory

`route-weather.js` provides a day-by-day historical weather-memory layer. These values are intended to help recall the feel of each driving day and are labelled as historical reconstruction rather than certified point observations from a single station.

## Editing

Edit mode supports cover selection, media ordering, moving media between stops, hiding/restoring items, moving pins and reviewing the remaining unassigned media. Browser edits use `localStorage`; published corrections in `trip-data.js` remain canonical.

## Media

The web media set and permanent watercolor artwork are committed to `main`. The untouched iPhone originals are not modified.
