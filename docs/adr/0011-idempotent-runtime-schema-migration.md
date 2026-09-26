# ADR 0011: Idempotent Runtime Schema Migration & Database Resilience

## Status
Accepted

## Context
With the addition of new schema columns (such as `galaxies.join_code`, `meal_plans.member_id`, and `users.default_galaxy_id`), environments that created their SQLite/Turso databases prior to these migrations (or deployments that do not execute `npm run db:migrate` prior to runtime) threw errors:
`LibsqlError: SQLITE_UNKNOWN: SQLite error: table galaxies has no column named join_code`

Furthermore, running `npm run db:migrate` via Drizzle migrator crashed on pre-existing databases with `SQLITE_ERROR: table accounts already exists` because previous migrations had not been recorded in `__drizzle_migrations`.

## Decision

1. **Idempotent Runtime Schema Auto-Healing (`ensureDatabaseSchema`)**:
   - Implemented a lightweight, non-blocking runtime schema validator in `src/db/ensure-schema.ts`.
   - On server startup or upon the first API / auth operation (memoized after initial pass), `ensureDatabaseSchema` inspects existing tables using SQLite PRAGMAs:
     - Detects if `galaxies` is missing `join_code`. If missing, applies `ALTER TABLE galaxies ADD COLUMN join_code text` and creates the unique index `galaxies_join_code_unique`, then automatically backfills unique join codes for any existing galaxies.
     - Detects if `meal_plans` is missing `member_id` and adds it if needed.
     - Detects if `users` is missing `default_galaxy_id` and adds it if needed.
   - Wired into `ensureDbUser` as well as `/api/galaxies` and `/api/galaxies/join` routes to guarantee zero-downtime, transparent database upgrades.

2. **Self-Healing Migration Script (`src/db/migrate.ts`)**:
   - Enhanced `runMigration()` to inspect existing table and column states before calling Drizzle's `migrate()`.
   - If tables (`accounts`, `galaxies`, etc.) exist from earlier stages without journal entries in `__drizzle_migrations`, the script automatically baselines migrations `0000`, `0001`, and `0002` appropriately so that Drizzle only attempts unapplied incremental migrations instead of attempting to recreate existing tables.

## Consequences
- **Zero-touch deployments**: Users and staging environments running Next.js do not need to manually run shell migration scripts to receive database column updates.
- **Backwards compatibility**: Legacy databases seamlessly heal without data loss or foreign key violations.
