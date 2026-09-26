# ADR 0010: Galaxy Creation Lifecycle & Admin-Only Member Removal

## Status
Accepted

## Context
With multi-household galaxy support (ADR 0007) and join codes (ADR 0009) established, authenticated users needed the ability to:
1. Create new shared galaxy spaces directly from the user interface (e.g. for extended families, sports teams, school co-ops, vacation homes) without requiring developer intervention or database seeding.
2. Remove members (users, children, or pets) from a galaxy when they leave or when profiles need restructuring.
3. Prevent destructive accidents on public wall kiosks by children or casual viewers, ensuring that member deletion is strictly guarded and verified.

## Decision

### 1. Galaxy Creation for Authenticated Users
- **API**: `POST /api/galaxies` is accessible to authenticated users (`userId != null`).
- **Provisioning**: When creating a galaxy:
  - Generates a unique galaxy record with a secure `joinCode` (format `GLX-XXXXX`).
  - Sets the creator as the `role: "owner"` member in `galaxyMembers`.
  - Creates a default `calendars` record named "Primary Orbit" marked `isPrimary: true`.
- **UI Ergonomics**:
  - The "+ Orbit New Galaxy" and "+ Create New Galaxy" actions are prominently available in both the Galaxy switcher dropdown and the User profile menu for logged-in users.
  - Creation modal provides theme presets (`milky-way`, `andromeda`, `nebula`, `supernova`) and custom crest icons (Sparkles, Planet, Rocket, Heart, Compass).
  - Newly created galaxies immediately become the active galaxy orbit in the application state.

### 2. Admin-Only Member Removal Architecture
- **Authorization & Access Mode Guard**:
  - In accordance with family kiosk safety, member deletion controls are **strictly visible and operational only when in Admin Mode** (`accessMode === 'admin'`).
  - In Standard and Kid modes, delete buttons are hidden from the UI to protect against accidental tap removals by children or guests on touchscreen displays.
  - Kid mode additionally suppresses the "Add Inhabitant" form to prevent unreviewed profile creation.
- **Backend API (`DELETE /api/galaxies/[id]/members`)**:
  - Verifies caller galaxy authorization via `verifyGalaxyAccess(galaxyId, userId)`.
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
- **Positive**: Full self-service galaxy and member lifecycle for users; zero risk of inadvertent member deletion on touch kiosks due to mandatory Admin mode and confirmation modals; clean database referential integrity maintained automatically.
