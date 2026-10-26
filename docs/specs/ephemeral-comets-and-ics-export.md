# Specification: Ephemeral Comets & RFC 5545 `.ics` Portability Layer

## 1. Overview
**Ephemeral Comets** are temporary, spin-up / spin-down multiplayer calendars in JlightCalendar designed for short-term team coordination, meetings, project sprints, and group trips. Unlike permanent **Household Galaxies** (which require Google OAuth and expose wall-kiosk controls like Kid Mode, Star Chores, and Night Sleep), **Comets** can be launched instantly without sign-in or provisioned autonomously by AI agents, and automatically spin down after their Time-To-Live (TTL, default 5 months / 150 days).

---

## 2. Data Model & Lifecycle

- **Table**: Stored in `galaxies` with:
  - `isEphemeral`: `true` (`1`)
  - `expiresAt`: ISO 8601 timestamp (selectable `7d`, `30d`, `90d`, or default `150d` / ~5 months)
  - `joinCode`: `CMT-XXXX-XXXX` (8 unambiguous CSPRNG characters)
  - `slug`: URL-safe human-readable identifier (e.g., `q4-product-sprint-sync-8k9a`)
- **Spin-Down**:
  - When `expiresAt <= now`, `purgeExpiredComets()` removes the Comet and all associated `events`, `list_items`, `galaxy_members`, `calendars`, and `agent_keys`.

---

## 3. API Endpoints

### 3.1 `POST /api/comets` — Spin Up an Ephemeral Comet
Creates a Comet bundle (with optional seeded participants, events, list items, and a minted `jlight_ag_...` Agent PAT).
- **Request Body**:
  ```json
  {
    "name": "Q4 Design Sprint",
    "creatorName": "Alex",
    "ttlDays": 150,
    "mintAgentToken": true,
    "initialParticipants": [{ "displayName": "Sam", "color": "#10b981" }],
    "initialEvents": [
      {
        "title": "Design Review",
        "date": "2026-11-03",
        "startTime": "2026-11-03T10:00:00",
        "endTime": "2026-11-03T11:00:00"
      }
    ]
  }
  ```
- **Response**: Returns `{ success: true, comet: { id, joinCode, slug, expiresAt, shareUrl, exportIcsUrl, members, events }, agentToken }`.

### 3.2 `GET /api/comets` — Resolve Comet Bundle
- Query by `?id=...`, `?code=CMT-XXXX-XXXX`, or `?slug=...`.
- Returns `404` / `410` if expired or spun down.

### 3.3 `PATCH /api/comets` — Upgrade & Galaxy Bridges
- `action: "convert_to_galaxy"`: Converts an Ephemeral Comet into a permanent OAuth-owned Household Galaxy (`isEphemeral = false`, `expiresAt = null`, `joinCode = GLX-...`).
- `action: "copy_to_galaxy"`: Copies events (optionally bounded by `startDate` and `endDate`) from a Comet into an existing permanent `targetGalaxyId`.
- `action: "extend_ttl"`: Extends `expiresAt` by `ttlDays`.

### 3.4 `DELETE /api/comets` — Spin Down
- `DELETE /api/comets?id=...`: Immediately spins down an ephemeral Comet.
- `DELETE /api/comets?action=purge_expired`: Purges all expired Comets.

### 3.5 `GET /api/events/export` — RFC 5545 `.ics` Export Layer
- Query parameters:
  - `galaxyId`: Galaxy/Comet UUID, `CMT-...` / `GLX-...` code, or slug.
  - `start` (`YYYY-MM-DD`): Optional start of export window.
  - `end` (`YYYY-MM-DD`): Optional end of export window.
  - `memberId`: Optional participant filter (`all` or specific `memberId`).
  - `mode`: `"expanded"` (expands recurring occurrences inside `[start, end]` while respecting `exdates`) or `"rrule"` (preserves `RRULE` and `EXDATE` properties).
- Returns standard `text/calendar; charset=utf-8` `.ics` file for import into Google Calendar, Apple Calendar, or Outlook.

### 3.6 `POST /api/events/import` — RFC 5545 `.ics` Import Layer
- Request Body (JSON, multipart/form-data, or raw text/calendar):
  - `galaxyId`: Target Galaxy UUID or joinCode.
  - `icsText` / `file`: Raw RFC 5545 `.ics` file content.
  - `memberId`: Optional Inhabitant to attribute imported events to (defaults to whole-family/shared).
  - `deduplicate`: Boolean flag (default `true`) to skip existing events matching `externalUid` or composite signature (`title__startTime`).
- Response:
  ```json
  {
    "success": true,
    "calendarName": "School & Sports Calendar",
    "totalFound": 12,
    "importedCount": 12,
    "skippedCount": 0,
    "events": [...]
  }
  ```
