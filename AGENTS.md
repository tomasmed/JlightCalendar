# AGENTS.md — Autonomous Agent Operating Manual

Welcome to **JlightCalendar**. This repository is engineered to be primarily developed and maintained by AI agents collaborating with human-in-the-loop (HITL) maintainers, and is open-sourced under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

All autonomous agents working on this codebase **must strictly adhere** to the guidelines in this document.

---

## 1. Core Operating Principles

1. **Human-in-the-Loop First**: Every non-trivial change requires human review. Write code, documentation, and PRs so that a human maintainer without AI tools can easily read, test, and understand what was done.
2. **Mandatory Local Manual Verification & User Sign-Off**: Before submitting any PR or finalizing a worktree, the agent MUST run the app locally (or verify in the active dev server) and require human user sign-off. Never open or finalize a PR without explicit user confirmation of local manual testing.
3. **Never Commit Directly to `main`**: The `main` branch is production-ready at all times.
4. **Always Work in a Git Worktree**: All feature, bugfix, or refactor work must take place in an isolated git worktree on a dedicated branch (`feat/*`, `fix/*`, `chore/*`).
5. **Document Every Architecture Decision**: Any new architectural pattern, external dependency, or protocol shift must have a corresponding Architecture Decision Record in `docs/adr/`.
6. **Human-Operable Staging Tests**: Every Pull Request must include a clear, step-by-step test plan that a human can execute in staging with zero guesswork.
7. **Check PR Status Before Pushing**: Never push follow-up commits to an already-merged branch/PR. If a PR has been merged on GitHub, pull latest `main`, create a new branch/worktree (`fix/*`, `feat/*`, `chore/*`), and open a fresh PR.
8. **Mandatory Automated Testing for Every Feature & Bugfix**: Whenever you add a new core feature, API route, database column, or UI workflow—or fix a bug—you **must** add corresponding automated test coverage in `tests/unit.test.ts` and/or `tests/system.test.ts` and ensure the full CI suite (`npm run test` and `npm run build`) passes before requesting user sign-off.

---

## 2. Git Worktree & Branching Workflow

### **Step 0: Always start a new session by pulling latest from `main`**
Before starting any new feature, bugfix, or chore, always make sure the local `main` branch is up to date with remote:

```powershell
# From the repository root (e:\JlightCalendar):
git checkout main
git pull origin main
npm install
```

### **Step 1: Check out a new branch in an isolated worktree**
Never modify the root working tree directly for feature work. Always create a git worktree in `.worktrees/`:

```powershell
# From the repository root (e:\JlightCalendar):
git worktree add .worktrees/feat-<feature-name> -b feat/<feature-name>
```

### **Step 2: Do work inside the worktree & write automated tests**
Work exclusively within `.worktrees/feat-<feature-name>/`.
When implementing new core functionality or fixing a regression, add unit tests in `tests/unit.test.ts` and end-to-end mocked database/API tests in `tests/system.test.ts`.
Run the full test suite and production build within that directory:

```powershell
npm run test:unit
npm run test:system
npm run build
```

### **Step 3: Commit with clear Conventional Commits**
Follow the Conventional Commits specification:
- `feat: add photo screensaver connectors for Google Photos and Immich`
- `fix: resolve rrule expansion for weekly events with exdates`
- `docs: add ADR 0019 for hosted service architecture and AGPLv3 license`
- `test: add unit tests for chore completion state machine`

### **Step 4: Local Manual Check & User Sign-Off (MANDATORY)**
- Verify all changes running locally in the development server or kiosk display.
- Present the changes to the user and request explicit manual test sign-off.
- Only proceed to open or finalize the PR after user approval is received.

### **Step 5: Check PR status and prepare the "Show and Tell" PR**
- **Always verify the PR is not already merged**: Before pushing additional commits or expecting reviews on an existing branch, check whether the branch's PR was already merged on GitHub (`gh pr view`). If merged, never reuse that branch—pull `main`, branch afresh, and create a new PR.
- Push the branch and generate a Pull Request following the format in `docs/workflow/pr-template.md`.

### **Step 6: Clean up the worktree after merge**
```powershell
git worktree remove .worktrees/feat-<feature-name>
git branch -d feat/<feature-name>
```

---

## 3. Pull Request "Show & Tell" Standard

All PR descriptions must be structured like a **proud classroom show-and-tell presentation**. Avoid dense, robotic changelogs. Use the following template:

