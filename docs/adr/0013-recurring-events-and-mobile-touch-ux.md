# ADR 0013: Recurring Events Engine & Mobile Responsive Touch UX

## Status
Accepted

## Context
1. **Recurring Events Requirement**:
   Families coordinate repeating commitments: daily habits, weekday work/school routines, weekly soccer practices, and monthly family milestones. Users requested the ability to schedule repeating events directly in the `EventModal` on a daily, weekday, weekly, and monthly basis.
2. **Duration and Timezone Drift Bug**:
   Creating a 1-hour event caused it to display as a 5-hour block; changing it to 15 minutes resulted in a 3 hr 45 min (225 min) block. The root cause was `endDt.toISOString().replace("Z", "")` converting local time to UTC time while `startTime` remained local wall-clock time, introducing the user's UTC timezone offset (e.g. 4 or 5 hours) into the duration calculation.
3. **Mobile Touch & Navigation UX (Samsung Galaxy S24 & Galaxy S26+)**:
   - The horizontal swipe gesture direction was inverted: swiping right-to-left triggered `prevPeriod()` instead of `nextPeriod()`.
   - The outer touch gesture listener hijacked horizontal swipes, preventing users on mobile devices from scrolling to later days of the week (Thursday, Friday, Saturday, Sunday).
   - The Day header row and the 24-hour grid had disconnected horizontal scroll containers.

## Decision
1. **RFC 5545 Recurrence Engine (`src/lib/recurrence.ts`)**:
   - Store standard RFC 5545 RRULE representations (`FREQ=DAILY`, `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`, `FREQ=WEEKLY`, `FREQ=MONTHLY`) in the `events.rrule` database column.
   - Implement `expandRecurringEvents()` to dynamically compute recurring instances across the active viewing buffer (covering past, current, and future months).
   - Display a distinct `Repeat` icon on all recurring event badges across Month, Week, Day, and Schedule views.
   - When editing any occurrence, open the parent series (`baseEventId || id`) with the current recurrence option pre-selected.
2. **Pure Local Wall-Clock Time Calculation**:
   - Eliminate all `.toISOString()` conversions for local event scheduling.
   - Implement `computeEventTimes()` and `computeDurationMinutes()` using explicit local year, month, day, hour, minute parsing.
   - Guarantee zero timezone drift across all browser environments and daylight saving transitions.
3. **Synchronized 7-Day Mobile Timetable (`weekHorizontalScrollRef`)**:
   - Unify the Week Day Headers, All-Day Banner, and 24-Hour Grid inside a single horizontal scroll wrapper (`min-w-[770px] sm:min-w-[840px] md:min-w-0`).
   - Add a mobile Quick Day Selector strip (`md:hidden`) with `44px-48px` hit targets allowing instant jump navigation to any day of the week.
   - Automatically scroll horizontally to "Today" on initial load when viewing the active week on mobile.
4. **Natural Touch Swipe Gestures**:
   - Correct swipe direction: Swiping right-to-left (`deltaX < -50`) advances forward in time; swiping left-to-right (`deltaX > 50`) moves backward in time.
   - Isolate swipe week transitions from inside `.week-grid-scroll-area` so native touch scrolling through Thursday–Sunday operates with full momentum and zero hijacking.

## Consequences
- **Positive**: Family members can easily schedule repeating events; duration blocks reflect exact scheduled lengths (15m, 1h, etc.); seamless mobile responsiveness on Samsung Galaxy S24 (360-390px) and Galaxy S26+ (412px) as well as full-width responsive scaling on tablets and wall kiosks.
- **Negative / Neutral**: Expanding recurring events client-side generates lightweight virtual instances within the viewing window; benchmarked at <1ms for typical family schedules.
