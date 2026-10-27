# ADR 0004: Photo Screensaver Integration (Google Photos Shared Links, Immich & Kiosk Browser Cache)

## Status
Accepted (Updated for Serverless Vercel + Zero-Blob Turso Architecture)

## Context
Wall-mounted family calendars double as ambient digital photo frames when idle. Families store their digital memories across cloud ecosystems (primarily Google Photos) and self-hosted libraries (Immich).

Running on a serverless platform (Vercel) backed by Turso (libSQL) introduces three critical architectural constraints:
1. **Zero Image Binaries or Per-Photo Rows in Turso**: Storing raw image blobs or large per-photo asset tables in Turso creates content moderation liability and consumes database storage and row-read quotas rapidly.
2. **24/7 Kiosk Compute Hygiene**: A wall kiosk cycling a photo every 15–30 seconds renders thousands of slides per day. Re-invoking serverless compute or querying Turso on every slide transition would burn serverless execution quotas continuously.
3. **1080p Resolution Ceiling & Portrait Framing**: Wall kiosks do not require 4K/RAW camera files (`<= 1080p` is ideal), and vertical phone portraits (`9:16`) displayed on horizontal wall kiosks (`16:9`) need an ambient blurred backdrop fill rather than awkward face-cropping.

## Decision
Design a stateless connector resolver paired with a **Client-Side Kiosk Browser Cache Vault**:

1. **Connector-Only Configuration in Turso (`galaxies.screensaver_config`)**:
   - Turso stores **only** a compact JSON configuration string on the `galaxies` row (`provider`, `googlePhotosShareUrl`, `immichShareUrl`, `immichBaseUrl`, `maxCachedPhotos`, `slideIntervalSeconds`, `transitionDurationMs`, `portraitFillMode`, `brightnessPercent`, and widget toggles).
   - Zero image binaries and zero per-photo metadata rows are stored in Turso.
   - Storing the connector configuration on the `galaxies` row allows a parent to paste a long shared album URL on their phone or laptop and have the wall kiosk pick it up automatically.
2. **Google Photos Shared Album Link Connector**:
   - Users paste a Google Photos Shared Album link (`https://photos.app.goo.gl/...` or `https://photos.google.com/share/...`), guided by an in-app 3-step training walkthrough.
   - `GET /api/photos` resolves the shared album page, extracts `lh3.googleusercontent.com` photo URLs, and rewrites them with `=w1920-h1080` so the kiosk fetches `<= 1080p` images directly from Google's CDN.
3. **Immich Connector (`size=preview` 1080p Proxy)**:
   - Supports both **Immich Shared Album Links** (`/share/<key>`) and **Server URL + API Key** (`/api/albums/:id`).
   - `/api/photos/proxy` streams Immich's `size=preview` (1080p) thumbnail with strict `image/*` content-type validation, an 8 MB safety ceiling, SSRF host filtering, and aggressive Edge/Browser caching headers (`Cache-Control: public, max-age=604800, s-maxage=86400, stale-while-revalidate=604800, immutable`).
4. **Kiosk Browser Cache Vault (`CacheStorage` + `localStorage` Playlist TTL)**:
   - Each galaxy rotation is capped at `maxCachedPhotos` (default `15` images, configurable `10`–`50`).
   - The kiosk browser caches the resolved playlist in `localStorage` (6-hour TTL) and warms the 1080p image blobs in the browser's persistent `CacheStorage` (`jlight-screensaver-images-v1`) / HTTP disk cache.
   - During 24/7 playback, rotating from photo 1 through 15 and looping back executes 100% locally in the browser with **zero** Vercel serverless invocations and **zero** Turso reads.
5. **Ambient Presentation & Display Hygiene**:
   - Double-buffered gentle slow crossfade (`2500ms` default, no harsh pulsing/dimming).
   - Automatic portrait photo detection (`height > width`) with a **blurred ambient background fill** (`blur-2xl scale-110`) behind the uncropped centered portrait.
   - Live upcoming family event widget wired to the active Galaxy's real schedule, paired with $\pm 2\text{px}$ burn-in pixel shifting every 10 minutes (ADR 0003).

## Consequences
- **Positive**: Zero user image binaries stored in Turso; zero ongoing Vercel compute during 24/7 slideshow rotation; frictionless Google Photos & Immich setup with in-app user training.
- **Negative**: Google Photos shared album links require link-sharing to remain enabled on the user's selected album.
