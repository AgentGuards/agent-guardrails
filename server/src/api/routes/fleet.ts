// GET /api/fleet/summary — aggregated fleet metrics for the authenticated wallet.

import express from "express";
import { prisma } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const fleetRouter: express.Router = express.Router();

fleetRouter.get("/summary", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const ownedPolicies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      select: { pubkey: true },
    });
    const policyPubkeys = ownedPolicies.map((p) => p.pubkey);

    if (policyPubkeys.length === 0) {
      res.json({
        activeAgents: 0,
        pausedAgents: 0,
        incidentsLast24h: 0,
        incidentsPrev24h: 0,
        totalLamportsSpent24h: "0",
        totalLamportsSpentPrev24h: null,
      });
      return;
    }

    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const boundary24h = new Date(now - ms24h);
    const boundary48h = new Date(now - 2 * ms24h);

    const [
      activeAgents,
      pausedAgents,
      incidentsLast24h,
      incidentsPrev24h,
      trackers,
    ] = await Promise.all([
      prisma.policy.count({
        where: { owner: walletPubkey, isActive: true },
      }),
      prisma.policy.count({
        where: { owner: walletPubkey, isActive: false },
      }),
      prisma.incident.count({
        where: {
          policyPubkey: { in: policyPubkeys },
          pausedAt: { gte: boundary24h },
        },
      }),
      prisma.incident.count({
        where: {
          policyPubkey: { in: policyPubkeys },
          pausedAt: { gte: boundary48h, lt: boundary24h },
        },
      }),
      prisma.spendTracker.findMany({
        where: { policyPubkey: { in: policyPubkeys } },
        select: { lamportsSpent24h: true },
      }),
    ]);

    let totalSpent = BigInt(0);
    for (const t of trackers) {
      totalSpent += t.lamportsSpent24h;
    }

    res.json({
      activeAgents,
      pausedAgents,
      incidentsLast24h,
      incidentsPrev24h,
      totalLamportsSpent24h: totalSpent.toString(),
      totalLamportsSpentPrev24h: null,
    });
  } catch (err) {
    console.error("[api/fleet/summary] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
