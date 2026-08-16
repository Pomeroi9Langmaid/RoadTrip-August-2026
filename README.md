# Andrew & Lisa’s Sweden Road Trip — August 2026

Interactive road-trip journal for **9–15 August 2026**.

## Current reconstruction

- 57 supplied media files: 46 images and 11 short videos.
- 53 files contain usable GPS coordinates.
- Timestamped media in the supplied archive currently covers **9–11 August**.
- Overnight anchors are mapped for the complete trip through 15 August.
- Four PNG files have no usable GPS/date metadata and appear in the Unassigned tray.
- The home/Kungälv pin is currently approximate and can be refined in Edit mode.

## Editing

The current static preview includes an **Edit mode** for:

- drag-and-drop media ordering;
- choosing the cover/hero image for a stop;
- moving media between stops;
- soft-hiding/restoring media;
- renaming stops;
- dragging map pins to refine their coordinates.

Edits currently save in the browser via `localStorage` and can be exported as JSON. A shared database/backend is needed before edits automatically sync to every family member.

## Map

The on-page preview uses OpenStreetMap/Leaflet so it works without a paid API key. Road geometry and distance are requested from OSRM when the page loads. Every stop also links directly to Google Maps.

The project can be switched to the Google Maps JavaScript API once a browser-restricted Google Maps API key is available.

## Media

Web-optimised derivatives have been prepared for `media/` and `thumbs/`. They are not yet committed because the connected GitHub write API available in ChatGPT supports UTF-8 repository files but not binary uploads. The source code and complete trip/media manifest are already in `main`.

The untouched iPhone originals are not modified by this project.
