# ADR 0018: RFC 5545 `.ics` Calendar Import & Interoperability Layer

## Status
Accepted

## Context
In ADR 0017, JlightCalendar established an RFC 5545 `.ics` portability layer (`GET /api/events/export` and `src/lib/ics.ts`), allowing users to export time-bounded windows or complete recurring series into Google Calendar, Apple iCloud Calendar, Microsoft Outlook, and Proton Calendar.

However, calendar migration and interoperability is a two-way street. Families, schools, sports clubs, and teams frequently publish schedules as `.ics` files (e.g. school term calendars, Little League soccer schedules, work rotas, public holiday feeds). Maintainers and users need a standards-compliant, touch-ergonomic way to import events from external `.ics` files into their active Household Galaxy or Ephemeral Comet without duplicate clutter, timezone drift, or manual re-entry.

## Decision
1. **RFC 5545 Deserialization & Unfolding (`src/lib/ics.ts`)**:
   - Implemented `parseIcsCalendar(icsContent: string): ParsedIcsCalendar` supporting RFC 5545 folding and unfolding (`\r\n ` and `\n `), parameter parsing (`VALUE=DATE`, `TZID=...`), unescaping (`\n`/`\N`, `\,`, `\;`, `\\`), duration math (`DURATION` to minutes), and recurrence rule extraction (`RRULE` and `EXDATE`).
   - Safely isolates nested component blocks (e.g., `BEGIN:VALARM ... END:VALARM` and `BEGIN:VTIMEZONE ... END:VTIMEZONE`) to prevent alarm alarms or timezone parameters from polluting event descriptions.
   - Converts exclusive all-day `DTEND` dates per RFC 5545 (e.g., `DTSTART:20261111`, `DTEND:20261112`) to inclusive local end timestamps (`2026-11-11T23:59:59`) to eliminate multi-day bleed on wall kiosks.

2. **Dedicated REST API (`POST /api/events/import`)**:
   - Accepts `application/json`, `multipart/form-data` (file uploads), or `text/calendar` payloads.
   - Enforces actor permissions via `verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true })`.
   - Incorporates smart deduplication: detects existing events in the target Galaxy by `externalUid` or composite signature (`title__startTime`) to prevent duplicate records when re-importing updated calendars.
   - Allows optional assignment of all imported events to a specific family member/inhabitant, or sets them as shared whole-family events (`memberId = null`).
   - Returns structured metadata: `{ success: true, calendarName, totalFound, importedCount, skippedCount, events }`.

3. **Touch-Ergonomic UI (`ImportCalendarModal` & `KioskHeader`)**:
   - `ImportCalendarModal`: Provides dual input modes:
     - Drag-and-drop file upload zone with file picker.
     - Direct raw text paste for quick clipboard imports.
   - Previews parsed events (titles, timestamps, recurrence badges, and locations) before executing the import.
   - Includes a deduplication toggle checkbox and member assignment dropdown.
   - Adheres strictly to the `>= 48px x 48px` kiosk touch ergonomics and React Rules of Hooks AST requirements.
   - Added an ambient `Import .ics` button in `KioskHeader` adjacent to `Export .ics`.

4. **Agent & CLI Interoperability (`src/app/llms.txt/route.ts`)**:
   - Autonomous AI agents operating with `jlight_ag_...` PAT tokens can invoke `POST /api/events/import` directly to synchronize external schedules into family calendars.

## Consequences
### Positive
- Complete two-way calendar interoperability: users can seamlessly export and import `.ics` files between JlightCalendar and all major calendar platforms.
- Wall kiosks and family devices can ingest school and sports team schedules with a single click or drag-and-drop.
- Built-in deduplication prevents double-booking and duplicated events on re-import.
- Preserves recurrence rules and excluded dates (`EXDATE`) where applicable.

### Negative / Trade-offs
- Timezone handling assumes local wall-clock alignment when specific client offsets are omitted in external `.ics` files.
