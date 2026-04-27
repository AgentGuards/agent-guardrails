// Express application entry point.
// Mounts worker router (webhook ingestion) and API router (REST + SSE + auth).

import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { corsMiddleware } from "./api/middleware/cors.js";
import { workerRouter, startPoller } from "./worker/index.js";
import { apiRouter } from "./api/index.js";

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(corsMiddleware);
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Worker module: Helius webhook ingestion + anomaly pipeline
// Mounted before express.json() so webhook can access the raw body for HMAC verification.
app.use(workerRouter);

// API module: REST routes + SSE stream + SIWS auth (all under /api)
app.use("/api", express.json(), apiRouter);

// Health check — used by load balancers and deployment readiness probes
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

let poller: { stop: () => void } | null = null;

const server = app.listen(env.PORT, () => {
  console.log(`[guardrails-server] listening on port ${env.PORT}`);

  // Start RPC polling fallback for missed webhook deliveries
  poller = startPoller();

  // Clean up expired auth sessions every 5 minutes
  setInterval(async () => {
    try {
      const unsigned = await prisma.authSession.deleteMany({
        where: { signedAt: null, expiresAt: { lt: new Date() } },
      });
      const expired = await prisma.authSession.deleteMany({
        where: { signedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      if (unsigned.count + expired.count > 0) {
        console.log(
          `[cleanup] deleted ${unsigned.count} unsigned + ${expired.count} expired sessions`,
        );
      }
    } catch (err) {
      console.error("[cleanup] session cleanup failed:", err);
    }
  }, 5 * 60 * 1000);
});

// Graceful shutdown — close DB connections and stop accepting requests
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`[guardrails-server] ${signal} received, shutting down…`);
    poller?.stop();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
