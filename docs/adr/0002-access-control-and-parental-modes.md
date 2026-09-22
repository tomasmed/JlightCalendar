# ADR 0002: 3-Tier Access Control & Parental PIN Mode

## Status
Accepted

## Context
Wall-mounted family calendars are positioned in common household areas (kitchen, hallway) and accessed by both adults and young children. Unrestricted access creates risks of children accidentally deleting parents' medical appointments, modifying meal plans, or tampering with sync accounts. Conversely, requiring adult password authentication for every touch ruins the frictionless experience of a wall calendar.

## Decision
Implement a **3-Tier Access Control Model** built into the display client and server validation:

1. **Admin Mode**:
   - Capabilities: Manage external calendar syncs, household settings, member profiles, meal plans, reward settings, and change Parent PINs.
   - Protection: Requires entering the Household Parent PIN (or OAuth parent session).
2. **Standard Mode**:
   - Capabilities: Everyday family operations—view all calendar views, mark chores complete, add items to grocery/shopping lists, create basic family events.
   - Protection: Open on the wall display during normal waking hours.
3. **Kid Mode**:
   - Capabilities: Ultra-simplified, safe kiosk interface. Displays the child's daily schedule, family overview, and allows checking off assigned chores. Deletions, edits, navigation to settings, and external links are strictly disabled.
   - Protection: Once toggled into Kid Mode, exiting back to Standard or Admin Mode requires entering the Parent PIN.

## Technical Implementation
- Client-side state stores current mode with session-level PIN validation.
- API routes validate whether requested actions (e.g. `DELETE /api/events/:id`, `POST /api/calendars/sync`) require Admin privileges before executing mutations.

## Consequences
- **Positive**: Children can safely interact with their chore checklists and view routines without any danger to sensitive family schedule data.
- **Negative**: Adds UI states and requires a secure PIN pad component that must be touch-friendly on wall screens.
