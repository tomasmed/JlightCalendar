# ADR 0017: Ephemeral Comets (Spin-Up / Spin-Down Calendars) & RFC 5545 `.ics` Portability Layer

- **Status**: Accepted
- **Date**: 2026-10-22

---

## 1. Context

JlightCalendar was originally designed around permanent household **Galaxies** protected by Google OAuth and 3-tier kiosk access control (`admin`, `standard`, `kid`). However, many real-world scheduling scenarios—such as coordinating a 2-week engineering sprint, setting up short meetings with teammates, or planning a weekend cabin trip with friends—are inherently **ephemeral** and benefit from:
1. **Zero-Auth Multiplayer Spin-Up**: Creating a lightweight shared calendar bundle (`events`, `listItems`, `galaxyMembers`) via a single capability code (`CMT-XXXX-XXXX`) or agent API call without forcing every participant through Google OAuth.
2. **Automatic Spin-Down (TTL)**: Expiring and cascade-deleting the temporary calendar bundle after its lifespan (default 5 months / 150 days, or 7/30/90 days) so database storage remains negligible.
3. **Dual-Surface UX Isolation**: Avoiding alienating core family wall-kiosk users by separating **Ephemeral Comets** (focused Calendar + Shared Lists view, no Kid Mode / Chores Star Store / Night Sleep hardware clutter) from permanent **Household Galaxies**.
4. **Open Portability (`.ics` Time-Window Exports)**: Allowing any participant to export events from `[Start Day X, End Day Y]` as a standard RFC 5545 `.ics` file for Google Calendar, Apple Calendar, or Microsoft Outlook, or promote/copy the Comet into a permanent Jlight Galaxy.

---

## 2. Decision

1. **Unified Bundle Root with Ephemeral Lifecycle Columns**:
   - Extend `galaxies` in `src/db/schema.ts` and `src/db/ensure-schema.ts` with:
     - `is_ephemeral` (`INTEGER NOT NULL DEFAULT 0`)
     - `expires_at` (`TEXT`, nullable ISO 8601 timestamp)
   - Use `CMT-XXXX-XXXX` codes (`generateCometCode()`) and URL-safe slugs (`generateCometSlug()`) for human-readable Comet identification.
2. **Lazy & Explicit Spin-Down (`purgeExpiredComets`)**:
   - Whenever Comets or Galaxies are queried, `purgeExpiredComets()` deletes any row where `is_ephemeral = 1 AND expires_at <= CURRENT_TIMESTAMP`, cascading across `events`, `list_items`, `chores`, `meal_plans`, `agent_keys`, `calendars`, and `galaxy_members`.
3. **Agentic Provisioning & Private Key Ownership (`POST /api/comets`)**:
   - Autonomous agents and unauthenticated guests can provision an Ephemeral Comet in a single `POST /api/comets` request, optionally seeding initial participants, events, and list items, and minting a scoped Agent PAT (`jlight_ag_...`) in one atomic round-trip.
4. **RFC 5545 `.ics` Portability Layer (`src/lib/ics.ts` & `GET /api/events/export`)**:
   - Implement a zero-dependency RFC 5545 serializer supporting bounded `[start, end]` date windows, participant filtering (`memberId`), and both expanded occurrence slices (`mode=expanded`) and recurring series preservation (`mode=rrule` with `RRULE` + `EXDATE`).
5. **Upgrade Bridges (`PATCH /api/comets`)**:
   - Support `action: "copy_to_galaxy"` (copies bounded events from a Comet into an existing permanent Galaxy) and `action: "convert_to_galaxy"` (promotes an Ephemeral Comet into a permanent OAuth-owned Household Galaxy).

---

## 3. Consequences

- **Positive**: Opens JlightCalendar to business, team sprint, and friend-group scheduling use cases + autonomous agent calendar orchestration without polluting the family wall kiosk UX.
- **Positive**: Standards-compliant `.ics` exports eliminate lock-in and allow seamless interoperability with Google Calendar, Apple iCloud Calendar, and Outlook.
- **Security**: Permanent Galaxies (`isEphemeral = false`) retain strict OAuth owner/member access control (`403 Forbidden` for non-members), while Ephemeral Comets act as capability-code spaces that automatically self-destruct after `expiresAt`.
