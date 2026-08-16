# Andrew & Lisa’s Sweden Road Trip — August 2026

Interactive road-trip journal for **9–15 August 2026**.

**Live site:** https://roadtrip-august-2026.vercel.app

## Current reconstruction

- 57 supplied media files: 46 images and 11 short videos.
- 53 files contain usable GPS coordinates.
- Timestamped media in the supplied archive currently covers **9–11 August**.
- Overnight anchors are mapped for the complete trip through 15 August.
- Four PNG files have no usable GPS/date metadata and appear in the Unassigned tray.
- The home/Kungälv pin is currently approximate and can be refined in Edit mode.

## Editing

The current site includes an **Edit mode** for:

- drag-and-drop media ordering;
- choosing the cover/hero image for a stop;
- moving media between stops;
- soft-hiding/restoring media;
- renaming stops;
- dragging map pins to refine their coordinates.

Edits currently save in the browser via `localStorage` and can be exported as JSON. A shared database/backend is needed before edits automatically sync to every family member.

## Map

The embedded map uses OpenStreetMap/Leaflet so it works without a paid API key. Road geometry and distance are requested from OSRM when the page loads. Every stop also links directly to Google Maps.

The project can be switched to the Google Maps JavaScript API later if desired.

## Media

The complete web media set is committed in `main`:

- `media/` — web-optimised photographs and MP4 videos;
- `thumbs/` — gallery/video thumbnails.

The production Vercel page loads the versioned app assets and media from this public GitHub repository, keeping GitHub as the project’s source of truth.

The untouched iPhone originals are not modified by this project.

## Next data needed

The supplied archive has no timestamped GPS media for **12–15 August**. A later batch can extend the photographic reconstruction through Vintrosa, Stockholm, Vadstena and the return home.
