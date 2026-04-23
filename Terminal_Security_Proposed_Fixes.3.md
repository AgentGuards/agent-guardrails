# Terminal Security — Proposed Fixes



> Six independent security gaps have been identified in the WebSocket terminal infrastructure. This document describes the recommended fix for each — no alternatives listed, no noise.

---

## Executive Summary

AO is a local, single-user tool. All fixes are scoped to that reality — no user accounts, no external auth providers, no multi-tenant concerns.

Four gaps should be shipped immediately. Connection auth is defence-in-depth and can follow. Observability runs alongside everything else.

### Priority Summary

| Priority | Gap | Recommended Fix | Affected Files | Effort |
|---|---|---|---|---|
| P1 — Immediate | Gap 1: Network Binding | Env-based loopback bind | `direct-terminal-ws.ts:104` | ~2 lines |
| P1 — Immediate | Gap 3: Session Ownership | `TerminalTarget` type + metadata check + `tmuxName` attachment | `mux-websocket.ts:239, :492` | ~25 lines |
| P1 — Immediate | Gap 4: WS Protocol | Type check + size limit + session-must-be-open guard | `mux-websocket.ts:536` | ~5 lines |
| P1 — Immediate | Gap 5: Rate Limiting | In-process sliding window per remote IP | `direct-terminal-ws.ts:64` | ~25 lines |
| P2 — Defence-in-depth | Gap 2: Connection Auth | Auto-generated startup token on WS upgrade | `direct-terminal-ws.ts:64`, `start-all.ts`, `MuxProvider.tsx` | ~50 lines |
| Ongoing | Observability | `recordSecurityEvent` to stderr (JSON) | `terminal-observability.ts` | ~20 lines |

> Gap 1 is a single independent change — ship it first. Gaps 3, 4, and 5 all touch the upgrade handler or `mux-websocket.ts` and can ship together. Gap 2 must cover **both** startup paths or it provides false assurance.

---

## Gap 1 — Network Binding

### Problem

The WebSocket server on port `14801` listens on all network interfaces (`0.0.0.0`) instead of loopback only. Anyone on the same LAN, VPN, or Wi-Fi can reach it without any authentication.

**Affected files:** `packages/web/server/direct-terminal-ws.ts:57`, `:104`

```typescript
// current — no hostname → Node.js defaults to 0.0.0.0
server.listen(PORT);
```

### Recommended Fix

Bind to `127.0.0.1` by default. Expose an environment variable for users who have a deliberate reason to open the server (tunnelled setups, team servers).

```typescript
const HOST = process.env.DIRECT_TERMINAL_HOST ?? "127.0.0.1";
server.listen(PORT, HOST, () => {
  console.log(`[DirectTerminal] WS server on ${HOST}:${PORT}`);
});
```

This is the highest-leverage change in this document — one line that closes LAN/VPN exposure at the OS level. The log message reflects the actual bound address, not just the port.

---

## Gap 2 — No Connection-Level Authentication

### Problem

The WebSocket upgrade handler receives the HTTP request but never inspects it. Any process that can reach the port can establish a connection. After Gap 1 is fixed the threat narrows to: a malicious process running as the same OS user, or a cross-origin browser request.

**Affected files:** `packages/web/server/mux-websocket.ts`, `packages/web/src/providers/MuxProvider.tsx`, `packages/web/src/lib/mux-protocol.ts`, `/api/runtime/terminal` route

### Why other approaches don't work

| Approach | Problem |
|---|---|
| Custom header (`x-ao-token`) | Browser `WebSocket` API does not allow custom headers — rejected at the client |
| Cookie | Only works on the proxy path. The direct port path (`localhost:14801`) is a different origin — cookies are not sent |
| URL token (`?token=xyz`) | Visible in server logs, browser history, and Referer headers |
| **First-message auth** | Works for both the proxy path and the direct port path — the only approach that does |

### Recommended Fix — First-message auth

WebSocket messages are ordered. If the auth message is sent first, the server receives it first. All subsequent messages queue behind it. The server rejects any `terminal.open` that arrives before the connection is authenticated — no buffering state machine needed.

`MuxProvider.tsx` already has the exact structure needed. The `useEffect` at line 192 fetches `/api/runtime/terminal` before opening the socket. The `open` handler at line 98 already sends multiple messages in sequence. Auth slots in at the top of that sequence.

