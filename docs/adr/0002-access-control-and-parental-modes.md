# ADR 0002: 3-Tier Access Control & Parental PIN Mode

## Status
Superseded by [ADR 0019](./0019-hosted-service-first-agpl-and-pin-gate-removal.md) (UI Parent PIN & Mode Switcher removed in favor of direct authenticated/capability-link editing; 4-tier scope matrix retained for Autonomous Agent PATs per [ADR 0015](./0015-agent-identity-provenance-and-pat-rest-api.md))

## Context
Wall-mounted family calendars are positioned in common household areas (kitchen, hallway) and accessed by both adults and young children. Early prototypes explored a 3-tier UI access control switcher (`admin`, `standard`, `kid`) gated by a 4-digit Parent PIN pad in `KioskHeader`.

## Historical Decision (Superseded for Human UI)
1. **Admin Mode**: Managed household settings, member profiles, and meal plans behind a 4-digit Parent PIN.
2. **Standard Mode**: Everyday family operations (view calendar, check chores, add items to lists).
3. **Kid Mode**: Locked kiosk view allowing only chore check-offs and viewing.

## Current Architecture (Per ADR 0019 & ADR 0015)
- **Human UI Sessions**: The `KioskHeader` Access Mode switcher and 4-digit Parent PIN gate have been removed (`accessMode` defaults to `"admin"`). Authenticated Galaxy members and Ephemeral Comet participants can directly create and edit events, meals, chores, lists, and people/group colors without PIN friction.
- **Autonomous Agent PATs**: The 4-tier scope matrix (`admin`, `standard`, `kid`, `readonly`) remains actively enforced on the backend REST API (`verifyActorGalaxyAccess` in `src/lib/agent-auth.ts`) for machine tokens (`jlight_ag_...`).
