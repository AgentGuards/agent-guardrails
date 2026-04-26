// GET /api/events — Server-Sent Events stream.
// Streams 4 event types from the SSE emitter, scoped to the authenticated wallet's policies.

import express from "express";
import { prisma } from "../../db/client.js";
import { sseEmitter, type SSEEventName } from "../../sse/emitter.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const eventsRouter: express.Router = express.Router();

const SSE_EVENTS: SSEEventName[] = [
  "new_transaction",
  "verdict",
  "agent_paused",
  "report_ready",
];

const POLICY_REFRESH_MS = 60_000; // Refresh owned policies every 60s
const KEEPALIVE_MS = 30_000;     // Send keepalive every 30s

eventsRouter.get("/", async (req, res) => {
  const walletPubkey = (req as unknown as AuthenticatedRequest).walletPubkey;

  // Load the set of policy pubkeys owned by this wallet for filtering
  let policySet = await loadPolicySet(walletPubkey);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial keepalive
  res.write(":ok\n\n");

  // Periodically refresh the policy set so new policies are picked up
  const refreshInterval = setInterval(async () => {
    try {
      policySet = await loadPolicySet(walletPubkey);
    } catch {
      // Non-fatal — keep using the existing set
    }
  }, POLICY_REFRESH_MS);

  // Periodic keepalive to prevent proxy timeouts
  const keepaliveInterval = setInterval(() => {
    res.write(":ping\n\n");
  }, KEEPALIVE_MS);

  // Create listeners for each event type, filtering by policy ownership
  const listeners = SSE_EVENTS.map((eventName) => {
    const handler = (data: unknown) => {
      const payload = data as { policyPubkey?: string };
      // Drop events without policyPubkey — never forward unscoped events (H10)
      if (!payload.policyPubkey) return;
      // Only forward if owned by this wallet
      if (!policySet.has(payload.policyPubkey)) return;

      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    sseEmitter.on(eventName, handler);
    return { eventName, handler };
  });

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(refreshInterval);
    clearInterval(keepaliveInterval);
    for (const { eventName, handler } of listeners) {
      sseEmitter.off(eventName, handler);
    }
  });
});

async function loadPolicySet(walletPubkey: string): Promise<Set<string>> {
  const policies = await prisma.policy.findMany({
    where: { owner: walletPubkey },
    select: { pubkey: true },
  });
  return new Set(policies.map((p) => p.pubkey));
}