---

**Step 1 — Extend the protocol (`mux-protocol.ts`)**

```typescript
// Client → Server
export type ClientMessage =
  | { ch: "auth"; token: string }                                         // add
  | { ch: "terminal"; id: string; type: "data"; data: string }
  | { ch: "terminal"; id: string; type: "resize"; cols: number; rows: number }
  | { ch: "terminal"; id: string; type: "open" }
  | { ch: "terminal"; id: string; type: "close" }
  | { ch: "system"; type: "ping" }
  | { ch: "subscribe"; topics: ("sessions")[] };

// Server → Client
export type ServerMessage =
  | { ch: "auth"; type: "ok" }                                            // add
  | { ch: "auth"; type: "error"; message: string }                        // add
  | { ch: "terminal"; id: string; type: "data"; data: string }
  // ... rest unchanged
```

---

**Step 2 — Deliver the token via `/api/runtime/terminal`**

The init fetch in `MuxProvider.tsx` already calls this route. Add `terminalToken` to the response — a short-lived HMAC of `{sessionSecret}.{expiry}`, signed with a startup secret from `process.env`. Both `mux-websocket.ts` and the direct terminal server verify against the same secret.

Token issuance is same-origin (Next.js API route), called before the WebSocket opens, and travels over HTTPS in production / localhost HTTP in dev. No new fetch, no new UI — one field added to an existing response.

```typescript
// In MuxProvider.tsx useEffect init — extend the existing fetch:
const res = await fetch("/api/runtime/terminal");
if (res.ok) {
  const data = (await res.json()) as RuntimeTerminalConfig & { terminalToken?: string };
  runtimeConfigRef.current = {
    directTerminalPort: normalizePortValue(data.directTerminalPort),
    proxyWsPath:        normalizePathValue(data.proxyWsPath),
    terminalToken:      typeof data.terminalToken === "string" ? data.terminalToken : undefined,
  };
}
```

---

**Step 3 — Send auth first on socket open (`MuxProvider.tsx`)**

```typescript
ws.addEventListener("open", () => {
  if (isDestroyedRef.current) { ws.close(); return; }

  // Auth must be first — server rejects terminal messages before this
  if (runtimeConfigRef.current.terminalToken) {
    const authMsg: ClientMessage = { ch: "auth", token: runtimeConfigRef.current.terminalToken };
    ws.send(JSON.stringify(authMsg));
  }

  // Re-open previously opened terminals — unchanged
  for (const terminalId of openedTerminalsRef.current) {
    const openMsg: ClientMessage = { ch: "terminal", id: terminalId, type: "open" };
    ws.send(JSON.stringify(openMsg));
  }

  // Subscribe to sessions — unchanged
  const subMsg: ClientMessage = { ch: "subscribe", topics: ["sessions"] };
  ws.send(JSON.stringify(subMsg));
});
```

---

**Step 4 — Enforce auth state per connection (`mux-websocket.ts`)**

```typescript
wss.on("connection", (ws) => {
  let authenticated = !tokenRequired; // if no token configured, pass through

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString("utf8")) as ClientMessage;

    if (msg.ch === "auth") {
      if (verifyToken(msg.token)) {
        authenticated = true;
        ws.send(JSON.stringify({ ch: "auth", type: "ok" } satisfies ServerMessage));
      } else {
        ws.send(JSON.stringify({ ch: "auth", type: "error", message: "Invalid token" } satisfies ServerMessage));
        recordSecurityEvent("terminal_auth_failed", { ip });
        ws.close(1008, "Unauthorized");
      }
      return;
    }

    if (!authenticated) {
      ws.close(1008, "Unauthorized");
      return;
    }

    // ... existing message handling unchanged
  });
});
```

> **Critical:** Token generation must cover **both** startup paths — `start-all.ts` (prod) and `concurrently` in `packages/web/package.json` (dev). Implementing only one path leaves the other unprotected.

---

## Gap 3 — Missing Session Ownership Check

### Problem

The WS `open` handler calls `resolveTmuxSession(id)` directly. This function does a prefix-and-exact-match search — if a tmux session named exactly `id` exists (even one not created by AO), it attaches to it. There is no check that the session belongs to AO.

