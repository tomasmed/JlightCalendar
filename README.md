# JlightCalendar 🗓️✨

> An open-source, cloud-synced smart calendar, chore tracker, and wall kiosk dashboard for families, friend groups, and AI agents.

Built to keep households and groups on the same page in real time—whether you're tapping a 24/7 wall-mounted tablet on the fridge or checking the grocery list on your phone at the store. Powered by **Next.js 15**, **Google OAuth**, and **Turso (libSQL)** in the cloud, with a zero-config local **SQLite** fallback so developers and open-source tinkerers can fork and self-host in minutes.

---

## 🌟 Key Features

- **Multi-Galaxy Spaces & Color-Coded People (Even Pets)**:
  - Switch effortlessly between separate **Galaxies** (e.g., *Immediate Household*, *Grandparents & Co.*, *Co-Parenting Schedule*) under a single Google account, or invite members with a simple `GLX-XXXXX` join code.
  - Assign events to **Everyone**, multiple people at once (diagonal split-color badges), or unlinked profiles like young children and pets (e.g., *Java the dog*).
- **Ephemeral Comets (Spin-Up / Spin-Down Multiplayer Calendars)**:
  - Launch instant, zero-login shared calendars (`CMT-XXXX-XXXX`) for team sprints, quick meetings, or group trips with configurable TTLs (7d, 30d, 90d, or default 5 months).
  - Streamlined multiplayer UI (Calendar + Shared Lists) that omits household-specific tabs.
  - 1-click upgrade bridges: **Convert Comet to Permanent Galaxy** (via Google OAuth) or **Copy Window Events to My Galaxy**.
- **RFC 5545 `.ics` Two-Way Portability & Interoperability**:
  - **Export**: Export any date range (`Start Day X` → `End Day Y`) and participant slice as a standards-compliant `.ics` file or live feed for Google Calendar, Apple Calendar, and Microsoft Outlook.
  - **Import**: Drag-and-drop or upload `.ics` calendar files (or paste raw iCalendar content) with lossless RFC 5545 metadata persistence, visual event previews, member attribution, and automated deduplication.
- **Material Archetype Theme Studio (9 Curated Palettes)**:
  - **Archetype A — Super Creamy (Matte PBT Keycaps)**: `Mocha` (Default), `Matcha`, `Oat`, and `Latte` (Daylight).
  - **Archetype B — Cyberpunk & Seasonal OSL (Fluorescent Light-Spill)**: `Over-Volt Blue`, `Yakuza Purple`, `Red Dragon`, `Neon Green`, and `All Hallows` (`halloween`).
  - Automatic hue-preserving member color adaptation so every person keeps their semantic color across dark, daylight, and neon themes.
- **Ambient Photo Frame & Kiosk Browser Cache Vault**:
  - Connect **Google Photos Shared Album links** (`photos.app.goo.gl`) or **Immich** instances with in-app step-by-step setup guides.
  - Zero image binaries stored in the database; playlists (`<= 1080p`) are cached in the kiosk browser's `CacheStorage` and `localStorage` for zero-compute 24/7 rotation, complete with blurred portrait backdrops, live weather, and next-event HUD overlays.
- **24/7 Wall Display Hygiene**:
  - Night sleep mode (OLED-friendly dimmed ambient clock screen).
  - Subtle $\pm 2\text{px}$ pixel shifting every 10 minutes to prevent display burn-in.
- **Chores & Habit Gamification**:
  - Daily, weekly, biweekly, and one-time chores with instant star reward balances per family member.
- **Meal Planning & Shared Lists**:
  - Weekly meal schedule with chef attribution and 1-click syncing of meal ingredients to shared grocery, packing, and to-do lists.
- **Autonomous Agent Conduit & Bot Wall**:
  - Personal Access Tokens (PAT, `Authorization: Bearer jlight_ag_...`) bound to household members ("User N's Agent") with 4-tier machine scopes (`admin`, `standard`, `kid`, `readonly`).
  - Two-way credential provisioning: Push minting in the UI or Pull device code handshake (RFC 8628 `BOT-XXXX`).
  - Rescued from `tomasmed.dev` Bot Wall: 16×16 pixel art stencils, UTF-8 runes, and The Buff (`∅`) revocation tombstone.
  - Machine discoverability via `/llms.txt` and `/api/agent/whoami`, plus a zero-dependency `jlight` CLI.

