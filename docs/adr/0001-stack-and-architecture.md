# ADR 0001: Technology Stack and Database Strategy

## Status
Accepted (Updated by [ADR 0019](./0019-hosted-service-first-agpl-and-pin-gate-removal.md): Cloud-Hosted Service First + Open-Source AGPLv3 Forkability)

## Context
We need a web application architecture that:
1. Operates as a responsive, real-time cloud service accessible from mobile phones away from home as well as 24/7 wall-mounted touchscreen kiosks.
2. Supports rich, high-performance touch interactions for wall displays and mobile companion devices.
3. Provides client-side browser caching (e.g., `localStorage` and `CacheStorage` for themes and ambient photo slideshows) to minimize compute and bandwidth overhead.
4. Retains a zero-config local SQLite fallback (`file:./local.db`) so developers, CI pipelines, and DIY open-source forkers can run and test the full stack locally without external cloud dependencies.

## Decision
1. **Application Framework**: **Next.js 15 (App Router)** with **TypeScript**, **React 19**, and **Tailwind CSS**.
   - Provides server components for fast initial load, plus client components for touch-optimized kiosk and mobile UI.
   - PWA support enables full-screen wall tablet operation.
2. **Database & ORM**: **Drizzle ORM** with **Turso (libSQL) / SQLite**.
   - In production/staging cloud mode: Connects to **Turso (libSQL)** over HTTP/WebSockets alongside **Google OAuth** (`src/auth.ts`).
   - In local dev, CI (`JLIGHT_TEST_MODE=true`), or DIY self-hosted forks: Connects to a zero-overhead local SQLite database file (`file:./local.db`).
   - Drizzle ORM provides type-safe queries without the heavy engine binaries or query-engine memory leaks found in traditional heavy ORMs.

## Consequences
- **Positive**: Extremely fast development iteration, unified TypeScript schema, instant away-from-fridge cloud sync via Turso, and zero-config local SQLite for CI and open-source forks.
- **Negative**: DIY self-hosters who fork the repository must supply their own environment variables (`DATABASE_URL`, Google OAuth credentials) for deployed instances.