**Affected file:** `packages/web/server/mux-websocket.ts:239`, `:492`

### Recommended Fix

Introduce an explicit `TerminalTarget` type. Before opening a PTY, read AO metadata for the session and use `metadata.tmuxName` as the attachment target. Reject sessions with no AO metadata or no `tmuxName` field.

```typescript
type TerminalTarget = { sessionId: string; tmuxName: string };

function resolveTerminalTarget(id: string, dataDir: string): TerminalTarget | null {
  const meta = readMetadata(dataDir, id);
  if (!meta?.tmuxName) return null;
  return { sessionId: id, tmuxName: meta.tmuxName };
}

// In the open handler:
const target = resolveTerminalTarget(id, dataDir);
if (!target) {
  recordSecurityEvent("terminal_invalid_session", { sessionId: id });
  ws.send(JSON.stringify({ type: "error", id, message: "Session not found" }));
  return;
}

terminalManager.open({ id, tmuxName: target.tmuxName });
recordSecurityEvent("terminal_opened", { sessionId: id });
```

This closes both the ownership check and the `tmuxName` exact-match bypass in a single change using the existing `readMetadata` from `metadata.ts` — no new infrastructure needed.

> **Backward compatibility:** Sessions created before the `tmuxName` field existed will be rejected. If migration is needed, run `resolveTmuxSession` once at session load time and backfill `tmuxName` into the metadata file. Do **not** keep `resolveTmuxSession` as a live fallback — that reintroduces the bypass.

---

## Gap 4 — Input Sanitization on the WebSocket Path

### Problem

The HTTP send route calls `stripControlChars()` on input. The mux WebSocket path does not. The fix is **not** to apply the same sanitizer — the two paths carry fundamentally different payloads.

| Path | Payload type | Example |
|---|---|---|
| `POST /api/sessions/[id]/send` | User-level prose message | `"please confirm"` |
| `WS /mux { type: "data" }` | Raw terminal keystrokes | Arrow key `\x1b[A`, Ctrl-C `\x03` |

Applying `stripControlChars` to the WS path strips `\x03` (Ctrl-C), `\x09` (Tab), `\x1b` (ESC / all arrow keys) — the terminal becomes non-functional.

**Affected file:** `packages/web/server/mux-websocket.ts:536`

### Recommended Fix

Validate message structure and session state. Do not touch the payload bytes.

```typescript
const MAX_TERMINAL_INPUT_LENGTH = 10_000;

} else if (type === "data" && "data" in msg) {
  if (typeof msg.data !== "string") return;               // 1. type safety
  if (msg.data.length > MAX_TERMINAL_INPUT_LENGTH) {
    recordSecurityEvent("terminal_oversized_write", { sessionId: id, length: msg.data.length });
    return;                                                // 2. size limit
  }
  if (!subscriptions.has(id)) return;                     // 3. session must be open

  terminalManager.write(id, msg.data);
}
```

The HTTP send route keeps `stripControlChars` unchanged — correct for its channel, should not change.

---

## Gap 5 — No Rate Limiting on WebSocket Upgrades

### Problem

The upgrade handler has no throttle on how many connections a single IP can attempt. There is nothing to slow down a local process hammering the endpoint or a cross-origin browser running a loop.

**Affected file:** `packages/web/server/direct-terminal-ws.ts:64`

### Recommended Fix

An in-process sliding-window counter keyed by remote IP. No external dependency — a `Map` and two small functions added at the module level, above `createDirectTerminalServer()`.

```typescript
const connectionAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS       = 60_000;
const MAX_CONNECTIONS_PER_WINDOW = 10;
const RATE_LIMIT_MAX_ENTRIES     = 10_000;

function pruneRateLimiter(): void {
  if (connectionAttempts.size < RATE_LIMIT_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of connectionAttempts) {
    if (now > entry.resetAt) connectionAttempts.delete(key);
  }
}

function checkRateLimit(ip: string): boolean {
  pruneRateLimiter();
  const now   = Date.now();
  const entry = connectionAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    connectionAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_CONNECTIONS_PER_WINDOW) return false;
  entry.count++;
  return true;
}
```

The upgrade handler change is three lines at the top — before any pathname routing or session logic:

