# AGENTS.md — Autonomous Agent Operating Manual

Welcome to **JlightCalendar**. This repository is engineered to be primarily developed and maintained by AI agents collaborating with human-in-the-loop (HITL) maintainers.

All autonomous agents working on this codebase **must strictly adhere** to the guidelines in this document.

---

## 1. Core Operating Principles

1. **Human-in-the-Loop First**: Every non-trivial change requires human review. Write code, documentation, and PRs so that a human maintainer without AI tools can easily read, test, and understand what was done.
2. **Mandatory Local Manual Verification & User Sign-Off**: Before submitting any PR or finalizing a worktree, the agent MUST run the app locally (or verify in the active dev server) and require human user sign-off. Never open or finalize a PR without explicit user confirmation of local manual testing.
3. **Never Commit Directly to `main`**: The `main` branch is production-ready at all times.
4. **Always Work in a Git Worktree**: All feature, bugfix, or refactor work must take place in an isolated git worktree on a dedicated branch (`feat/*`, `fix/*`, `chore/*`).
5. **Document Every Architecture Decision**: Any new architectural pattern, external dependency, or protocol shift must have a corresponding Architecture Decision Record in `docs/adr/`.
6. **Human-Operable Staging Tests**: Every Pull Request must include a clear, step-by-step test plan that a human can execute in staging with zero guesswork.
7. **Check PR Status Before Pushing**: Never push follow-up commits to an already-merged branch/PR. If a PR has been merged on GitHub, pull latest `main`, create a new branch/worktree (`fix/*`, `feat/*`), and open a fresh PR.

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

### **Step 2: Do work inside the worktree**
Work exclusively within `.worktrees/feat-<feature-name>/`.
Run tests and type checks within that directory:

```powershell
npm run test
npm run build
```

### **Step 3: Commit with clear Conventional Commits**
Follow the Conventional Commits specification:
- `feat: add 3-tier access mode toggle (admin, standard, kid)`
- `fix: resolve rrule expansion for weekly events with exdates`
- `docs: add ADR 0005 for real-time SSE sync`
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
- **Styling**: Tailwind CSS with Radix UI / Lucide icons.
- **Touch Ergonomics**: All clickable elements must have a minimum hit target of `48px x 48px` to support wall touchscreen kiosks.
- **Database**: Drizzle ORM with SQLite (local embedded) and Turso (cloud libSQL).
  - Schema files live in `src/db/schema/`.
  - Migrations live in `drizzle/`.
- **Sync**: Server-Sent Events (SSE) for low-power, lightweight updates to displays.
- **Access Modes**:
  - Always respect the active access mode: `admin`, `standard`, or `kid`.
  - When in `kid` mode, suppress edit controls, settings, and deletion actions.

---

## 5. In-Repo Documentation Maintenance

When adding or modifying features:
1. Update `docs/specs/<feature>.md` with the latest behavioral specifications.
2. If changing database schemas or fundamental protocols, create a new ADR in `docs/adr/`.
3. If new setup instructions, scripts, or environment variables are introduced, update `README.md` immediately.
