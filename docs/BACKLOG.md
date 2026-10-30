# 📋 JlightCalendar — Feature & Architecture Backlog

This backlog tracks prioritized epics, features, and engineering tasks for **JlightCalendar**. It is structured so that autonomous AI agents and human maintainers can pick items off the queue, branch into an isolated git worktree (`.worktrees/feat-<task-name>`), implement the task, and submit a "Show & Tell" PR against `main`.

---

## 🌌 Epic 1: Multi-Household & Account Switcher (Family & Grandparents)
**Goal**: Allow a single authenticated user to belong to multiple household calendars (e.g. "Our Immediate Family", "Grandparents & Extended Family", "Co-Parenting Schedule") and effortlessly switch between them on both web and wall displays.

- [x] **FEAT-101: Household & Galaxy Membership Domain Model**
  - **Description**: Add `users`, `accounts`, `galaxies`, and `galaxy_members` tables linking authenticated Google accounts and unlinked profiles (kids, pets like Java) to collaborative Galaxy calendars.
  - **Acceptance Criteria**: Queries return user's accessible Galaxies; permissions enforced via Google OAuth ownership/membership or Ephemeral Comet capability codes.
- [x] **FEAT-102: Kiosk & Mobile Calendar Galaxy Switcher Component**
  - **Description**: Add celestial dropdown in the Kiosk Header to switch active Galaxy context with smooth transitions, plus on-click event management and inhabitant management modal.
  - **Acceptance Criteria**: Switching Galaxy updates calendar instances, events, and member filters dynamically without full page reload.

---

## 🔄 Epic 2: Multi-Calendar Sync & Interoperability (Google, Apple, Outlook, `.ics`)
**Goal**: Seamless import, export, and synchronization between JlightCalendar and external calendar ecosystems.

- [x] **FEAT-200: RFC 5545 `.ics` Two-Way Export & Import Layer**
  - **Description**: Full RFC 5545 `.ics` time-window export (`GET /api/events/export`) and drag-and-drop/raw-paste import (`POST /api/events/import`) with lossless metadata persistence and automated deduplication.
- [ ] **FEAT-201: Google Calendar Direct OAuth2 Sync Flow**
  - **Description**: Implement Google OAuth2 authentication flow with `https://www.googleapis.com/auth/calendar` scopes. Store encrypted refresh tokens per connection.
  - **Acceptance Criteria**: User connects their Google account; system retrieves calendar list and lets user select which Google calendars to sync.
- [ ] **FEAT-202: Multi-Google Calendar Aggregation & Member Mapping**
  - **Description**: Allow linking multiple distinct Google accounts/calendars to different family members (e.g. map "Mom's Work GCal" to Mom's badge).
  - **Acceptance Criteria**: Events from multiple Google accounts render simultaneously with their respective member colors.
- [ ] **FEAT-203: Two-Way Synchronization & Conflict Resolution**
  - **Description**: When an event is created or edited on the wall tablet, push to Google Calendar API; background polling with `syncToken` pulls updates every 5–15 minutes.
- [ ] **FEAT-205: Live Webcal / `.ics` Public URL Subscriptions**
  - **Description**: Subscribe to read-only `.ics` URLs (e.g. Little League, soccer club, school district holidays) with automatic background refreshing.

---

## 📺 Epic 3: Wall Kiosk Device Pairing & Kiosk Management
**Goal**: Optional zero-typing pairing flow for dedicated wall tablets connected to the hosted Jlight service.

- [ ] **FEAT-301: 6-Digit Code / QR Code Kiosk Pairing Screen**
  - **Description**: Unlinked display generates a pairing code and QR code pointing to `/pair?code=...` (similar to `BOT-XXXX` device handshake in ADR 0015).
  - **Acceptance Criteria**: Scanning with an authenticated phone links the wall tablet browser session to the selected household Galaxy.
- [ ] **FEAT-302: Device Management Dashboard**
  - **Description**: Show paired wall tablets (online status, night sleep settings) with remote unpair capability.

---

## 🌟 Epic 4: Chores & Gamification (Star Quests & Rewards)
**Goal**: Motivate children and household members with gamified routines, streaks, and a family reward redemption store.

- [x] **FEAT-401: Recurring Chores Engine & Star Balances**
  - **Description**: Create, edit, complete, and filter chores (`daily`, `weekly`, `biweekly`, `one_time`) with real-time star reward balances per inhabitant.
- [ ] **FEAT-402: Family Star Store / Rewards Ledger**
  - **Description**: Allow families to set up custom rewards (e.g., "30 Stars = Ice Cream Trip", "50 Stars = Movie Night Pick") and redeem stars.
- [ ] **FEAT-403: Sound & Particle Celebrations**
  - **Description**: Add celebratory chime audio (customizable/mutable) and confetti/starburst particle effects on chore check-off for wall kiosks.

---

## 🍽️ Epic 5: Meal Planning & Smart Recipe Box
**Goal**: Weekly meal coordination with automated grocery list integration.

- [x] **FEAT-500: Weekly Meal Planner & 1-Click Grocery Sync**
  - **Description**: Plan weekly breakfasts, lunches, dinners, and snacks with chef attribution and 1-click syncing to the shared grocery list.
- [ ] **FEAT-501: Recipe Box & Web URL Importer**
  - **Description**: Store recipes with ingredients, preparation notes, and links. Allow pasting recipe URLs (`schema.org/Recipe` JSON-LD scraper) to auto-import ingredients.

---

## 🛒 Epic 6: Real-Time Shared Lists
**Goal**: Instant synchronization between wall display and mobile companion devices.

- [ ] **FEAT-601: Server-Sent Events (SSE) Sync Bus**
  - **Description**: Implement SSE endpoint `GET /api/sync/stream?galaxyId=...` to broadcast change notifications when items are checked or added.
  - **Acceptance Criteria**: Checking an item on a phone reflects on the wall tablet in under 1 second.
- [ ] **FEAT-602: Aisle & Store Categorization for Grocery Lists**
  - **Description**: Smart categorization (Produce, Dairy, Meat, Pantry, Frozen, Household) with drag-and-drop ordering.

---

## 🖼️ Epic 7: Ambient Photo Screensaver & Media
**Goal**: Digital photo frame with ambient widgets and zero-compute browser caching.

- [x] **FEAT-701: Google Photos Shared Album Connector**
  - **Description**: Connect Google Photos Shared Album links (`photos.app.goo.gl`) with 1080p CDN rewriting (`=w1920-h1080`), referer-free proxy, and step-by-step in-app user training.
- [x] **FEAT-702: Immich Connector & Kiosk Browser Cache Vault**
  - **Description**: Connect Immich shared links or API keys via `/api/photos/proxy` (`size=preview`) and cache playlists in browser `CacheStorage` / `localStorage` for zero-compute 24/7 rotation.
- [x] **FEAT-703: Ambient Widget Customizer & Portrait Fill**
  - **Description**: Configure screensaver overlays (live clock, weather forecast, next upcoming event), portrait blurred background fill, and burn-in pixel shifting.

---

## 🔮 Epic 8: Magic Import (V2 Post-MVP)
**Goal**: AI-driven document and flyer ingestion.

- [ ] **FEAT-801: Vision / OCR Flyer Ingestion**
  - **Description**: Upload photo or PDF of a school sports schedule or flyer; extract dates, times, and titles and present a review modal before saving to calendar.