```typescript
server.on("upgrade", (request, socket, head) => {
  const ip = request.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip)) {
    recordSecurityEvent("terminal_rate_limited", { ip, endpoint: "/mux" });
    socket.destroy();
    return;
  }

  const pathname = new URL(request.url ?? "/", "ws://localhost").pathname;
  // ... existing routing unchanged
});
```

`pruneRateLimiter` only runs when the Map is at the cap — not on every request. The Map never grows beyond 10,000 IPs regardless of unique sources hitting the server.

---

## Observability

### What and where

**File:** `packages/web/server/terminal-observability.ts`

This file already exists and already imports from core. Two additions: a `SecurityEvent` type union and a `recordSecurityEvent` function that writes structured JSON to stderr.

```typescript
type SecurityEvent =
  | "terminal_rate_limited"
  | "terminal_invalid_session"
  | "terminal_ownership_denied"
  | "terminal_opened"
  | "terminal_oversized_write"
  | "terminal_closed";

export function recordSecurityEvent(
  event: SecurityEvent,
  fields: Record<string, unknown>,
): void {
  process.stderr.write(
    JSON.stringify({ ts: new Date().toISOString(), event, ...fields }) + "\n",
  );
}
```

No config dependency, no observer dependency, no try/catch needed — `process.stderr.write` is synchronous and cannot throw in Node.js. It fires regardless of whether `loadConfig()` would succeed.

### Call sites

| Location | Trigger | Event emitted |
|---|---|---|
| `direct-terminal-ws.ts` — upgrade handler | Rate limit rejection | `terminal_rate_limited` |
| `mux-websocket.ts` — open failure (~line 558) | Bad session ID | `terminal_invalid_session` |
| `mux-websocket.ts` — after `terminalManager.open()` succeeds | Successful attach | `terminal_opened` |
| `mux-websocket.ts` — data branch, size guard | Oversized write rejected | `terminal_oversized_write` |

For the `terminal_opened` event, `inferProjectId` (already in `terminal-observability.ts`) can resolve the project from the session ID:

```typescript
// In mux-websocket.ts, after terminalManager.open(id) succeeds:
const { config } = createObserverContext("terminal");
const projectId  = inferProjectId(config, id);
recordSecurityEvent("terminal_opened", { sessionId: id, projectId });
```

For rejection events, the project ID is unknown — pass `sessionId` only if it was supplied in the message, otherwise just the IP.

### What pm2 sees

pm2 captures both stdout and stderr into `~/.pm2/logs/{name}-error.log` by default. With this in place:

```bash
# clean audit trail
grep '"event"' ~/.pm2/logs/ao-error.log

# filter with jq — no code changes needed later
jq 'select(.event)' ~/.pm2/logs/ao-error.log
```

---

## Recommended Shipping Order

| Step | What | Notes |
|---|---|---|
| 1 | Gap 1 | Single 2-line change. Ship independently. Closes LAN/VPN exposure at OS level. |
| 2 | Gaps 3 + 4 + 5 + Observability | Gaps 3 and 4 are both in `mux-websocket.ts`. Gap 5 and observability sit in the upgrade handler and `terminal-observability.ts`. Ship as a coherent batch. |
| 3 | Gap 2 | Must cover both `start-all.ts` (prod) and `pnpm dev` path. Do not ship if only one path is covered. |

---

## What to Skip — and Why

| Idea | Reason to Skip |
|---|---|
| `stripControlChars` on WS mux input | Strips arrow keys, Ctrl-C, Tab — terminal becomes non-functional. |
| Per-session tokens | Same door, one extra hop, no real barrier. |
| Gap 3 existence-check only | Does not close the exact-match tmux bypass; creates false sense of security. |
| NextAuth / OAuth | Multi-user concern. AO has one local user. |
| mTLS | Browser UX is unusable. Disproportionate for a local tool. |
| Firewall rules only | Not self-contained; breaks on firewall reset; requires per-machine setup. |
| Unix sockets | Browsers need a TCP bridge — reintroduces the same problem. |
| External rate limiter (Redis etc.) | No external services in a local tool. In-process Map is sufficient. |

---

## Recommended Test Cases

### Gap 1 — Network Binding

- Server binds to `127.0.0.1` when `DIRECT_TERMINAL_HOST` is not set.
- Server binds to the value of `DIRECT_TERMINAL_HOST` when explicitly set.
- Log output includes the actual bound host.

