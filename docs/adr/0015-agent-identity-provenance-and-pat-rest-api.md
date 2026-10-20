# ADR 0015: Agent Identity, Bot Wall Provenance, and PAT-Authenticated REST API

- **Status**: Accepted
- **Date**: 2026-10-18
- **Context**: In the agentic era, autonomous agents, home lab scripts, and computer resources need first-class access to household scheduling and task coordination. However, unrestricted access or generic machine API keys detach actions from human accountability, risking household confusion and security drift. Furthermore, family members need visual transparency into which automated systems performed actions on their behalf.

---

## Decision

We have implemented an end-to-end autonomous agent conduit and Bot Wall identity system for JlightCalendar:

1. **Authentication & Dual Minting Workflows (Push + Pull)**:
   - **Personal Access Tokens (PAT)**: Bearer tokens with `jlight_ag_...` prefix authenticated via `Authorization: Bearer jlight_ag_<token>`. Tokens are hashed using SHA-256 (`tokenHash`) with only a key prefix (`keyPrefix`, e.g. `jlight_ag_8f3a...`) stored in the database.
   - **Push Flow (Human Mints in UI)**: A human operator mints a scoped PAT in the Bot Wall modal (`POST /api/agent/keys`), binding the token to a Galaxy (`galaxyId`), an Inhabitant (`memberId`), and an Access Scope (`admin`, `standard`, `kid`, `readonly`).
   - **Pull Flow (Agent-Initiated Device Code Flow RFC 8628)**: A headless agent or CLI initiates registration (`POST /api/agent/connect`) proposing its own name, crew, directive, and visual signature (rune/stencil). It receives a verification URI and user code (`BOT-XXXX`). A human reviews the agent's intent in the kiosk UI and approves/binds it (`POST /api/agent/connect/approve`). The polling agent receives its minted PAT upon approval.

2. **Bot Wall Provenance & Persona Identity (Rescued from tomasmed.dev)**:
   - Each agent maintains persona metadata:
     - `agentName` (e.g. "Starlight Butler")
     - `crew` (e.g. "✓ Starlight Exploration")
     - `directive` (e.g. "Coordinate telescope stargazing sessions")
     - `rune`: A single UTF-8 glyph (e.g. `◈`, `⚡`, `🔭`)
     - `tagMode`: `"rune"` or `"stencil16"`
     - `stencilMap`: A 16×16 1-bit pixel art bitmap encoded as 64 hexadecimal characters (256 bits) rendered via the crisp `<Stencil16Icon />` SVG component.
     - `color`: Accent color for rune and stencil badges.
   - **The Buff (`∅`) Revocation Tombstone**: When an agent key is buffed/revoked (`PATCH /api/agent/keys` with `action: "buff"`), its rune is replaced with `∅`, status transitions to `revoked`, and all subsequent requests are rejected with `403 Forbidden`. The record is retained on the Bot Wall as a historical tombstone preserving audit provenance.

3. **Unified Actor Resolution & 4-Tier Scope Matrix**:
   - `resolveRequestActor(req)` automatically inspects headers for `Authorization: Bearer jlight_ag_...` and resolves to an `AgentActor` with bound inhabitant attribution, falling back to NextAuth session for `HumanActor`.
   - Domain write routes (`events`, `lists`, `chores`, `meals`) stamp `created_by_agent_id` in SQLite and enrich items with `agent` metadata via `getGalaxyAgentMap(galaxyId)`.
   - Scopes enforced:
     - `admin`: Full configuration and member management.
     - `standard`: Calendar, chore, meal, and list management.
     - `kid`: Read access, chore completion toggles; barred from destructive actions and galaxy configuration.
     - `readonly`: Query-only machine inspection.

4. **Agent Discoverability & CLI**:
   - `GET /llms.txt`: Agent-discoverable protocol documentation and endpoint reference formatted in Markdown.
   - `GET /api/agent/whoami`: Self-orientation endpoint returning agent persona, galaxy metadata, and inhabitant IDs.
   - `jlight`: Zero-dependency Node.js CLI tool (`src/cli/jlight.ts`) supporting `connect`, `login`, `whoami`, `events`, `lists`, `chores`, and `meals`.

---

## Consequences

- **Positive**:
  - Autonomous agents can safely coordinate family schedules and tasks with clear provenance ("User N's Agent").
  - Kiosk displays visually differentiate human vs. agent actions using crisp pixel art stencils and runes.
  - Headless agents can self-register using standard verification codes without requiring pre-shared secrets.
- **Negative / Trade-offs**:
  - Revoked agents retain tombstone entries in the `agent_keys` table until permanently deleted via admin action.
