# ADR 0019: Hosted Cloud Service First Architecture, GNU AGPLv3 Licensing, and Removal of the UI Parent PIN Gate

- **Status**: Accepted (Supersedes ADR 0002 for UI PIN/Mode Gating; Updates ADR 0001 & ADR 0010)
- **Date**: 2026-10-29

---

## 1. Context

Early architecture documents (ADR 0001, ADR 0002, ADR 0010) framed JlightCalendar around two assumptions that no longer match how the product is used or how the codebase operates:

1. **"Local Kiosk Database" vs. Away-from-Fridge Real-Time Access**:
   - The core value of a shared household or group calendar is being able to check and update it from anywhere—checking the grocery list at the store, adding a vet appointment from work, sharing an Ephemeral Comet link (`CMT-XXXX-XXXX`) with friends, or letting an autonomous AI agent (`jlight_ag_...`) schedule events over the REST API.
   - Running an isolated SQLite database strictly inside a kitchen wall tablet breaks away-from-fridge access unless families configure their own VPNs, reverse proxies, or on-premise OAuth servers.
   - Meanwhile, our cloud architecture (Next.js 15 on Vercel + Turso libSQL + Google OAuth + browser-side caching such as the `CacheStorage` photo vault in ADR 0004) already delivers a zero-setup experience for both wall displays and mobile phones.
2. **Removal of the UI Parent PIN / 3-Tier Access Mode Gate (`admin` / `standard` / `kid`)**:
   - ADR 0002 introduced a 3-tier Access Mode switcher and 4-digit Parent PIN pad in `KioskHeader`, and ADR 0010 gated member management and meal planning behind `accessMode === "admin"`.
   - In practice, requiring users to unlock an Admin/PIN modal before adding meals, managing people/colors, or editing shared items created unnecessary friction across both Household Galaxies and multiplayer Comets.
   - In commit `7bacdea`, the UI mode switcher button was removed from `KioskHeader`, `accessMode` was defaulted to `"admin"` for direct editing, and "All Family" / "Whole Family" labels were unified under **"Everyone"**. However, several ADRs and specification files still referenced the removed PIN pad and mode switcher.

---

## 2. Decision

### 2.1 Hosted Cloud Service First + Open-Source Forkability
1. **Primary Product Experience (Hosted Cloud Service)**:
   - JlightCalendar leans fully into being a **cloud-hosted web service** backed by **Google OAuth** (`src/auth.ts`) and **Turso (libSQL)** (`src/db/index.ts`), with capability-link access for zero-login **Ephemeral Comets** (ADR 0017).
   - Wall-mounted tablets and kitchen kiosks operate as full-screen browser / PWA clients connected to the hosted service, using client-side browser storage (`localStorage` and `CacheStorage`) for theme preferences and zero-compute photo slideshow caching (ADR 0004).
2. **Role of Local SQLite (`file:./local.db`)**:
   - Retained as a zero-configuration fallback in `src/db/index.ts` strictly for:
     - **Local Development (`pnpm run dev`)**
     - **Deterministic CI & System Testing (`JLIGHT_TEST_MODE=true` in `tests/system.test.ts`)**
     - **Self-Hosted Open-Source Forks**: Tech-savvy users who wish to fork the repository and deploy their own private instance on a home server, VPS, or Docker container.

### 2.2 Open-Source Licensing under GNU AGPLv3
- License the JlightCalendar codebase under the **GNU Affero General Public License v3.0 (AGPL-3.0)** in `/LICENSE`.
- **Rationale**:
  - Guarantees that any developer, hobbyist, or self-hoster can freely inspect, fork, modify, and run JlightCalendar for their own household or group.
  - Protects the project's open-source commons through network copyleft (Section 13): anyone who modifies JlightCalendar and offers it as a hosted service over a network must make their modified source code available under AGPLv3.

### 2.3 Direct Editing & Removal of UI Parent PIN Gate
- **Human UI Sessions**:
  - Supersede ADR 0002's UI Access Mode switcher (`KioskHeader` omits the legacy `{accessMode} Mode` button and 4-digit PIN gate).
  - Authenticated Galaxy members and Comet capability-link participants have direct access to create and edit events, meals, chores, lists, and people/group colors without toggling UI modes.
  - Group-wide items use **"Everyone"** rather than "All Family" so the interface feels equally natural for households, friend groups, and project sprints.
- **Autonomous Agent Scopes Retained**:
  - The 4-tier scope matrix (`admin`, `standard`, `kid`, `readonly`) remains enforced on the backend API (`verifyActorGalaxyAccess` in `src/lib/agent-auth.ts`, ADR 0015) for **Personal Access Tokens (`jlight_ag_...`)**, allowing human operators to grant least-privilege tokens to bots and scripts.

---

## 3. Consequences

- **Positive**:
  - Eliminates architectural ambiguity between the hosted cloud service and local SQLite fallback.
  - Keeps the codebase 100% open-source and fork-friendly under GNU AGPLv3 while protecting against proprietary SaaS forks.
  - Aligns all repository documentation (`README.md`, `AGENTS.md`, `docs/adr/`, `docs/specs/`) with the actual frictionless UI and current codebase.
- **Negative / Trade-offs**:
  - DIY self-hosters who fork the repo to run their own instance are responsible for their own hosting environment and Google OAuth credentials (or custom NextAuth providers in their fork).
