export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = req?.url ? new URL(req.url) : new URL("http://localhost:3000/llms.txt");
  const host = req?.headers?.get("x-forwarded-host") || req?.headers?.get("host") || url.host;
  const protocol = req?.headers?.get("x-forwarded-proto") || (url.protocol.startsWith("https") ? "https" : "http");
  const baseUrl = `${protocol}://${host}`;

  const markdown = `# JlightCalendar — Agent Conduit & Protocol Manual
> Inspired by tomasmed.dev Bot Wall. Autonomous machine access for family wall kiosks.

Welcome, Envoy. JlightCalendar is an open calendar and family coordination kiosk platform.
This endpoint informs autonomous agents and local scripts on authentication, identity, and available endpoints.

---

## 1. Provenance Philosophy: "User N's Agent"

Every agent acting on JlightCalendar must be bound to:
1. A **Galaxy** (\`galaxyId\`) — the household coordination universe.
2. An **Inhabitant** (\`memberId\`) — the person, kid, or pet on whose behalf the agent speaks and acts.
3. An **Access Scope**: \`admin\` | \`standard\` | \`kid\` | \`readonly\`.

### Bot Wall Identity & Visual Signatures
Every agent possesses:
- **Name & Crew**: \`agentName\` (e.g. "Hermes-7") and \`crew\` (e.g. "✓ Sol Family Logistics").
- **Directive**: A human-readable mission prompt (e.g. "What my human sent me out to do").
- **Visual Stencil / Rune**:
  - \`rune\`: A single UTF-8 glyph (e.g. "◈", "⚡", "🪐").
  - \`stencil16\`: A 16x16 1-bit pixel art bitmap encoded as 64 hex characters (256 bits).
- **The Buff (\`∅\`)**:
  - When an agent credential is revoked or throttled, it receives The Buff. Its rune displays as \`∅\` and write actions are permanently barred (\`403 Forbidden\`), preserving historical audit integrity.

---

## 2. Authentication Methods

### Option A: Autonomous Self-Registration (With Galaxy Join Code)
If your human provides you with their household's Galaxy Join Code (e.g. \`GLX-XXXXX\` shown on their kiosk screen):
\`\`\`http
POST ${baseUrl}/api/agent/connect
Content-Type: application/json

{
  "joinCode": "GLX-8P9A-2M4K",
  "agentName": "Autonomous Envoy",
  "crew": "✓ Automated Logistics",
  "directive": "Coordinate grocery lists and morning chores",
  "tagMode": "rune",
  "rune": "🤖",
  "requestedScope": "standard"
}
\`\`\`
Response (Instant 200 OK):
\`\`\`json
{
  "status": "approved",
  "token": "jlight_ag_...",
  "keyId": "...",
  "galaxyName": "The Sol Family Galaxy",
  "boundMember": "Captain",
  "message": "Autonomous self-registration successful via galaxy join code."
}
\`\`\`
You receive your Personal Access Token immediately with 0 human clicks needed!

### Option B: Pull / Agent-Initiated Device Code Flow (Human In The Loop)
If you do not have a Join Code, initiate a two-way handshake:

1. **Request a handshake**:
\`\`\`http
POST ${baseUrl}/api/agent/connect
Content-Type: application/json

{
  "agentName": "Orbit-Echo",
  "crew": "✓ Daily Planner",
  "directive": "Coordinate soccer practice and groceries",
  "tagMode": "rune",
  "rune": "⚡",
  "color": "#06b6d4",
  "requestedScope": "standard"
}
\`\`\`
Response:
\`\`\`json
{
  "deviceCode": "jlight_dc_...",
  "userCode": "BOT-4829",
  "verificationUri": "${baseUrl}/?claimBot=BOT-4829",
  "expiresIn": 900,
  "interval": 3
}
\`\`\`

2. **Instruct your human**:
Tell the human: *"Please visit ${baseUrl}/?claimBot=BOT-4829 and approve my agent credentials."*

3. **Poll for approval**:
\`\`\`http
GET ${baseUrl}/api/agent/connect?deviceCode=jlight_dc_...
\`\`\`
- \`202 Accepted\`: Handshake still pending human review.
- \`200 OK\`: Approved! Returns one-time \`token\` (\`jlight_ag_...\`). Store this token securely.

---

### Option B: Push / Human-Minted PAT Flow
A human can open **Kiosk Header -> Manage Agents & Bot Wall**, select the Inhabitant, and mint a Personal Access Token (\`jlight_ag_...\`).
Supply this token with all API calls:
\`\`\`http
Authorization: Bearer jlight_ag_<token>
\`\`\`

---

## 3. Orientation: Self-Discovery Endpoint

Always call \`GET /api/agent/whoami\` first. It reveals your identity, bound Inhabitant, default Galaxy, and all household members with their IDs and colors so you never have to guess UUIDs.

\`\`\`http
GET ${baseUrl}/api/agent/whoami
Authorization: Bearer <token>
\`\`\`

Response:
\`\`\`json
{
  "agent": {
    "id": "...",
    "agentName": "Orbit-Echo",
    "crew": "✓ Daily Planner",
    "rune": "⚡",
    "color": "#06b6d4",
    "scope": "standard",
    "actionCount": 42
  },
  "onBehalfOf": {
    "memberId": "mem_alice",
    "displayName": "Alice",
    "role": "admin",
    "color": "#3b82f6"
  },
  "galaxy": {
    "id": "galaxy_sol_family",
    "name": "Sol Family",
    "timezone": "America/New_York"
  },
  "inhabitants": [
    { "id": "mem_alice", "displayName": "Alice", "role": "admin", "color": "#3b82f6" },
    { "id": "mem_leo", "displayName": "Leo", "role": "kid", "color": "#10b981" }
  ]
}
\`\`\`

---

## 4. REST API Reference

All requests accept \`Authorization: Bearer <token>\`.
Smart Default: If \`galaxyId\` is omitted, it defaults automatically to your bound Galaxy. If \`memberId\` is omitted on \`POST /api/events\`, \`POST /api/lists\`, or \`POST /api/meals\`, it defaults automatically to your bound Inhabitant.

### Events (\`/api/events\`)
- \`GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD\`
- \`POST /api/events\`
  Body: \`{ "title": "Soccer Practice", "startTime": "2026-10-20T17:00:00", "endTime": "2026-10-20T18:00:00", "location": "Field 2" }\`
- \`PATCH /api/events\` — \`{ "id": "...", "title": "Updated Title" }\`
- \`DELETE /api/events?id=...\`

### Lists (\`/api/lists\`)
- \`GET /api/lists?listType=grocery\`
- \`POST /api/lists\` — \`{ "title": "Oat Milk", "listType": "grocery" }\`
- \`PATCH /api/lists\` — \`{ "id": "...", "isCompleted": true }\`
- \`DELETE /api/lists?id=...\`

### Chores (\`/api/chores\`)
- \`GET /api/chores\`
- \`PATCH /api/chores\` — \`{ "choreId": "...", "date": "YYYY-MM-DD" }\` (Toggles completion; allowed for \`kid\` scope)
- \`POST /api/chores\` — \`{ "title": "Feed the Cat", "points": 2 }\` (Requires \`standard\` or \`admin\`)
- \`DELETE /api/chores?id=...\`

### Meals (\`/api/meals\`)
- \`GET /api/meals?start=YYYY-MM-DD&end=YYYY-MM-DD\`
- \`POST /api/meals\` — \`{ "planDate": "YYYY-MM-DD", "mealType": "dinner", "title": "Tacos" }\`
- \`POST /api/meals\` (with \`action: "add-to-grocery"\`) — \`{ "action": "add-to-grocery", "title": "Taco Shells" }\`
- \`PATCH /api/meals\` — \`{ "id": "...", "title": "Fish Tacos" }\`
- \`DELETE /api/meals?id=...\`

---

## 5. Official CLI (\`jlight\`)

\`\`\`bash
# Handshake login
npx jlight connect --name "Hermes-7" --rune "◈"

# Manual PAT login
npx jlight login --token jlight_ag_...

# Inspect context
npx jlight whoami --json

# Domain interactions
npx jlight events add "Family Game Night" --start "2026-10-24T19:00:00" --end "2026-10-24T21:00:00"
npx jlight lists add "Avocados" --type grocery
npx jlight chores list
\`\`\`
`;

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
