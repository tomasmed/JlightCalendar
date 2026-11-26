# Multi-Day All-Day Events Specification (v1)

## Overview
Multi-day all-day events allow households to schedule vacations, trips, school breaks, and multi-day visits that display as continuous "reserved" horizontal ribbons pinned at the top of calendar views without blocking hourly schedules.

## Data Model & Wall-Clock Semantics
- **Zero schema changes**: Uses existing `events.start_time`, `events.end_time`, and `events.is_all_day` columns.
- **v1 Scope**: Multi-day spans apply to all-day events (`isAllDay: true`).
- **Local Wall-Clock Representation (ADR 0013)**:
  - `startTime`: `"YYYY-MM-DDT00:00:00"` (inclusive start date)
  - `endTime`: `"YYYY-MM-DDT23:59:59"` (inclusive end date, clamped so `endDate >= startDate`)
- **RFC 5545 `.ics` Parity**:
  - Export uses exclusive `DTEND;VALUE=DATE` (next day after inclusive `endDate`).
  - Import converts exclusive `DTEND;VALUE=DATE` back to inclusive `T23:59:59`.
  - Windowed exports (`filterEventsForTimeWindow`) use overlap semantics (`eventStart <= rangeEnd && eventEnd >= rangeStart`).

## UI Behavior
1. **Event Modal (`src/components/event-modal.tsx`)**:
   - When `All-Day Event` is checked, displays **Start Date** and **End Date (Inclusive)** date pickers (`min={startDate}`) and a live badge (`"N Days Reserved"` when spanning 2+ days).
2. **Week View (`src/components/calendar-view.tsx`)**:
   - The `ALL DAY` strip above the 24-hour grid renders continuous 7-column CSS Grid spanning ribbons (`layoutSpanningWeekEvents`) with greedy lane packing, rounded start/end caps, and `‹`/`›` continuation markers across week boundaries.
   - Timed hourly slots remain completely unblocked.
3. **Month View (`src/components/calendar-view.tsx`)**:
   - Each 7-day week row overlays a dedicated top spanning-ribbon band capped at **2 visible lanes**.
   - Hidden spanning lanes and hidden timed events roll into a unified **`+N more`** overflow indicator per day cell; clicking opens the Day Overview modal with all events.
4. **Day View, Mobile Split Agenda & Day Overview Modal**:
   - Multi-day all-day events appear on every covered date (`eventCoversDate`) with a `"Day X of Y"` progress indicator (`getMultiDayProgressLabel`).
   - Day View pins all-day/reserved events in a dedicated top banner above the timed schedule.
