# ADR 0004: Photo Screensaver Integration (Google Photos & Immich)

## Status
Accepted

## Context
Skylight Calendar's premium tier includes an ambient photo screensaver that turns the wall calendar into a digital photo frame when idle. Families store their digital memories across cloud ecosystems (primarily Google Photos) and self-hosted libraries (Immich, local network storage).

## Decision
Design the media provider interface as an extensible adapter pattern:

1. **Google Photos Integration**:
   - Leverages existing Google OAuth2 integration used for Google Calendar sync.
   - Queries Google Photos API / Picker API for designated family albums.
   - Periodically syncs album metadata and caches image URLs/thumbnails locally to minimize API rate limits.
2. **Immich & Local Directory**:
   - Support self-hosted Immich instances via API key.
   - Support scanning a mounted local directory (`./photos/` or NAS SMB/NFS share) for image files (`.jpg`, `.png`, `.webp`).
3. **Ambient Presentation**:
   - Smooth Ken Burns panning/fading effect.
   - Non-intrusive semi-transparent widget overlay: time, current weather, and next upcoming family event.

## Consequences
- **Positive**: Native integration with Google ecosystem that families already use, with full support for privacy-first self-hosters running Immich or local folders.
- **Negative**: Google Photos API requires handling token refreshes and rate limits.