### Gap 3 — Session Ownership

- WS `open` with no AO metadata for the session ID → error response, no PTY spawned.
- WS `open` with metadata present but `tmuxName` missing → error response, no PTY spawned.
- WS `open` with valid AO metadata → attaches using `metadata.tmuxName`, not raw `id`.
- WS `open` where a same-named non-AO tmux session exists → attaches to AO-owned session via `tmuxName`.

### Gap 4 — WS Protocol Hardening

- WS `data` with non-string `msg.data` → silently dropped, no write to PTY.
- WS `data` exceeding `MAX_TERMINAL_INPUT_LENGTH` → silently dropped, `terminal_oversized_write` emitted.
- WS `data` before `open` has been sent → silently dropped.
- WS `data` after valid `open` with `\x03` (Ctrl-C) → passes through to PTY unchanged.
- WS `data` after valid `open` with `\x1b[A` (arrow up) → passes through unchanged.
- WS `data` after valid `open` with `\x09` (Tab) → passes through unchanged.
- `HTTP POST /api/sessions/:id/send` strips control characters (existing behaviour preserved).

### Gap 5 — Rate Limiting

- First 10 upgrade attempts from the same IP within 60 s → allowed.
- 11th attempt from the same IP within the window → socket destroyed, `terminal_rate_limited` emitted.
- After the 60 s window resets → same IP is allowed again.
- 10,001 unique IPs → `pruneRateLimiter` evicts expired entries; Map stays bounded.
- Rate limit does not fire for a new IP that has not hit the threshold.

### Observability

- `terminal_rate_limited` emitted to stderr as valid JSON when upgrade is rate-limited.
- `terminal_invalid_session` emitted when `resolveTerminalTarget` returns null.
- `terminal_opened` emitted with `sessionId` and `projectId` after successful attach.
- `terminal_oversized_write` emitted with `sessionId` and `length` when size guard triggers.
- All events include an ISO 8601 `ts` field.

### Gap 2 — Connection Auth (if implemented)

- First message `{ ch: "auth", token: <valid> }` → server responds `{ ch: "auth", type: "ok" }`, subsequent messages processed.
- First message `{ ch: "auth", token: <invalid> }` → server responds `{ ch: "auth", type: "error" }`, `terminal_auth_failed` emitted, socket closed with code 1008.
- Any `terminal.open` message sent before auth → socket closed immediately.
- No token configured (`tokenRequired = false`) → connection passes through without auth message.
- `/api/runtime/terminal` returns `terminalToken` field when token is configured.
- `MuxProvider.tsx` sends auth as the first message on socket open, before re-opens and subscriptions.
- Dev startup (`pnpm dev`) generates a token — not only prod `start-all.ts`.

---

## File Reference

| File | Role |
|---|---|
| `packages/web/server/direct-terminal-ws.ts` | Gap 1: env-based bind address; Gap 5: rate limiter in upgrade handler |
| `packages/web/server/mux-websocket.ts` | Gap 2: per-connection auth state; Gap 3: `TerminalTarget` type, metadata ownership check, `tmuxName` attachment; Gap 4: protocol hardening on write path |
| `packages/web/server/terminal-observability.ts` | `SecurityEvent` type + `recordSecurityEvent` function |
| `packages/web/src/lib/mux-protocol.ts` | Gap 2: `ClientMessage` extended with `{ ch: "auth" }` variant; `ServerMessage` extended with auth responses |
| `packages/core/src/metadata.ts` | `readMetadata` — already exists, no changes needed |
| `packages/web/server/tmux-utils.ts` | `resolveTmuxSession` — understand before touching Gap 3; the exact-match path is what creates the bypass |
| `packages/web/server/start-all.ts` | Gap 2: token generation for prod startup |
| `packages/web/package.json` (dev script) | Gap 2: token generation must also cover `pnpm dev` |
| `packages/web/src/providers/MuxProvider.tsx` | Gap 2: fetch token from /api/runtime/terminal; send auth as first WS message on open |
| `packages/web/src/app/api/sessions/[id]/send/route.ts` | Gap 4: keep `stripControlChars` here — do NOT port to mux path |
| `packages/web/src/lib/validation.ts` | `stripControlChars` — HTTP path only |
