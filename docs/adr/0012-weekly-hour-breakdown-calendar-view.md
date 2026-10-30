# ADR 0012: Weekly Hour-by-Hour Breakdown Calendar View

## Status
Accepted

## Context
User feedback indicated that the default monthly calendar view was too high-level for daily family coordination on wall kiosks and mobile devices. Families need immediate visibility into who is doing what and when during each day of the active week. Specifically, users requested:
1. The calendar landing page should default to the **Weekly View** on tablet/desktop displays rather than the Monthly View.
2. The weekly view should feature an **hour-by-hour breakdown of each day in column form** (Monday through Sunday).
3. Events should visually span their full duration across active hours in their assigned orbital member color (e.g. a 4-hour event on Monday spans across 4 vertical hour rows).

## Decision
1. **Default Landing View**:
   - Set the initial desktop/tablet `viewType` state in `CalendarView` to `"week"` (with narrow `< 640px` mobile viewports defaulting to the split `"month"` + live agenda view).
   - Retain full view switching capability (`Month`, `Week`, `Day`, `Schedule`) in the top navigation bar.

2. **Monday-to-Sunday 7-Column Layout**:
   - Calculate the active week starting on Monday (`(day + 6) % 7`), displaying 7 daily columns: `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`.
   - Pin a sticky top header containing day name chips, date badges (with starlight glow for Today), and an **All-Day Events** banner row.

3. **24-Hour Vertical Timetable**:
   - Implement a 24-hour vertical timeline (12 AM – 11 PM) with standard `56px` row heights, fulfilling the `>= 48px` minimum hit target rule for wall touchscreen kiosks.
   - On initial mount or switch to week view, automatically scroll the timetable container to daytime hours (7:00 AM or current hour).
   - Display a live current time indicator line across today's column with a glowing pulse.

4. **Duration Spanning & Interval Collision Layout**:
   - Parse event start time and duration to calculate exact vertical offsets:
     - `top = (startMinutes / 60) * HOUR_HEIGHT`
     - `height = Math.max(26, (durationMinutes / 60) * HOUR_HEIGHT)`
   - Implement greedy interval graph clustering (`layoutDayEvents`) to dynamically partition concurrent overlapping events into side-by-side sub-columns (`left: calc(colIndex * 100% / totalCols)`).

5. **Direct Touch-to-Schedule**:
   - Tapping an empty hour slot in any day column directly opens the `EventModal` pre-populated with that day's date and the tapped hour, bypassing manual time input.

## Consequences
- **Positive**: Immediate, glanceable visibility into family member schedules, clear duration blocks, direct scheduling from any hour slot, and high touch ergonomics on wall displays.
- **Trade-offs**: 7 columns on very narrow screens require horizontal scrolling (`min-w-[770px] md:min-w-0`), which is handled via smooth synchronized scrolling while maintaining spacious column widths.
