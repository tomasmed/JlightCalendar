# 8. Family Data Persistence & Member Attribution

Date: 2026-09-23

## Status

Accepted

## Context

Previously, the Family Chores, Grocery Lists, and Weekly Meals views functioned with ephemeral, hardcoded client-side React state. Changes made on the touchscreen kiosk or mobile displays were not saved across page refreshes or device reboots. Furthermore, household members could not be properly attributed to meal plans or list items.

In addition, modern mobile viewports (e.g., Samsung Galaxy S26, ~412px wide) experienced header crowding and content overlap due to desktop-first navigation headers.

## Decision

1. **Schema Attribution**:
   - Enhanced `meal_plans` schema with an optional `member_id` foreign key referencing `family_members.id` (set null on delete) to identify who planned or is scheduled to cook each meal.
   - Connected `list_items` to `added_by_member_id` with real-time attribution and filtering.
   - Linked `chores` and `chore_completions` to `family_members` with dynamic point aggregation updating each member's `star_balance`.

2. **REST API Endpoints**:
   - Built Next.js App Router API routes:
     - `/api/members`: Retrieves family constellation and current star balances.
     - `/api/chores`: CRUD operations for chores and atomic star balance updates on completion toggle.
     - `/api/lists`: CRUD operations for grocery/todo items with member attribution and completed batch cleanup.
     - `/api/meals`: Meal planning with member attribution and a direct sync action to append dinner ingredients to `/api/lists`.

3. **Multi-Device Responsive Architecture**:
   - Implemented `MobileNavBar` for screen widths `< md` (~Samsung Galaxy S26 / 412px), transferring navigation to an ergonomic bottom bar.
   - Preserved top kiosk header on tablet and wall displays (`>= md`).
   - Compacted monthly day cells on mobile with colored constellation dots while preserving full event details via the Day Overview modal.

## Consequences

- All chores, grocery items, and meal plans persist permanently in SQLite/libSQL (`local.db`).
- Seamless responsive experience across mobile devices (~412px), tablets (768px-1024px), and wall kiosks (1280px+).
- Star balances reflect real chore completions with immediate visual and database synchronization.
