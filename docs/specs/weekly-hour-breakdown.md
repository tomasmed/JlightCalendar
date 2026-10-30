# Specification: Default Weekly Calendar & 7-Day Hour-by-Hour Schedule View

## 1. Landing View & Week Navigation
- **Default View**:
  - On tablet, kiosk, and desktop viewports (`>= 640px`), the calendar initializes with `viewType = "week"` (on narrow `< 640px` mobile screens, it initializes to the split `"month"` + live agenda view).
  - The top view toggle allows users to switch between `Month`, `Week`, `Day`, and `Schedule` at any time.
- **Monday-to-Sunday Structure**:
  - The 7-day columns represent Monday through Sunday (`(day + 6) % 7`).
  - Column headers display the 3-letter abbreviation (`MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`) and numeric day pill.
  - The active day ("Today") is highlighted with a single-anchor focus badge.
- **Period Navigation**:
  - `<` and `>` shift the active week backward or forward by 7 days.
  - "Today" immediately jumps to the current system week.
  - Touch swipe left and right trigger lateral period navigation.

## 2. 24-Hour Timetable Grid
- **Hour Rows**:
  - 24 hourly rows (00:00 to 23:00 / 12 AM to 11 PM) with a row height of `56px` (`>= 48px` touch target compliance).
  - Left axis displays formatted 12-hour labels (`12 AM`, `1 AM` ... `12 PM`, `1 PM` ... `11 PM`).
  - Subtle half-hour dashed horizontal guideline inside each slot.
- **Smart Auto-Scroll**:
  - On mount or view switch to `"week"`, the container automatically scrolls to 7:00 AM (or 1 hour before the current hour if active daytime).
- **Current Time Marker**:
  - On the current day's column, a pulsing red/rose line marks the current hour and minute position in real time.

## 3. Event Spanning & Collision Layout
- **Visual Duration Spanning**:
  - Timed events calculate vertical position based on start minutes (`top = (startMinutes / 60) * 56px`).
  - Events span vertically based on duration (`height = (durationMinutes / 60) * 56px`).
  - Example: A 4-hour event (e.g. 1:00 PM – 5:00 PM) spans 224px across 4 full hour slots.
- **Color Attribution**:
  - Events render with an OSL Left-Lip stripe and directional glaze matching their assigned member(s), `Everyone` color, or custom color override.
- **Concurrent Overlapping Events**:
  - When two or more events overlap in time within the same day column, greedy graph coloring clusters them and allocates side-by-side sub-columns (`width: calc(100% / totalCols)`).
- **All-Day Events**:
  - Full-day events appear in a sticky banner row pinned between the day headers and the 24-hour grid.

## 4. Direct Touch Interactions
- **Click-to-Add**:
  - Tapping any empty hour cell opens `EventModal` with the clicked day and hour pre-filled.
- **Click-to-Edit**:
  - Tapping any event card opens `EventModal` to inspect, modify, or delete the event (single occurrence or full recurring series).
