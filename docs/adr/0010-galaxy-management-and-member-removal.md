# ADR 0010: Galaxy Creation Lifecycle & Member Removal Architecture

## Status
Accepted (Updated by [ADR 0019](./0019-hosted-service-first-agpl-and-pin-gate-removal.md): UI Admin/PIN gate removed so authenticated Galaxy members have direct access to manage people and colors)

## Context
With multi-household galaxy support (ADR 0007) and join codes (ADR 0009) established, authenticated users needed the ability to:
1. Create new shared galaxy spaces directly from the user interface (e.g. for extended families, sports teams, school co-ops, vacation homes) without requiring developer intervention or database seeding.
2. Remove members (users, children, or pets) from a galaxy when they leave or when profiles need restructuring.
3. Prevent accidental single-tap deletions on touchscreens by requiring an explicit confirmation dialog and protecting the Galaxy Owner record.

## Decision

### 1. Galaxy Creation for Authenticated Users
- **API**: `POST /api/galaxies` is accessible to authenticated users (`userId != null`).
- **Provisioning**: When creating a galaxy:
  - Generates a unique galaxy record with a secure `joinCode` (format `GLX-XXXXX`).
  - Sets the creator as the `role: "owner"` member in `galaxyMembers`.
  - Creates a default `calendars` record named "Primary Orbit" marked `isPrimary: true`.
- **UI Ergonomics**:
  - The "+ Orbit New Galaxy" and "+ Create New Galaxy" actions are prominently available in both the Galaxy switcher dropdown and the User profile menu for logged-in users.
  - Newly created galaxies immediately become the active galaxy orbit in the application state.

### 2. Member Removal Architecture
- **Authorization**:
  - Authenticated Galaxy members can open the **People & Group Colors** modal (`InhabitantsModal`) from the Galaxy dropdown or calendar filter bar to add, edit, or remove inhabitants.
- **Backend API (`DELETE /api/galaxies/[id]/members`)**:
  - Verifies caller galaxy authorization via `verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true })`.
  - **Owner Protection**: The galaxy owner cannot be removed via member deletion (`targetMember.role === "owner"` or `galaxy.ownerId === targetMember.userId`). Rejection returns HTTP 400 Bad Request.
  - Deletion removes the row from `galaxyMembers`.
- **Database Cascading Integrity**:
  - `chores`: Foreign key cascades delete of assigned chores.
  - `choreCompletions`: Foreign key cascades delete of completion records.
  - `events`: `memberId` foreign key sets to null (events persist on the calendar).
  - `listItems` and `mealPlans`: References safely set to null.

### 3. Touch-Ergonomic Confirmation Dialog Modal
- Deletion is never instantaneous upon single tap.
- Clicking the remove action opens a dedicated Confirmation Dialog:
  - Displays the member's display name, role, and avatar.
  - Clear, user-friendly explanation of consequences.
  - For `kid` profiles, warns that assigned chores and star balances will be cleared.
  - Minimum 48px touch targets for both "Cancel" and "Remove Member" buttons.
  - Loading spinner and error handling for in-flight requests.

## Consequences
- **Positive**: Full self-service galaxy and member lifecycle for users; zero risk of inadvertent single-tap member deletion on touch kiosks due to confirmation modals and owner protection; clean database referential integrity maintained automatically.
