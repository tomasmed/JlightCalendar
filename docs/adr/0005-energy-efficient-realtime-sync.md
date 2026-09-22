# ADR 0005: Energy-Efficient Real-Time Synchronization (Server-Sent Events)

## Status
Accepted

## Context
When a family member adds milk to the grocery list on their phone or completes a chore in the kitchen, other devices and the wall display should update promptly.
We evaluated two primary paradigms:
1. **Bidirectional WebSockets**:
   - Pros: Full-duplex messaging.
   - Cons: Continuous TCP keep-alive pings, higher CPU/RAM overhead on low-power devices (Raspberry Pi/tablets), complex reconnection logic through reverse proxies and cellular networks.
2. **Server-Sent Events (SSE) with HTTP/2**:
   - Pros: Unidirectional from server to client, uses standard HTTP connections, automatically reconnects natively via browser `EventSource`, uses negligible CPU/battery, proxies cleanly through Cloudflare/Nginx/Tailscale.
   - Cons: Client sends mutations via standard REST/fetch requests rather than through the socket channel (which is actually a clean REST pattern anyway).

## Decision
Adopt **Server-Sent Events (SSE)** for push notifications from server to display clients:
- Clients open an SSE stream: `GET /api/sync/stream?householdId=...`
- Mutations (events added, chores checked, grocery items toggled) broadcast lightweight change events (`{ type: "CHORE_UPDATED", id: "..." }`) over the SSE stream.
- When an event arrives, client updates local cache or invalidates queries.
- If the stream is interrupted, the client reconnects automatically with an `Etag` / `Last-Event-ID` to replay any missed notifications.

## Consequences
- **Positive**: Low memory and compute overhead, zero heartbeat battery drain on portable companion devices, robust through home network drops.
- **Negative**: Unidirectional only, requiring standard HTTP POST/PATCH for client mutations.
