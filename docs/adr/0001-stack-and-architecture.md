# ADR 0001: Technology Stack and Database Strategy

## Status
Accepted

## Context
We need a web application architecture that:
1. Runs efficiently on local self-hosted hardware (Raspberry Pi 4/5, mini PC, old tablets) with minimal memory footprint.
2. Supports rich, high-performance touch interactions for 24/7 wall displays.
3. Provides offline resilience (calendar keeps working if local WiFi loses internet connectivity).
4. Can smoothly scale from a single self-hosted household to a multi-tenant freemium cloud SaaS.

## Decision
1. **Application Framework**: **Next.js 15 (App Router)** with **TypeScript**, **React 19**, and **Tailwind CSS**.
   - Provides server components for fast initial load and SEO, plus client components for touch-optimized kiosk UI.
   - PWA support enables full-screen wall tablet operation.
2. **Database & ORM**: **Drizzle ORM** with **SQLite / Turso (libSQL)**.
   - In local mode: Connects to a zero-overhead local SQLite database file (`file:./local.db`).
   - In cloud mode: Connects to **Turso (libSQL)** over HTTP/WebSockets with support for database-per-tenant isolation and edge replication.
   - Drizzle ORM provides type-safe queries without the heavy engine binaries or query-engine memory leaks found in traditional heavy ORMs.

## Consequences
- **Positive**: Extremely fast development iteration, unified TypeScript schema, tiny memory footprint locally (<100MB RAM), seamless path to cloud multi-tenancy.
- **Negative**: Turso/libSQL specific features (like embedded replicas) require careful connection configuration when switching between local dev and remote Turso cloud.
