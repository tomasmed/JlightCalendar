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
- **Local-First & Offline Resilient**: Uses embedded SQLite locally; the wall display stays fast, responsive, and working even if the home internet drops.

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
- **npm**: v10+

### Installation
```bash
# 1. Clone the repository
git clone <repo-url>
cd JlightCalendar

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local

# 4. Run database migrations
npm run db:push

# 5. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & CI Suite

Every push and pull request is verified by GitHub Actions (`.github/workflows/ci.yml`). Before deploying or merging PRs to `main`, run the full verification suite locally:

```bash
# Run unit tests + React Rules-of-Hooks AST guard + mocked SQLite system tests
npm run test

# Or run suites individually:
npm run test:unit    # Fast unit tests & TypeScript AST hook-ordering guard
npm run test:system  # End-to-end API & mocked SQLite DB system tests (users, galaxies, events, chores, lists)

# Run type check and production build
npm run build
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
- [docs/specs/](docs/specs/): Feature & Testing Specifications (`ci-and-testing.md`, `calendar-galaxies.md`, `recurring-events-and-mobile-touch-ux.md`)
- [docs/workflow/pr-template.md](docs/workflow/pr-template.md): The "Show and Tell" PR standard.
- [AGENTS.md](AGENTS.md): Operational instructions for autonomous AI agents working in git worktrees.

---

## 🤝 Contributing & Maintenance

This repository utilizes an **Agent-Implemented, Human-in-the-Loop** model.
All feature work is developed in isolated git worktrees on `feat/*` branches, accompanied by unit and system tests, and submitted via PRs that include step-by-step human-operable test plans.
