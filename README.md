# Lisa & Andrew’s Scenic Swedish Road Trip — August 2026

Interactive, map-first road-trip journal for **9–15 August 2026**.

**Live site:** https://roadtrip-august-2026.vercel.app

## Current reconstruction

- 57 supplied media files: 46 images and 11 short videos.
- 53 files contain usable GPS coordinates.
- Timestamped GPS media in the supplied archive currently covers **9–11 August**.
- Overnight anchors are mapped for the complete trip through 15 August.
- Three originally undated/unlocated PNGs have now been manually identified: two as **Vadstena** and one as **Ritamäki finngård**.
- **One image remains genuinely unassigned:** `67ABBC03-B9D2-46F7-A3E8-C7A3937F64AC.png`.
- The home/Kungälv pin is currently approximate and can be refined in Edit mode.

## Map-first experience

The site is centred on the interactive map rather than a separate dashboard. It includes:

- a fullscreen map mode;
- the reconstructed driving route and day filters;
- visually distinct home, overnight, walking and media markers;
- a scenic-highlights layer inspired by the illustrated trip plan;
- highlighted places including Håverud, Glaskogen, Glava Glasbruk, Arvika, Fryksdalen, Tossebergsklätten, Hovfjället, Klarälvdalen, Ritamäki, Stockholm, Vadstena, Gränna and Kungälv;
- accommodation and Google Maps links opening in a new tab;
- photo/video counts on relevant stops;
- a gallery drawer and fullscreen media viewer that open over the map.

The basemap uses OpenStreetMap-derived cartography through Leaflet. Road geometry and distance are requested from OSRM when the page loads.

## Editing

**Edit mode** supports:

- drag-and-drop media ordering;
- choosing the cover/hero image for a stop;
- moving media between stops;
- soft-hiding/restoring media;
- renaming stops;
- dragging map pins to refine their coordinates;
- reviewing the remaining Unassigned tray, which is hidden from the normal family view.

Edits currently save in the browser via `localStorage` and can be exported as JSON. Published/manual corrections in `trip-data.js` are treated as canonical so stale browser data does not put already-corrected media back into Unassigned.

## Media

The complete web media set is committed in `main`:

- `media/` — web-optimised photographs and MP4 videos;
- `thumbs/` — gallery/video thumbnails.

The production Vercel page loads versioned app assets and media from this public GitHub repository, keeping GitHub as the project’s source of truth. The untouched iPhone originals are not modified.

## Next data needed

The supplied archive has no timestamped GPS media for **12–15 August**. Another batch can extend the photographic reconstruction through Vintrosa, Stockholm, Vadstena and the return home.
