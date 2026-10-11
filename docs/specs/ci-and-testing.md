# Specification: CI Pipeline & Automated Test Suite

## Overview

JlightCalendar enforces a fast, zero-external-dependency Continuous Integration (CI) suite via GitHub Actions (`.github/workflows/ci.yml`) and local npm scripts (`npm run test`, `npm run test:unit`, `npm run test:system`, `npm run build`).

---

## 1. GitHub Actions Workflow (`.github/workflows/ci.yml`)

- **Triggers**:
  - `push` to `main`, `feat/**`, `fix/**`, and `chore/**` branches.
  - `pull_request` targeting `main`.
- **Steps**:
  1. `npm ci` (with Node.js 22 and npm caching).
  2. `npm run test:unit` — Runs `tests/unit.test.ts`.
  3. `npm run test:system` — Runs `tests/system.test.ts`.
  4. `npm run build` — Runs Next.js production build & TypeScript typecheck.

---

## 2. Unit & Static AST Guard (`tests/unit.test.ts`)

1. **React Rules-of-Hooks AST Scanner (`findHooksAfterEarlyReturn`)**:
   - Uses the TypeScript compiler AST (`ts.createSourceFile`) to inspect every `.ts` and `.tsx` file under `src/`.
   - Fails immediately if any React Hook (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useSession`, etc.) is called after an early `return` statement in the same component/function body.
2. **Recurrence & Duration Engine**:
   - Verifies RFC 5545 RRULE conversions (`daily`, `weekday`, `weekly`, `biweekly`, `monthly`), zero-timezone-drift wall-clock ISO formatting, `expandRecurringEvents`, and `exdates` single-occurrence exclusion.
3. **Calendar View Helpers**:
   - Verifies multi-member `memberIds` parsing, inhabitant color resolution, diagonal CSS split gradients, and overlapping event column layout (`layoutDayEvents`).

---

## 3. Mocked Database & System Integration Suite (`tests/system.test.ts`)

Runs with `JLIGHT_TEST_MODE="true"` and an isolated SQLite database (`file:./.tmp-system-test.db`):
1. **Database Provisioning**:
   - Applies all SQL migrations in `drizzle/` via `drizzle-orm/libsql/migrator` and runs `ensureDatabaseSchema()`.
2. **User & Galaxy Lifecycle**:
   - Creates multiple test users (`Captain Alice` and `Commander Bob`).
   - Tests auto-provisioning of a user's default galaxy (`GET /api/galaxies`) and creation of a custom shared galaxy (`POST /api/galaxies`).
   - Tests adding Kid and Pet inhabitants (`POST /api/galaxies/[id]/members`) and updating Whole-Family Identity (`PATCH /api/galaxies`).
3. **Galaxy Privacy & Join Code Flow**:
   - Verifies unjoined users receive `403 Forbidden` when querying a private galaxy.
   - Joins the galaxy as a second user via `POST /api/galaxies/join` using the generated `GLX-XXXXX` join code, including idempotent re-join verification.
4. **Events Lifecycle (All Event Types & Deletions)**:
   - Creates single timed, all-day whole-family, multi-member shared, daily, weekday, weekly, biweekly, and monthly recurring events (`POST /api/events`).
   - Updates events (`PATCH /api/events`).
   - Deletes a single occurrence of a recurring event (`DELETE /api/events?id=...&exdate=YYYY-MM-DD`) and verifies `expandRecurringEvents` excludes that date while preserving the series.
   - Deletes an entire recurring series and a non-recurring event (`DELETE /api/events?id=...`).
5. **Chores & Star Gamification Lifecycle**:
   - Creates chores across frequencies (`daily`, `weekly`, `biweekly`, `one_time`), toggles completion to award stars (`PATCH /api/chores`), edits chore metadata (`PUT /api/chores`), and deletes chores (`DELETE /api/chores`).
6. **Shared Lists Lifecycle**:
   - Creates grocery and packing list items (`POST /api/lists`), toggles completion (`PATCH /api/lists`), clears completed items (`DELETE /api/lists?action=clear-completed`), and deletes individual items (`DELETE /api/lists?id=...`).

---

## 4. Requirement for New Core Features

Whenever a developer or autonomous agent adds a new core feature or fixes a bug:
1. Add unit test assertions in `tests/unit.test.ts` for any new helper functions, state logic, or UI data transformations.
2. Add end-to-end API/database assertions in `tests/system.test.ts` for any new or modified API endpoints or schema columns.
