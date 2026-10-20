# 🌟 [Show & Tell]: Autonomous Agent Conduit, Bot Wall & `jlight` CLI

### 🎯 What did we build?
We built a first-class autonomous agent integration system for JlightCalendar inspired by the `tomasmed.dev` Bot Wall, enabling background AI agents, LLM orchestration frameworks, and home automation scripts to interact with the family calendar under the philosophy of **"User N's Agent"**:
- **Dual Credential Minting (Push & Pull)**:
  - **Push Flow (Kiosk UI)**: Human operators can mint scoped Personal Access Tokens (PATs: `Authorization: Bearer jlight_ag_...`) bound to a specific Galaxy, a household Inhabitant (e.g. Leo or Captain), and a 4-tier access scope (`admin`, `standard`, `kid`, `readonly`).
  - **Pull Flow (Agent Device Code Flow — RFC 8628)**: Autonomous agents or background loops can self-register (`POST /api/agent/connect`), receive a user verification code (`BOT-XXXX`), and present a claim link. A human opens the link in the kiosk to inspect the agent's proposed persona and approves/binds it.
- **Bot Wall Visual Provenance**:
  - Rescued from `tomasmed.dev` Bot Wall: custom 16×16 pixel art stencils (256-bit bitmaps encoded as 64 hex characters) rendered with crisp `<Stencil16Icon />` pixel styling, custom UTF-8 runes (e.g. `◈`, `⚡`, `🪐`), and **The Buff (`∅`)** revocation tombstone.
  - Every calendar event, chore, grocery list item, and meal plan created by an agent features a visual **Provenance Badge** revealing the agent's name, directive, and human inhabitant attribution.
- **Agent Discoverability & Self-Contextualization**:
  - `GET /llms.txt`: Machine-discoverable Markdown protocol documentation and endpoint reference.
  - `GET /api/agent/whoami`: Self-orientation endpoint allowing agents to query their assigned identity, default galaxy, and household inhabitant IDs without manual UUID hunting.
  - Smart Defaults: Agents omitting `galaxyId` or `memberId` are automatically scoped to their bound galaxy and delegated inhabitant.
- **Zero-Dependency `jlight` CLI**:
  - A lightweight Node.js CLI tool (`src/cli/jlight.ts`) supporting `connect`, `login`, `whoami`, `events`, `lists`, `chores`, and `meals`.

---

### 💡 Why was it built this way?
1. **Provenance Over Anonymity**: Generic machine API keys obscure which family member requested an action. Binding each agent to a specific Inhabitant (`memberId`) preserves household trust and accountability.
2. **Client-Server Module Separation**: Client-side components import strictly from `src/lib/agent-types.ts` (0 external DB dependencies), keeping `@libsql/client/web` out of the browser bundle and shrinking the client bundle size down to 49.3 kB.
3. **Audit Integrity via The Buff (`∅`)**: Rather than hard-deleting credentials, revoking an agent transitions its status to `revoked`, stamps `revokedAt`, swaps its rune to `∅`, and rejects subsequent requests with `403 Forbidden`. This ensures historical chores, meals, and events retain valid foreign key provenance.
4. **Idempotent Self-Healing SQLite Schema**: Added `agent_keys` and `agent_device_codes` tables and `created_by_agent_id` columns with automatic runtime column addition via `ensureDatabaseSchema()`.

---

### 📸 Visual Preview / Walkthrough

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 🤖 AGENT BOT WALL & CREDENTIAL CONDUIT                                 │
├────────────────────────────────────────────────────────────────────────┤
│ [ Active Agents (Bot Wall) ]  [ Mint Agent PAT ]  [ Claim Handshake ]  │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  [ 16x16 Pixel Robot ]  Starlight Butler                    Active │ │
│ │  Crew: Logistics • Acting on behalf of: Leo                        │ │
│ │  Directive: "Schedule evening telescope stargazing sessions"       │ │
│ │  Key: jlight_ag_8f3a...  •  Actions: 42  •  Scope: standard        │ │
│ │                                               [ Edit ] [ Buff ∅ ]  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  [ ∅ Buffed Tombstone ]  Old Kitchen Crawler               Revoked │ │
│ │  Crew: Household • Acting on behalf of: Captain                    │ │
│ │  Key: jlight_ag_12de...  •  Revoked: Oct 18, 2026   [ Delete Perm ] │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 🧪 Human-Operable Staging Test Plan (Step-by-Step)

- [ ] **Step 1: Verify Machine Discovery**
  - Navigate to `http://localhost:3000/llms.txt`.
  - Verify that the response is clean Markdown outlining the API endpoints, authentication headers, and provenance model.

- [ ] **Step 2: Mint a PAT via the Kiosk UI (Push Flow)**
  - Open `http://localhost:3000`.
  - Click the **`🤖 Agents`** button in the header to open the Bot Wall Modal.
  - Switch to the **"Mint Agent PAT"** tab.
  - Fill in Name (`Starlight Scout`), Directive (`Coordinate chores`), select a 16×16 Stencil Preset (e.g. `Robot`), select an Inhabitant, and click **Mint Personal Access Token**.
  - Verify the token (`jlight_ag_...`) appears with a copy button and the agent is displayed on the Bot Wall.

- [ ] **Step 3: Test Agent Self-Registration via CLI (Pull Flow)**
  - In a terminal, run:
    ```bash
    pnpm run jlight connect --name "Rover-1" --rune "🔭" --directive "Scan chores"
    ```
  - Note the generated `BOT-XXXX` code and click/open the provided verification link.
  - In the browser modal, approve the bot and bind it to an inhabitant.
  - Verify the CLI receives approval, saves `.jlight.json`, and outputs `Authentication Approved!`.

- [ ] **Step 4: Execute CLI Domain Actions & Check Provenance Badges**
  - In the terminal, create resources:
    ```bash
    pnpm run jlight events create "Stargazing Session" --date 2026-10-25 --start 20:00 --end 21:00
    pnpm run jlight chores create "Clean telescope lens" --points 3
    pnpm run jlight lists create "Solar filters" --type grocery
    ```
  - In the UI, navigate to Calendar, Chores, and Lists:
    - Verify that each created item displays an agent badge with the agent's rune or 16×16 stencil.
    - Hover or tap the badge to inspect the agent's directive and bound family member.

- [ ] **Step 5: Test The Buff (`∅`) Revocation**
  - In the Bot Wall modal, click **Buff (∅)** on an active agent.
  - Verify the status becomes `revoked` and rune changes to `∅`.
  - Run `pnpm run jlight whoami` or attempt a write action with that agent's token: verify it is rejected with `403 Forbidden`.

- [ ] **Step 6: Automated Test Verification**
  - Run `pnpm run test:unit` (Zero AST hook violations, stencil roundtrip tests pass).
  - Run `pnpm run test:system` (Full 7-section mocked SQLite end-to-end suite passes).
  - Run `pnpm run build` (Next.js 15 production build compiles cleanly).

---

### ⚠️ Caveats & Follow-ups
- **Worktree isolation**: All work is safely committed on `feat/agent-bot-wall`.
- **Browser-safety**: Stencil and rune helpers are isolated in `src/lib/agent-types.ts` to prevent `@libsql/client` Webpack bundling into the client bundle.
- **Local SQLite**: When testing on a fresh machine or worktree, remember to run `pnpm run db:push` and `pnpm run db:seed`.
