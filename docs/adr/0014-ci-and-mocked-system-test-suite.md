# ADR 0014: GitHub Actions CI & Mocked Database System Test Suite

- **Status**: Accepted
- **Date**: 2026-10-11
- **Context**: Autonomous agent development requires fast, deterministic automated safeguards in Continuous Integration (CI) to prevent both client-side React lifecycle crashes (such as calling a React Hook after an early `if (!isOpen) return null;`) and backend API/database regressions across multi-user galaxies, events, chores, and lists.

---

## Decision

We have established a 3-stage automated CI pipeline in `.github/workflows/ci.yml` powered by zero-external-dependency TypeScript test runners (`tsx`):

1. **Unit Tests & TypeScript AST React Rules-of-Hooks Guard (`npm run test:unit` / `tests/unit.test.ts`)**:
   - Uses the TypeScript Compiler API (`ts.createSourceFile`) to parse all `.ts` and `.tsx` source files in `src/` and verify that no React Hook (`use*`) is ever invoked after an early `return` statement within a component or function body.
   - Exercises all pure domain logic: RRULE parsing, local wall-clock time/duration calculation, recurring event expansion (daily, weekday, weekly, biweekly, monthly), single-occurrence `exdates` filtering, multi-member color splitting, and overlapping day column layout.

2. **Isolated Mocked SQLite System Test Suite (`npm run test:system` / `tests/system.test.ts`)**:
   - Sets `JLIGHT_TEST_MODE="true"` and `DATABASE_URL="file:./.tmp-system-test.db"` prior to module initialization so `.env.local` cloud credentials are never touched.
   - Automatically provisions a fresh local SQLite database file, runs all Drizzle SQL migrations (`drizzle/`) and runtime auto-healing (`ensureDatabaseSchema()`), and cleans up the database file on completion.
   - Uses `setMockTestSession()` in `src/auth.ts` (strictly gated behind `JLIGHT_TEST_MODE === "true"`) to simulate multiple authenticated users (`Captain Alice` and `Commander Bob`) calling the real Next.js App Router API Route Handlers (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`) end-to-end:
     - User creation, default galaxy auto-provisioning, and custom galaxy creation (`POST /api/galaxies`).
     - Inhabitant creation (kids & pets) and Whole-Family Identity updates (`POST /api/galaxies/[id]/members`, `PATCH /api/galaxies`).
     - Galaxy privacy enforcement (`403 Forbidden` before joining) and joining a shared galaxy via `joinCode` (`POST /api/galaxies/join`).
     - Creating every category of calendar event (single timed, all-day, multi-member, daily, weekday, weekly, biweekly, monthly), editing events (`PATCH /api/events`), deleting single recurring occurrences (`DELETE /api/events?id=...&exdate=...`), and deleting full recurring series / single events.
     - Creating chores across frequencies, toggling completion and verifying star reward balances, editing chores, and deleting chores (`/api/chores`).
     - Creating shared grocery & packing list items, toggling completion, clearing completed items (`action=clear-completed`), and deleting individual items (`/api/lists`).

3. **Production Build & TypeScript Verification (`npm run build`)**:
   - Executes `next build` against a mocked local SQLite environment in GitHub Actions to verify full static/dynamic route compilation and TypeScript type safety on every push and pull request.

---

## Consequences

- **Positive**:
  - React hook ordering bugs (like placing `useState` after `if (!isOpen) return null;`) are caught in under 1 second by `npm run test:unit`.
  - Full multi-user database & API workflows are verified in ~1 second against real Drizzle/SQLite queries without requiring external OAuth or cloud Turso secrets in GitHub Actions.
  - `AGENTS.md` now mandates that every new feature or bugfix includes corresponding unit and/or system test assertions.
- **Negative / Trade-offs**:
  - `setMockTestSession` adds a tiny test-mode hook in `src/auth.ts`, which is strictly guarded by `if (process.env.JLIGHT_TEST_MODE !== "true") throw new Error(...)` so it can never be activated in production.
