# Specification: General Improvements, Date Sync, Weather & Multi-Device UX

## 1. Calendar Real-Time Synchronization & Navigation

- **Live Date Sync**:
  - The calendar view initializes to the active system date (`new Date()`).
  - The "Today" highlight dynamically matches the actual date displayed in the kiosk clock.
  - Tapping "Today" returns navigation to the current date regardless of active view.
- **Dynamic Week & Day Views**:
  - Switching to "Week" view dynamically calculates the 7 calendar days of the active week (Sunday to Saturday).
  - Lateral navigation buttons (`<` and `>`) shift backward/forward by 7 days in Week view, by 1 day in Day view, and by 1 month in Month view.
  - Header displays accurate week ranges (e.g. `Week of Sep 20 – Sep 26, 2026`).
- **Touch Swipe Gestures**:
  - Horizontal swiping on touchscreen devices triggers navigation:
    - Swipe Right (> 50px delta): triggers next period (`nextPeriod`), mirroring the forward chevron.
    - Swipe Left (> 50px delta): triggers previous period (`prevPeriod`), mirroring the backward chevron.

## 2. Ambient Weather Integration

- **Real-Time Data**:
  - Automatically fetches current temperature and WMO weather condition from Open-Meteo API.
  - Detects location via IP geolocation with fallback to Eastern Time / NYC default.
  - Maps WMO codes to Lucide icons (Sun, CloudSun, CloudRain, Snowflake, CloudLightning, Moon).
- **Weather.com Redirection**:
  - Weather pill functions as an interactive touch link.
  - On click/tap, opens `https://weather.com/weather/today/l/${lat},${lon}` in a new tab.

## 3. Database Persistence & Family Member Attribution

- **Chores**:
  - Chores are loaded from `/api/chores` and assigned to family members.
  - Tapping a chore toggles completion status in the database and atomically updates the member's star balance.
  - Chores can be filtered by family member chip.
- **Lists**:
  - Grocery and todo items are stored in SQLite and loaded from `/api/lists`.
  - Items display who added them (with family member avatar/color dot).
  - Batch "Clear Completed" deletes completed items from the database.
- **Meals**:
  - Weekly meal planner loads from `/api/meals`.
  - Dinners display assigned family cook/chef.
  - "+ Grocery List" button writes dinner ingredients directly into `list_items` table in SQLite.

## 4. Multi-Device Ergonomics

- **Mobile Viewport (~Samsung Galaxy S26 / 412px)**:
  - Top header is streamlined (clock, compact date, household badge, compact weather utility, mode button).
  - Central navigation tabs shift to a fixed bottom navigation bar (`MobileNavBar`) with >= 48px touch targets.
  - Monthly calendar cells render crisp horizontal micro-bars (`h-1.5 rounded-[2px]`) in each member's adapted color instead of wrapped text pills, with instant tap-to-inspect Day Overview.
- **Tablet & Wall Kiosk (~iPad / 768px - 1280px)**:
  - Top kiosk header retains full tab bar with archetype-aware `.theme-focus-pill` active states.
  - Monthly calendar cells render full OSL Left-Lip event pills with time and title.
  - All interactive buttons maintain >= 48px hit targets.

## 5. Material Archetype Theme Studio & Hue-Preserving Member Colors

- **9 Curated Palettes Across 2 Archetypes**:
  - **Super Creamy (Matte PBT Keycaps)**: `mocha` (Default), `matcha`, `oat`, and `latte` (Daylight).
  - **Cyberpunk & Seasonal OSL (Fluorescent Light-Spill)**: `over-volt-blue`, `yakuza-purple`, `red-dragon`, `neon-green`, and `halloween` (All Hallows).
- **Per-Device Persistence**:
  - Stored in `localStorage` under `jlight_app_theme` (`milky-way` automatically aliases to `mocha`).
- **Hue-Preserving Member Color Adaptation**:
  - Family member colors preserve their semantic hue ($H$) while adapting saturation, lightness, and Mother-Color undertone across Creamy Dark, Creamy Daylight, and Cyberpunk OSL themes.

