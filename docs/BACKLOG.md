# 📋 JlightCalendar — Feature & Architecture Backlog

This backlog tracks prioritized epics, features, and engineering tasks for **JlightCalendar**. It is structured so that autonomous AI agents and human maintainers can pick items off the queue, branch into an isolated git worktree (`.worktrees/feat-<task-name>`), implement the task, and submit a "Show & Tell" PR against `main`.

---

## 🌌 Epic 1: Multi-Household & Account Switcher (Family & Grandparents)
**Goal**: Allow a single authenticated user to belong to multiple household calendars (e.g. "Our Immediate Family", "Grandparents & Extended Family", "Co-Parenting Schedule") and effortlessly switch between them on both web and wall displays.

- [x] **FEAT-101: Household & Galaxy Membership Domain Model**
  - **Description**: Add `users`, `accounts`, `galaxies`, and `galaxy_members` tables linking authenticated Google accounts and unlinked profiles (kids, pets like Java) to collaborative Galaxy calendars.
  - **Acceptance Criteria**: Queries return user's accessible Galaxies; permissions enforced by role (`admin`, `member`, `kid`, `pet`).
- [x] **FEAT-102: Kiosk & Mobile Calendar Galaxy Switcher Component**
  - **Description**: Add celestial dropdown in the Kiosk Header to switch active Galaxy context with smooth transitions, plus on-click event management and inhabitant management modal.
  - **Acceptance Criteria**: Switching Galaxy updates calendar instances, events, and member filters dynamically without full page reload.

---

## 🔄 Epic 2: Multi-Calendar Sync Engine (Google, Apple, Outlook, iCal)
**Goal**: Connect multiple Google Calendars (Mom's work/personal, Dad's personal, School activities) and external feeds into one unified family HUD.

- [ ] **FEAT-201: Google Calendar OAuth2 Flow**
  - **Description**: Implement Google OAuth2 authentication flow with `https://www.googleapis.com/auth/calendar` scopes. Store encrypted refresh tokens per connection.
  - **Acceptance Criteria**: User connects their Google account; system retrieves calendar list and lets user select which Google calendars to sync.
- [ ] **FEAT-202: Multi-Google Calendar Aggregation & Member Mapping**
  - **Description**: Allow linking multiple distinct Google accounts/calendars to different family members (e.g. map "Mom's Work GCal" to Mom's pink badge).
  - **Acceptance Criteria**: Events from multiple Google accounts render simultaneously with their respective member colors.
- [ ] **FEAT-203: Two-Way Synchronization & Conflict Resolution**
  - **Description**: When an event is created or edited on the wall tablet, push to Google Calendar API; background polling with `syncToken` pulls updates every 5–15 minutes.
  - **Acceptance Criteria**: An event added on a phone's Google Calendar app appears on the wall display; an event moved on the wall display updates in Google Calendar.
- [ ] **FEAT-204: Apple iCloud CalDAV Integration**
  - **Description**: CalDAV protocol support with Apple App-Specific passwords for iCloud calendars.
- [ ] **FEAT-205: Webcal / ICS Public URL Subscriptions**
  - **Description**: Subscribe to read-only ICS URLs (e.g. Little League, soccer club, school district holidays) with automatic background refreshing.

---

## 📺 Epic 3: Wall Kiosk Device Pairing & Kiosk Management
**Goal**: Secure, frictionless setup for physical tablets mounted on walls without typing passwords.

- [ ] **FEAT-301: 6-Digit PIN / QR Code Pairing Screen**
  - **Description**: Unlinked display generates a random 6-digit pairing code and QR code pointing to `/pair?code=...`.
  - **Acceptance Criteria**: Unauthenticated kiosk boots into pairing screen; scanning with phone links the device to the selected household.
- [ ] **FEAT-302: Device Management Dashboard (Admin)**
  - **Description**: Under Settings > Devices, show all paired wall tablets (battery level, online status, active mode, night sleep settings) with remote unpair capability.

---

## 🌟 Epic 4: Chores & Gamification (Kid Mode & Star Store)
**Goal**: Motivate children with gamified routines, streaks, and a family reward redemption store.

- [ ] **FEAT-401: Recurring Chores Engine & Due Schedules**
  - **Description**: Expand chore engine to support "Morning Routine", "After School", "Bedtime", and specific day of week rotations.
- [ ] **FEAT-402: Family Star Store / Rewards Ledger**
  - **Description**: Allow parents to set up custom rewards (e.g., "30 Stars = Ice Cream Trip", "50 Stars = 1hr Extra Screen Time"). Kids can redeem stars with parent PIN approval.
- [ ] **FEAT-403: Sound & Particle Celebrations**
  - **Description**: Add celebratory chime audio (customizable/mutable) and confetti/starburst particle effects on chore check-off for wall kiosks.

---

## 🍽️ Epic 5: Meal Planning & Smart Recipe Box
**Goal**: Weekly meal coordination with automated grocery list integration.

- [ ] **FEAT-501: Recipe Box & Web Importer**
  - **Description**: Store recipes with ingredients, preparation notes, and links. Allow pasting recipe URLs (schema.org/Recipe JSON-LD scraper) to auto-import ingredients.
- [ ] **FEAT-502: 1-Click Grocery Ingredient Integration**
  - **Description**: Button to parse recipe ingredients and push missing items directly to the shared grocery list categorized by aisle/store department.

---

## 🛒 Epic 6: Real-Time Shared Lists & Offline Sync
**Goal**: Instant synchronization between wall display and mobile companion devices.

- [ ] **FEAT-601: Server-Sent Events (SSE) Sync Bus**
  - **Description**: Implement SSE endpoint `GET /api/sync/stream?householdId=...` to broadcast change notifications when items are checked or added.
  - **Acceptance Criteria**: Checking an item on a phone reflects on the wall tablet in under 1 second.
- [ ] **FEAT-602: Aisle & Store Categorization for Grocery Lists**
  - **Description**: Smart categorization (Produce, Dairy, Meat, Pantry, Frozen, Household) with drag-and-drop ordering.

---

## 🖼️ Epic 7: Ambient Photo Screensaver & Media
**Goal**: Digital photo frame with ambient widgets.

- [x] **FEAT-701: Google Photos Integration**
  - **Description**: Connect to Google Photos Library API to select specific family albums for ambient slideshow rotation.
- [x] **FEAT-702: Immich & Local Media Folder Adapter**
  - **Description**: Support connecting to self-hosted Immich instances or a mounted local directory of family photos.
- [x] **FEAT-703: Ambient Widget Customizer**
  - **Description**: Configure what overlays appear on the screensaver (live clock, weather forecast, countdowns, next upcoming event).

---

## 🔮 Epic 8: Magic Import (V2 Post-MVP)
**Goal**: AI-driven document and flyer ingestion.

- [ ] **FEAT-801: Vision / OCR Flyer Ingestion**
  - **Description**: Upload photo or PDF of a school sports schedule or flyer; extract dates, times, and titles and present a review modal before saving to calendar.
