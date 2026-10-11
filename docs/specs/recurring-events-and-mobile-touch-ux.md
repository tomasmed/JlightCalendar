# Specification: Recurring Events & Mobile Responsive Touch UX

## 1. Recurring Events Scheduling & Expansion
- **Recurrence Frequencies**:
  - `none`: Does not repeat (single event).
  - `daily`: Repeats every single day (`FREQ=DAILY`).
  - `weekday`: Repeats Monday through Friday only (`FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`).
  - `weekly`: Repeats every 7 days on the same day of the week as the event start date (`FREQ=WEEKLY`).
  - `monthly`: Repeats every month on the same day of the month as the event start date (`FREQ=MONTHLY`).
- **Modal Controls**:
  - The `EventModal` features a dedicated **Repeat / Recurrence** dropdown with a `Repeat` icon.
  - Defaults to "Does not repeat".
  - Preserves selected recurrence rule when reopening existing recurring events.
- **Instance Expansion & Visual Indicators**:
  - `expandRecurringEvents()` expands recurring base events within the calendar's active viewing window.
  - Recurring occurrences display a subtle `Repeat` icon in Month view pills, Week view timetable cards, All-day banners, Day view cards, and Schedule list items.
  - Tapping any occurrence opens the parent recurring series (`baseEventId`) to edit or delete the entire series.

## 2. Local Wall-Clock Time & Duration Accuracy
- **Zero Timezone Drift**:
  - `computeEventTimes()` parses year, month, day, hour, and minute purely in local time.
  - Eliminates `.toISOString()` UTC conversion offset bugs where a 1-hour event expanded to 5 hours or 15 minutes converted to 225 minutes.
  - Durations of 15 min, 30 min, 45 min, 1 hr, 1.5 hrs, 2 hrs, etc., display with exact vertical pixel sizing (`height = (durationMinutes / 60) * 56px`).
- **Reopening & Duration Preservation**:
  - `computeDurationMinutes()` parses ISO date-time pairs accurately, preserving the duration dropdown selection across edit cycles.

## 3. Mobile Responsiveness & Navigation (Samsung Galaxy S24, Galaxy S26+)
- **Natural Swipe Navigation**:
  - Right-to-left swipe (`deltaX < -50`): Advances forward in time (next week / next month).
  - Left-to-right swipe (`deltaX > 50`): Moves backward in time (previous week / previous month).
- **Smooth 7-Day Timetable Scrolling**:
  - Day Headers, All-Day Banner, and 24-Hour Hour Grid are wrapped inside a single horizontal scroll container (`weekHorizontalScrollRef`).
  - Scrolling horizontally moves all columns in 100% synchrony without desynchronization.
  - Touching and dragging inside `.week-grid-scroll-area` allows free horizontal scrolling across Thursday, Friday, Saturday, and Sunday without accidentally switching weeks.
- **Mobile Quick Day Selector Strip**:
  - On screens narrower than `768px` (`md:hidden`), a 7-day quick jump bar (`MON`..`SUN`) sits at the top with `>= 44px-48px` touch targets.
  - Tapping any day button smoothly scrolls that day column into view.
  - On initial mount or week switch, the timetable automatically scrolls horizontally to display "Today".

## 4. Tablet, Kiosk, and Desktop Ergonomics
- **Breakpoints**:
  - `< md` (< 768px): Mobile timetable layout with Quick Day Selector and unified horizontal scrolling (`min-w-[770px]`), plus a **Two-Row Mobile Top Banner** (`KioskHeader`).
  - `>= md` (>= 768px): Tablet, Kiosk, and Desktop single-row header (`md:h-20 md:flex-row`) and full-width timetable (`md:min-w-0`), fitting all 7 days evenly without horizontal scrollbars.
- **Two-Row Mobile Top Banner (`KioskHeader`)**:
  - **Row 1 (`kiosk-header-row-1`)**: Hides the redundant kiosk live clock on `<640px` phones (`hidden sm:flex` on `kiosk-clock-display` since mobile OS status bars already display the live time), showing the compact Weather pill on the left and the Galaxy Switcher Dropdown on the right (`right-0 md:left-0`).
  - **Row 2 (`kiosk-header-row-2`)**: Separated by a subtle top border (`border-t border-cosmos-border/50 md:border-t-0`), displays the 3-Tier Access Mode button with an always-visible text label (`{accessMode} Mode`) and the User OAuth / Login button on the left, and the quick utility icon buttons (Theme Toggle, What's New Changelog, Night Sleep) on the right.
- **Mobile Split Month + Live Agenda View (`CalendarView`)**:
  - On narrow mobile viewports (`< 640px`), `CalendarView` defaults to `"month"` view and renders a split-screen layout:
    - **Upper Pane**: Compact 7-column monthly grid with constellation member indicator dots and a glowing highlight ring on the active selected date (`selectedAgendaDate`).
    - **Lower Pane (`mobile-month-agenda`)**: Live-synced scrollable day agenda showing full multi-member gradient event cards for the selected date, a quick jump to `Day View`, and an inline `+ Add Event` empty-state button—eliminating blocking modal popups when browsing dates.
- **2-Row Compact Calendar Toolbar & Sticky Week Time Axis**:
  - **Toolbar Row 1 (`calendar-toolbar-row-1`)**: Combines compact lateral navigation (`<`, `Today`, `>`), dynamic date range title, and the View Switcher (`Month`, `Week`, `Day`, `List`/`Schedule`).
  - **Toolbar Row 2 (`calendar-toolbar-row-2`)**: Full-width horizontally scrollable Family Member Constellation Filter strip (`.scrollbar-none`).
  - **Sticky Week Time Column**: In 7-day Week view, the left `TIME`, `ALL DAY`, and 24-hour label columns use `sticky left-0 z-20` so hour labels remain pinned while panning horizontally across days.
- **Thumb-Zone Floating Action Buttons (FAB) & Unified Chores Strip**:
  - On mobile (`< 640px`), top-bar `Add Event` and `Add Chore` buttons are replaced by thumb-friendly cosmic Floating Action Buttons (`mobile-add-event-fab` and `mobile-add-chore-fab`) anchored at `bottom-20 right-4` (automatically hidden in `kid` mode).
  - In `ChoresView`, member filter pills and star reward balances are merged into a single interactive strip (`chores-unified-filter-strip`) and chore cards display inline mobile star badges to maximize horizontal space for chore titles.
- **Touch Hit Target Compliance**:
  - All interactive buttons, inputs, day pills, and selectors adhere to the `>= 44px-48px` kiosk touch ergonomics requirement.