---

## 🤖 Agent CLI (`jlight`)

Autonomous agents and background scripts can interact with JlightCalendar using the built-in CLI:

```bash
# Connect agent via interactive device code flow
pnpm jlight connect --name "Envoys" --rune "⚡" --directive "Schedule stargazing nights"

# Verify credentials and bound household member
pnpm jlight whoami

# Query and manage calendar events, chores, lists, and ephemeral Comets
pnpm jlight comets create "Q4 Product Sprint" --ttl 150 --creator "SprintBot"
pnpm jlight events
pnpm jlight events create "Telescope Observation" --date 2026-10-25 --start 20:00 --end 21:00
pnpm jlight chores create "Dust telescope mirrors" --points 3
pnpm jlight lists create "Solar filters" --type packing
```

---

## 🛠️ Architecture & Tech Stack

- **Frontend & App Framework**: [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript, [Tailwind CSS](https://tailwindcss.com/).
- **Authentication**: [NextAuth.js (Auth.js v5)](https://authjs.dev/) with **Google OAuth** for Household Galaxies, capability links (`CMT-XXXX-XXXX`) for Ephemeral Comets, and scoped Bearer PATs (`jlight_ag_...`) for Autonomous Agents.
- **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/) with [Turso (libSQL)](https://turso.tech/) for the hosted cloud service, and zero-config local **SQLite** (`file:./local.db`) for local development, CI testing, and DIY self-hosted forks.
- **Icons & UI Primitives**: [Lucide React](https://lucide.dev/), Radix UI.

---

## 🚀 Quickstart (Local Development & Self-Hosting)

### Prerequisites
- **Node.js**: v20+ or v22+
- **pnpm** or **npm**

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/tomasmed/JlightCalendar.git
cd JlightCalendar

# 2. Install dependencies
pnpm install

# 3. Setup environment variables (defaults to file:./local.db if DATABASE_URL is omitted)
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
pnpm run test:system  # End-to-end API & mocked SQLite DB system tests (users, galaxies, events, chores, lists, agents, photos)

# Run type check and production build
pnpm run build
```

---

## 📚 Documentation

Detailed documentation is organized in the `docs/` folder:
- [docs/adr/](docs/adr/): Architecture Decision Records
  - `0001-stack-and-architecture.md`
  - `0002-access-control-and-parental-modes.md` *(Superseded by ADR 0019)*
  - `0003-display-hygiene-and-kiosk.md`
  - `0004-photo-sync-strategy.md`
  - `0005-energy-efficient-realtime-sync.md`
  - `0006-hosting-and-cloud-provider.md`
  - `0007-multi-galaxy-domain-model-and-auth.md`
  - `0008-family-data-persistence-and-member-attribution.md`
  - `0009-galaxy-privacy-and-join-codes.md`
  - `0010-galaxy-management-and-member-removal.md`
  - `0011-idempotent-runtime-schema-migration.md`
  - `0012-weekly-hour-breakdown-calendar-view.md`
  - `0013-recurring-events-and-mobile-touch-ux.md`
  - `0014-ci-and-mocked-system-test-suite.md`
  - `0015-agent-identity-provenance-and-pat-rest-api.md`
  - `0016-archetype-theme-engine-and-osl-materiality.md`
  - `0017-ephemeral-comets-and-ics-portability.md`
  - `0018-ics-import-and-interoperability.md`
  - `0019-hosted-service-first-agpl-and-pin-gate-removal.md`
- [docs/specs/](docs/specs/): Feature & Testing Specifications (`photo-screensaver.md`, `ephemeral-comets-and-ics-export.md`, `agent-integration-and-bot-wall.md`, `ci-and-testing.md`, `calendar-galaxies.md`, `recurring-events-and-mobile-touch-ux.md`, `weekly-hour-breakdown.md`, `general-improvements.md`)
- [docs/workflow/pr-template.md](docs/workflow/pr-template.md): The "Show and Tell" PR standard.
- [AGENTS.md](AGENTS.md): Operational instructions for autonomous AI agents working in git worktrees.

---

## 🤝 Contributing & License

This repository utilizes an **Agent-Implemented, Human-in-the-Loop** model. All feature work is developed in isolated git worktrees on `feat/*`, `fix/*`, or `chore/*` branches, accompanied by unit and system tests, and submitted via PRs that include step-by-step human-operable test plans.

Licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.
