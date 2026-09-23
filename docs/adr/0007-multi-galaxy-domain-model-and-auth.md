# ADR 0007: Multi-Galaxy Domain Model, Google OAuth & Account Architecture

## Status
Accepted

## Context
Families and modern multi-household units often have complex scheduling relationships:
1. A parent may be part of an immediate household, an extended family group with grandparents, and a kids-only activity circle.
2. A single user needs to seamlessly switch between different "Galaxies" (collaborative groups/households) without signing out.
3. Every Galaxy owns dedicated calendar instances that populate events into the shared interface.
4. Households include members who do **not** have Google accounts:
   - Young children who interact via kiosk / chore boards.
   - Household pets (e.g. "Java" the dog) who have schedules (vet appointments, grooming, medication).
   - Distant relatives or babysitters.
5. In staging and production, we use **Turso (libSQL)** with Next.js 15. We require a robust, repeatable migration pipeline that prevents table collision bugs.

## Decision

### 1. The "Galaxy" Concept (Celestial Group Multi-Tenancy)
Rebrand the root tenancy model from static `households` to **`galaxies`**:
- A **Galaxy** is an autonomous group space with its own settings, theme (e.g., Milky Way, Andromeda, Orion, Supernova), timezone, and wall kiosk Parent PIN.
- A **User** (authenticated via Google OAuth) can own and belong to multiple Galaxies.
- A **Galaxy Member** (inhabitant) represents a profile within a specific Galaxy. A member can either link to an authenticated `userId` OR be a local/unlinked profile (kids, pets like Java the dog).
- A **Calendar** is an instance belonging to a Galaxy. Events are stored in calendars within galaxies.

### 2. Google OAuth Integration (NextAuth / Auth.js)
- Standard OAuth 2.0 flow via Google Provider.
- Upon first sign-in:
  - Upsert `users` and `accounts` records.
  - Automatically provision the user's default Galaxy (e.g. *"<Name>'s Galaxy"*).
  - Create the user's primary `galaxy_members` profile with role `owner`.
  - Create the Galaxy's default `Primary Orbit` calendar.
- Sessions allow secure API access, while unauthenticated wall kiosks can be paired via device tokens.

### 3. Idempotent Migration Runner
- Provide a dedicated programmatic migration runner `src/db/migrate.ts` (`npm run db:migrate`).
- Ensures clean migration execution and journal recording in `__drizzle_migrations` for both Turso and SQLite.

## Architecture Diagrams

### Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ accounts : "authenticates via"
    users ||--o{ sessions : "active sessions"
    users ||--o{ galaxy_members : "participates in"
    users ||--o{ galaxies : "owns"

    galaxies ||--o{ galaxy_members : "contains inhabitants"
    galaxies ||--o{ calendars : "owns calendar instances"
    galaxies ||--o{ events : "contains events"
    galaxies ||--o{ display_devices : "paired kiosks"
    galaxies ||--o{ chores : "tracks chores"
    galaxies ||--o{ list_items : "shared lists"
    galaxies ||--o{ meal_plans : "meal schedule"

    galaxy_members ||--o{ events : "assigned to"
    galaxy_members ||--o{ chores : "assigned to"
    galaxy_members ||--o{ chore_completions : "completes"
    galaxy_members ||--o{ list_items : "adds items"

    calendars ||--o{ events : "holds"
    chores ||--o{ chore_completions : "logs"

    users {
        text id PK
        text name
        text email UK
        integer emailVerified
        text image
        text defaultGalaxyId FK
        text createdAt
    }

    accounts {
        text userId FK
        text type
        text provider PK
        text providerAccountId PK
        text refresh_token
        text access_token
        integer expires_at
        text token_type
        text scope
        text id_token
        text session_state
    }

    galaxies {
        text id PK
        text name
        text slug UK
        text theme "milky-way | andromeda | nebula | supernova"
        text icon
        text parentPin
        text timezone
        text ownerId FK
        text createdAt
    }

    galaxy_members {
        text id PK
        text galaxyId FK
        text userId FK "nullable for unlinked kids & pets"
        text displayName
        text role "owner | admin | member | viewer | kid | pet"
        text color
        text avatarIcon "user | baby | dog | cat | sparkles"
        integer starBalance
        integer isKioskProfile
        text createdAt
    }

    calendars {
        text id PK
        text galaxyId FK
        text name
        text color
        text description
        integer isPrimary
        text externalProvider "google | icloud | outlook | ics | local"
        text externalCalendarId
        text syncToken
        text lastSyncedAt
        text createdAt
    }

    events {
        text id PK
        text galaxyId FK
        text calendarId FK
        text memberId FK
        text externalUid
        text title
        text description
        text location
        text startTime
        text endTime
        integer isAllDay
        text rrule
        text colorOverride
        text createdAt
    }
```

### Authentication & Multi-Galaxy Switching Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Family Member / Parent
    participant Browser as Next.js Web / Wall Kiosk
    participant Auth as NextAuth Google Provider
    participant DB as Turso Database

    User->>Browser: Click "Sign in with Google"
    Browser->>Auth: Initiate OAuth Flow
    Auth->>User: Google Consent Screen
    User->>Auth: Approve Profile & Calendar Access
    Auth->>DB: Upsert User & Google Account

    alt First Login (New User)
        Auth->>DB: Provision default Galaxy ("The Sol Family Galaxy")
        Auth->>DB: Add User to galaxy_members as Owner
        Auth->>DB: Create default "Primary Orbit" Calendar
    end

    Auth->>Browser: Return Authenticated Session
    Browser->>DB: Query User's Galaxies & Current Galaxy Data
    DB-->>Browser: Return Galaxy List, Members (including unlinked pets/kids), Events
    Browser->>User: Render Primary Calendar View

    opt Switch Galaxy
        User->>Browser: Select "Grandparents & Co." from Galaxy Dropdown
        Browser->>DB: Fetch "Grandparents & Co." Calendar & Events
        DB-->>Browser: Return New Galaxy Data
        Browser->>User: Instantly update calendar view without full reload
    end
```

## Consequences
- **Positive**: Complete support for multi-household switching, unlinked kid/pet profiles (Java the dog), scalable multi-tenant architecture, and robust Google OAuth.
- **Negative**: Adds join relationships (`galaxies` -> `galaxy_members` -> `users`); requires proper indexing and foreign key constraints on `galaxyId`.
