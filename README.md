# JlightCalendar 🗓️✨

> An in-house, self-hostable, local-first smart family calendar and wall dashboard inspired by Skylight Calendar.

Designed to run beautifully 24/7 on a wall touchscreen (Raspberry Pi, old iPad, Android tablet, or Mini PC) while scaling seamlessly into a multi-tenant cloud application.

---

## 🌟 Key Features

- **Multi-View Family Calendar**: Month, Week, Day (side-by-side family member columns), and Agenda view with color-coded family profiles.
- **Two-Way Cloud Sync**: Seamless synchronization with Google Calendar, Apple iCloud, Microsoft Outlook, and standard iCal/Webcal feeds.
- **3-Tier Access Control**:
  - 🛡️ **Admin Mode**: Full control over settings, calendar sync credentials, and member management.
  - 🏠 **Standard Mode**: Everyday family usage (view calendar, check chores, add to grocery lists).
  - 🧒 **Kid Mode**: Locked kiosk view allowing only chore check-offs and viewing, secured with a 4-digit Parent PIN.
- **24/7 Wall Display Hygiene**:
  - Night sleep schedule (auto-dims or blacks out the screen between 11 PM and 6 AM).
  - Subtle pixel shifting to prevent display burn-in.
  - Daily scheduled soft-refresh to keep memory usage minimal over months of uptime.
- **Chores & Habit Gamification**: Daily/weekly recurring chores with fun completion effects and star reward balances.
- **Meal Planning & Recipe Box**: Weekly meal schedule with 1-click addition of recipe ingredients to a shared grocery list.
- **Photo Screensaver**: Ambient photo frame displaying family photos from Google Photos, Immich, or local storage with weather and event overlays.
- **Autonomous Agent Conduit & Bot Wall**:
  - Personal Access Tokens (PAT, `Authorization: Bearer jlight_ag_...`) bound to household members ("User N's Agent").
  - Two-way credential provisioning: Push minting in the kiosk UI or Pull device code handshake (RFC 8628 `BOT-XXXX`).
  - Rescued from `tomasmed.dev` Bot Wall: 16×16 pixel art stencils, UTF-8 runes, and The Buff (`∅`) revocation tombstone.
  - Machine discoverability via `/llms.txt` and `/api/agent/whoami`.
  - Zero-dependency `jlight` CLI for terminal/script control of events, chores, meals, and lists.
- **Local-First & Offline Resilient**: Uses embedded SQLite locally; the wall display stays fast, responsive, and working even if the home internet drops.

---

## 🤖 Agent CLI (`jlight`)

Autonomous agents and background scripts can interact with JlightCalendar using the built-in CLI:

```bash
# Connect agent via interactive device code flow
pnpm jlight connect --name "Envoys" --rune "⚡" --directive "Schedule stargazing nights"

# Verify credentials and bound household member
pnpm jlight whoami

# Query and manage calendar events, chores, and lists
pnpm jlight events
pnpm jlight events create "Telescope Observation" --date 2026-10-25 --start 20:00 --end 21:00
pnpm jlight chores create "Dust telescope mirrors" --points 3
pnpm jlight lists create "Solar filters" --type packing
```

---

## 🛠️ Architecture & Tech Stack

- **Frontend & App Framework**: [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript, [Tailwind CSS](https://tailwindcss.com/).
- **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/) with **SQLite** (local embedded) and [Turso (libSQL)](https://turso.tech/) for scalable cloud multi-tenancy.
- **Real-Time Sync**: Server-Sent Events (SSE) for low-energy, low-compute, battery-friendly live updates.
- **Icons & UI Primitives**: [Lucide React](https://lucide.dev/), Radix UI.

---

## 🚀 Quickstart (Local Development)

### Prerequisites
- **Node.js**: v20+ or v24+
- **pnpm** or **npm**

### Installation
```bash
# 1. Clone the repository
git clone <repo-url>
cd JlightCalendar

# 2. Install dependencies
pnpm install

# 3. Setup environment variables
cp .env.example .env.local

# 4. Start the local development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & CI Suite

Every push and pull request is verified by GitHub Actions (`.github/workflows/ci.yml`). Before deploying or merging PRs to `main`, run the full verification suite locally:

```bash
# Run unit tests + React Rules-of-Hooks AST guard + mocked SQLite system tests
pnpm run test

# Or run suites individually:
pnpm run test:unit    # Fast unit tests & TypeScript AST hook-ordering guard
pnpm run test:system  # End-to-end API & mocked SQLite DB system tests (users, galaxies, events, chores, lists, agents)

# Run type check and production build
pnpm run build
```

---

## 📚 Documentation

Detailed documentation is organized in the `docs/` folder:
- [docs/adr/](docs/adr/): Architecture Decision Records
  - `0001-stack-and-architecture.md`
  - `0002-access-control-and-parental-modes.md`
  - `0003-display-hygiene-and-kiosk.md`
  - `0004-photo-sync-strategy.md`
  - `0005-energy-efficient-realtime-sync.md`
  - `0011-idempotent-runtime-schema-migration.md`
  - `0013-recurring-events-and-mobile-touch-ux.md`
  - `0014-ci-and-mocked-system-test-suite.md`
  - `0015-agent-identity-provenance-and-pat-rest-api.md`
- [docs/specs/](docs/specs/): Feature & Testing Specifications (`agent-integration-and-bot-wall.md`, `ci-and-testing.md`, `calendar-galaxies.md`, `recurring-events-and-mobile-touch-ux.md`)
- [docs/workflow/pr-template.md](docs/workflow/pr-template.md): The "Show and Tell" PR standard.
- [AGENTS.md](AGENTS.md): Operational instructions for autonomous AI agents working in git worktrees.

---

## 🤝 Contributing & Maintenance

This repository utilizes an **Agent-Implemented, Human-in-the-Loop** model.
All feature work is developed in isolated git worktrees on `feat/*` branches, accompanied by unit and system tests, and submitted via PRs that include step-by-step human-operable test plans.
