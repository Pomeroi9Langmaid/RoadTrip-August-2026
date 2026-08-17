# Lisa & Andrew’s Scenic Swedish Road Trip — August 2026

Interactive, map-first road-trip journal for **9–15 August 2026**.

**Live site:** https://roadtrip-august-2026.vercel.app

## Source of truth

The repository is intentionally simple. Production should deploy the same files that are in `main`; there are no production-only app files, no version-suffixed duplicates, and no commit-pinned `<base>` URL.

Canonical app files:

- `index.html` — page shell
- `app.js` — map, itinerary, gallery and edit interactions
- `styles.css` — main UI styling
- `map-fixes.css` — MapLibre positioning/readability corrections
- `callouts.js` / `callouts.css` — offset scenic annotation cards and leader lines
- `trip-data.js` — stops, media assignments and trip metadata
- `scenic-data.js` — scenic highlights, stay order and route anchors
- `route-weather.js` — reconstructed Google Timeline route, distance and weather-memory layer
- `media/` — web photographs and MP4 videos
- `thumbs/` — gallery/video thumbnails

## Current reconstruction

- Trip dates: **9–15 August 2026** — 7 days / 6 nights.
- 57 supplied media files: 46 images and 11 short videos.
- 53 files contain usable GPS coordinates.
- Three originally undated/unlocated PNGs have been manually identified: two as **Vadstena** and one as **Ritamäki finngård**.
- One image remains genuinely unassigned: `67ABBC03-B9D2-46F7-A3E8-C7A3937F64AC.png`.
- The driving route uses Andrew’s Google Location History trace where recorded, with sparse gaps reconstructed in chronological order. It is an approximate reconstruction rather than an odometer reading.
- The current reconstructed total is approximately **1,550 km**.

## Map experience

The site uses **MapLibre** with a clean blue/green vector basemap. The route is drawn beneath map labels, with clockwise directional arrows, numbered overnight stays, separate camera-count markers, scenic callouts, fullscreen mode, day filters and a map-overlay gallery.

Scenic callouts are deliberately offset from their exact geographic pins and connected with leader lines so the place itself remains readable.

## Weather memory

`route-weather.js` also provides a day-by-day historical weather-memory layer. These values are intended to help recall the feel of each driving day and are labelled as historical reconstruction rather than certified point observations from a single station.

## Editing

Edit mode supports cover selection, media ordering, moving media between stops, hiding/restoring items, moving pins and reviewing the remaining unassigned media. Browser edits use `localStorage`; published corrections in `trip-data.js` remain canonical.

## Media

The web media set is committed to `main`. The untouched iPhone originals are not modified.