```markdown
# 🌟 [Show & Tell]: <Feature Name or Title>

### 🎯 What did we build?
[A plain-English, welcoming explanation of what this feature does and how the family or user experiences it.]

### 💡 Why was it built this way?
[Brief discussion of the architectural choices, trade-offs, and key file additions.]

### 📸 Visual Preview / Walkthrough
[Screenshots, component structure, or mock diagram showing the visual experience.]

### 🧪 Human-Operable Staging Test Plan (Step-by-Step)
Follow these steps in your staging environment to verify this change:
1. Navigate to: `http://localhost:3000/...`
2. Perform action: `...`
3. Expected result: `...`
4. Edge-case test: `...`

### ⚠️ Caveats & Follow-ups
[Any known follow-up tasks, deferred features, or environment variable requirements.]
```

---

## 4. Coding Standards & Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript).
- **React Rules of Hooks**: All React hooks (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useSession`, etc.) must be declared unconditionally at the very top of component functions—**never** after an early `if (!isOpen) return null;` return. Our AST guard in `tests/unit.test.ts` enforces this across every file in `src/`.
- **Styling**: Tailwind CSS with Radix UI / Lucide icons and the Material Archetype Theme Engine (`creamy` Matte PBT & `osl` Fluorescent Light-Spill palettes in `src/lib/theme.ts`).
- **Touch Ergonomics**: All clickable elements must have a minimum hit target of `48px x 48px` (`44px` minimum on compact mobile rows) to support wall touchscreen kiosks and mobile phones.
- **Database & Hosting Model (ADR 0019)**:
  - **Hosted Cloud Service First**: Production and staging run on Vercel with **Google OAuth** (`src/auth.ts`) and **Turso (cloud libSQL)**. Wall tablets and phones connect to the hosted service in real time, using browser `localStorage` and `CacheStorage` for client-side caching.
  - **Local SQLite (`file:./local.db`)**: Retained strictly for zero-config local development (`pnpm run dev`), deterministic CI testing (`JLIGHT_TEST_MODE=true`), and DIY open-source forks.
  - Schema files live in `src/db/schema.ts`; runtime idempotent schema migrations live in `src/db/ensure-schema.ts`; SQL migrations live in `drizzle/`.
- **Authentication & Actor Authorization**:
  - **Human UI Sessions**: Authenticated via Google OAuth for permanent Household Galaxies (or capability codes `CMT-XXXX-XXXX` for Ephemeral Comets). The legacy UI Parent PIN / Access Mode switcher button was removed from `KioskHeader` (ADR 0019) in favor of direct editing, and group-wide items use **"Everyone"** rather than "All Family".
  - **Autonomous Agent PATs (`jlight_ag_...`)**: Resolved via `resolveRequestActor` and enforced via `verifyActorGalaxyAccess` (`src/lib/agent-auth.ts`) with 4-tier machine scopes (`admin`, `standard`, `kid`, `readonly`).

---

## 5. Automated Testing & CI Suite Standards

GitHub Actions CI (`.github/workflows/ci.yml`) runs automatically on every push and pull request:
1. **Unit & Static AST Guard (`npm run test:unit` -> `tests/unit.test.ts`)**:
   - Scans all `.ts`/`.tsx` files in `src/` using the TypeScript AST compiler API to prevent React Rules-of-Hooks violations (e.g., hooks called after early returns).
   - Verifies recurrence RRULE conversion, local wall-clock time/duration math, recurring event expansion, `exdates` filtering, multi-member color splitting, overlapping day layout, RFC 5545 `.ics` import/export, and photo connector helpers.
2. **Mocked System & Database Integration Suite (`npm run test:system` -> `tests/system.test.ts`)**:
   - Stands up a fresh, isolated SQLite database (`JLIGHT_TEST_MODE=true`), runs Drizzle migrations and `ensureDatabaseSchema()`, and uses `setMockTestSession()` to exercise real App Router API route handlers end-to-end:
     - Creating users, provisioning galaxies, and updating family identity/inhabitants.
     - Joining a galaxy as a second user via join code and verifying privacy/access control (`403` before join, `200` after join).
     - Creating all event types (single timed, all-day, multi-member, daily, weekday, weekly, biweekly, monthly), importing/exporting `.ics` files, and deleting both single occurrences (`exdate`) and full series.
     - Creating, completing (star rewards), editing, and deleting chores.
     - Creating, toggling, clearing completed, and deleting shared list items.
     - Minting Agent PATs, device code handshakes, Ephemeral Comets, and photo screensaver connector configs.
3. **Whenever adding a new feature**:
   - Add unit tests for pure logic/helpers in `tests/unit.test.ts`.
   - Add API & DB integration assertions for any new or modified route behavior in `tests/system.test.ts`.

---

## 6. In-Repo Documentation Maintenance

When adding or modifying features:
1. Update `docs/specs/<feature>.md` with the latest behavioral specifications.
2. If changing database schemas or fundamental protocols, create a new ADR in `docs/adr/`.
3. If new setup instructions, scripts, or environment variables are introduced, update `README.md` immediately.
