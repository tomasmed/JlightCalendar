# ADR 0009: Galaxy Privacy Scoping, Join Codes & Landing Page Architecture

## Status
Accepted (Updated by [ADR 0019](./0019-hosted-service-first-agpl-and-pin-gate-removal.md))

## Context
With the introduction of multi-galaxy support (ADR 0007), all users could previously view and switch between all galaxies stored in the database due to an overly permissive fallback in `/api/galaxies` and unscoped queries in chores, meals, and lists. Additionally:
1. Users need strict privacy: their galaxies, calendars, events, chores, and lists must only be accessible to themselves and verified members of their specific galaxy.
2. Users need a simple, intuitive way to invite other authenticated users to join their galaxy (e.g. spouse, co-parent, grandparents) without exposing global directory listings.
3. The UI suffered from severe header clutter on desktop and mobile:
   - On desktop, non-wrapping flex containers caused the user profile and OAuth login button to be pushed off-screen.
   - On mobile, the OAuth login button was completely hidden (`hidden sm:flex`), and multiple elements overlapped screen edges.
4. Unauthenticated visitors were immediately dropped into an un-onboarded interface with sample/demo data rather than an inviting landing page explaining the system and prompting for sign-in.

## Decision

### 1. Strict Privacy Scoping & Multi-Tenancy
- **API Authorization**:
  - `GET /api/galaxies`: For authenticated users, strictly returns only galaxies where `galaxy.ownerId === userId` OR `galaxyMembers.userId === userId`. If an authenticated user has no galaxy yet, auto-provisions their personal galaxy on the fly.
  - For unauthenticated users, returns an empty list unless explicitly in demo sandbox mode (`?demo=true`), which returns only the isolated sample demo galaxy, or when accessing an active Ephemeral Comet (`?comet=CMT-...`).
  - Sub-resource endpoints (`/api/events`, `/api/chores`, `/api/meals`, `/api/lists`, `/api/galaxies/[id]/members`) verify authorization via `verifyGalaxyAccess(galaxyId, userId)`. If the user is neither owner nor member (and it is not the public demo space or an active Comet), access is rejected with `403 Forbidden`.
- **Component Data Scoping**:
  - `ChoresView`, `MealsView`, and `ListsView` accept `activeGalaxyId` and filter all queries and mutations strictly by the active galaxy.

### 2. Galaxy Join Code System
- Each Galaxy is assigned a unique, human-readable alphanumeric code (e.g., `GLX-7X9K2` or `SOL-HOME1`).
- Stored as `join_code` with a unique index on the `galaxies` table.
- An authenticated user can join any galaxy by entering its code via the `JoinGalaxyModal` (`POST /api/galaxies/join`).
- Upon verification, the user is added to `galaxy_members` with `role: "member"`, immediately gaining access to that galaxy's calendar, chores, meals, and lists.
- Direct invite links with query parameter `?join=GLX-CODE` automatically pre-populate the join modal upon arrival.

### 3. Starry Cosmos Landing Page
- Unauthenticated visitors are greeted with a high-fidelity landing page detailing JlightCalendar's core capabilities:
  - Smart Family Wall Calendar & Kiosk Ergonomics
  - Multi-Galaxy Isolation & Instant Ephemeral Comets (`CMT-XXXX-XXXX`)
  - Color-Coded People & Pet Profiles
  - Gamified Star Chore Quests
  - Real-Time Shared Meal Plans & Lists
  - RFC 5545 `.ics` Import & Export Interoperability
- Prominent **"Sign in with Google"** CTA, **"Start a Temporary Shared Calendar"** builder, and **"See Sample Calendar"** sandbox preview.

### 4. UI Ergonomics & Responsive Header
- **Desktop**: Prioritized 3-zone flex layout with responsive truncation so the user profile avatar and login status never overflow or get pushed off-screen.
- **Mobile (`< 768px`)**:
  - Streamlined two-row header displaying compact weather, galaxy switcher badge, user avatar/sign-in button, and quick utilities (Theme Studio, `.ics` Import/Export, Changelog, Night Sleep).
  - Minimum 48px touch targets for kiosk touchscreen compliance.
  - Uses `h-[100dvh] w-full max-w-[100vw]` to prevent dynamic address bar jumps and eliminate border clipping.
  - Mobile bottom navigation bar updated with safe-area insets.
  - Calendar month grid dynamically adapts rows (`grid-rows-5` or `grid-rows-6`) to prevent cell squashing or clipping.

## Consequences
- **Positive**: Complete privacy isolation across families; intuitive onboarding and galaxy sharing via join codes; clean, non-cluttered responsive presentation across phones, tablets, and wall displays.
- **Security**: Strict server-side authorization prevents unauthorized enumeration or data leaks.
