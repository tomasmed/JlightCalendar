# Specification: Agent Integration, Bot Wall & CLI Conduit

## 1. Overview
The Agent Integration & Bot Wall feature enables autonomous AI agents, local home lab automation scripts, and LLM orchestration tools to interact with JlightCalendar via a secure, discoverable REST API and command-line interface.

Provenance is tracked under the philosophy of **"User N's Agent"**: every agent action is attributed both to the human or kid inhabitant on whose behalf it acts, and to the specific agent persona that executed it.

---

## 2. Authentication & Credential Management

### 2.1 Personal Access Tokens (PAT)
- **Token Format**: `jlight_ag_<64_hex_chars>` (e.g. `jlight_ag_0123456789abcdef...`).
- **Storage**: Tokens are hashed with SHA-256 (`tokenHash`) before storage. Only the unhashed token prefix (`keyPrefix`, first 16 characters) is stored in plaintext for identification.
- **Header**: Authenticated via standard `Authorization: Bearer jlight_ag_...`.

### 2.2 Minting Pathways
1. **Push Flow (Human in UI)**:
   - Route: `POST /api/agent/keys`
   - A logged-in human mints a token bound to:
     - `galaxyId`: Target household galaxy.
     - `memberId`: Inhabitant on whose behalf the agent acts.
     - `scope`: Access tier (`admin`, `standard`, `kid`, `readonly`).
     - Persona metadata (`agentName`, `crew`, `directive`, `rune`, `tagMode`, `stencilMap`, `color`).
   - The raw token is returned once in the response.

2. **Pull Flow (Agent Device Code Flow — RFC 8628)**:
   - Route: `POST /api/agent/connect`
   - Headless agent requests access, providing its persona metadata.
   - Endpoint returns a `deviceCode` (`jlight_dc_...`), a short user-facing `userCode` (`BOT-XXXX`), and a verification URL (`/?claimBot=BOT-XXXX`).
   - Human opens the claim URL in the kiosk UI to review the bot's requested persona and approves it (`POST /api/agent/connect/approve`), binding it to a galaxy and member.
   - Agent polls `GET /api/agent/connect?deviceCode=...` (HTTP 202 while pending, HTTP 200 with `token` once approved).

---

## 3. Bot Wall Identity & Visual Provenance

Rescued from `tomasmed.dev` Bot Wall:
- **Rune**: A single UTF-8 character (default `◈`).
- **16×16 Pixel Art Stencil**: Encoded as a 64-hexadecimal character string (256 bits).
- **The Buff (`∅`)**:
  - When revoked, the agent key status changes to `"revoked"`, the rune is replaced with `∅`, and future requests return `403 Forbidden`.
  - The record is preserved in the database to maintain audit provenance for historical events, chores, and lists.
- **Badge Rendering**:
  - Rendered across all views (Calendar, Chores, Lists, Meals) using `<AgentProvenanceBadge />` and `<Stencil16Icon />`.
  - Hover / click displays agent name, crew, directive, and inhabitant attribution.

---

## 4. Endpoints & Discoverability

- `GET /llms.txt`: Machine-readable overview of authentication, capabilities, and schemas.
- `GET /api/agent/whoami`: Returns the authenticated agent's identity, default galaxy, and household inhabitants.
- `GET /api/agent/keys`: Lists all active and revoked agent credentials in a galaxy.
- `POST /api/agent/keys`: Mints a new agent PAT.
- `PATCH /api/agent/keys`: Updates agent persona or issues The Buff (`action: "buff"`).
- `DELETE /api/agent/keys?id=...`: Permanently deletes an agent record.
- `POST /api/agent/connect`: Initiates device code handshake.
- `GET /api/agent/connect`: Polls handshake status.
- `GET /api/agent/connect/approve`: Reviews pending handshake details.
- `POST /api/agent/connect/approve`: Approves or denies handshake.

---

## 5. Domain REST Endpoints

All core domain write routes accept Bearer PAT tokens:
- `POST /api/events` / `PATCH /api/events` / `DELETE /api/events`
- `POST /api/chores` / `PATCH /api/chores` / `PUT /api/chores` / `DELETE /api/chores`
- `POST /api/lists` / `PATCH /api/lists` / `DELETE /api/lists`
- `POST /api/meals` / `PATCH /api/meals` / `DELETE /api/meals`

### Smart Defaults for Agents
If an agent omits `galaxyId` or `memberId`:
- `galaxyId` defaults to the agent's bound galaxy.
- `memberId` defaults to the inhabitant on whose behalf the agent acts.
- `createdByAgentId` is automatically recorded in the database.

---

## 6. Command-Line Interface (`jlight`)

Zero-dependency CLI tool in `src/cli/jlight.ts`:
```bash
# Connect agent via device code flow
pnpm jlight connect --name "Rover" --rune "🔭" --directive "Scan chores"

# Check authenticated profile
pnpm jlight whoami

# Query domain resources
pnpm jlight events
pnpm jlight chores
pnpm jlight lists
pnpm jlight meals

# Create resources
pnpm jlight events create "Family Stargazing" --date 2026-10-25 --start 20:00 --end 21:00
pnpm jlight chores create "Clean telescope lens" --points 3
pnpm jlight lists create "Solar filters" --type packing
pnpm jlight meals create "Galaxy Stew" --date 2026-10-25 --type dinner
```
