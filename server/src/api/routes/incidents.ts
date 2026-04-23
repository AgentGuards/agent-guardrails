// GET /api/incidents — paginated incidents with judge verdicts.
// GET /api/incidents/:id — single incident with full report.
// Filtered to policies owned by the authenticated wallet.

import express from "express";
import { prisma } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const incidentsRouter: express.Router = express.Router();

// List incidents
incidentsRouter.get("/", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Find policies owned by this wallet
    const ownedPolicies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      select: { pubkey: true },
    });
    const policyPubkeys = ownedPolicies.map((p) => p.pubkey);

    if (policyPubkeys.length === 0) {
      res.json({ incidents: [], total: 0 });
      return;
    }

    const where = { policyPubkey: { in: policyPubkeys } };

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: { judgeVerdict: true },
        orderBy: { pausedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.incident.count({ where }),
    ]);

    res.json({ incidents, total });
  } catch (err) {
    console.error("[api/incidents] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Single incident with full report
incidentsRouter.get("/:id", async (req, res) => {
  try {
    const walletPubkey = (req as unknown as AuthenticatedRequest).walletPubkey;

    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: { judgeVerdict: true, policy: true },
    });

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    // Verify the caller owns this policy
    if (incident.policy.owner !== walletPubkey) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(incident);
  } catch (err) {
    console.error("[api/incidents/:id] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
