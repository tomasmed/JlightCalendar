# 🖼️ Behavioral Specification: Ambient Photo & Album Screensaver

## 1. Overview
The Ambient Photo Screensaver turns any JlightCalendar wall kiosk or browser into a digital family photo frame backed by **Google Photos Shared Album links**, **Immich**, or **Curated 1080p Nature Stills**.

## 2. Architecture & Data Privacy
- **Config-Only Persistence (`galaxies.screensaver_config`)**:
  - Only the connector settings JSON is stored on the `galaxies` table in Turso/SQLite.
  - No user image binaries or per-photo rows are persisted in the database.
- **Resolution Cap (`<= 1080p`)**:
  - Google Photos CDN URLs are rewritten with `=w1920-h1080`.
  - Immich assets are requested via `/api/assets/:id/thumbnail?size=preview`.
- **Kiosk Browser Cache Vault**:
  - Playlists are capped at `maxCachedPhotos` (default `15`, configurable `10`, `15`, `25`, `50`).
  - The kiosk caches the playlist (`localStorage`, 6-hour TTL) and warms images into persistent browser `CacheStorage` (`jlight-screensaver-images-v1`) / HTTP cache so continuous 24/7 rotation requires zero repeat server compute.

## 3. Connectors & In-App User Training
Accessible via the **Album & Settings** button inside the Photos tab:
1. **Google Photos (Shared Album Link)**:
   - Accepts `https://photos.app.goo.gl/...` and `https://photos.google.com/share/...`.
   - Includes a step-by-step guide teaching users how to create a Shared Link in Google Photos.
   - Proxies Google Photos CDN assets via `/api/photos/proxy` without a `Referer` header to prevent `OpaqueResponseBlocking` in strict browsers.
2. **Immich**:
   - **Option A**: Paste an Immich Shared Album link (`https://your-immich/share/<key>`).
   - **Option B**: Provide an Immich Server URL, read-only API Key (`album.read`, `asset.view`), and optional Album ID.
   - SSRF validation blocks non-HTTP(S) schemes and cloud metadata hosts (`169.254.169.254`, `0.0.0.0`, etc.).
3. **Curated Ambient Horizons (Fallback)**:
   - Built-in 1080p landscape and portrait stills used by default or when a connector link is unreachable.

## 4. Visual Presentation & Kiosk Ergonomics
- **Gentle Slow Crossfade**: Double-buffered opacity transition (`1.5s`, `2.5s` default, or `4.0s`) without abrupt flashes or pulsing.
- **Portrait Blurred Ambient Fill**: Vertical photos (`height > width`) automatically render an uncropped centered foreground image over a soft `blur-2xl scale-110` ambient backdrop of the same photo.
- **Live HUD Widgets & Burn-in Protection**:
  - Displays live clock/date, weather badge, and the **real next upcoming event** from the active Galaxy's calendar.
  - Shifts HUD overlay coordinates by $\pm 2\text{px}$ every 10 minutes per ADR 0003.
  - All interactive buttons enforce a minimum `48px x 48px` touch target.
