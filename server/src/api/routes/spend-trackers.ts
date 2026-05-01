// GET /api/spend-trackers — spend tracker rows + policy fields for fleet health UI.

import express from "express";
import { prisma } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const spendTrackersRouter: express.Router = express.Router();

spendTrackersRouter.get("/", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const ownedPolicies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      select: { pubkey: true },
    });
    const policyPubkeys = ownedPolicies.map((p) => p.pubkey);

    if (policyPubkeys.length === 0) {
      res.json({ spendTrackers: [] });
      return;
    }

    const rows = await prisma.spendTracker.findMany({
      where: { policyPubkey: { in: policyPubkeys } },
      include: {
        policy: {
          select: {
            label: true,
            isActive: true,
            anomalyScore: true,
            dailyBudgetLamports: true,
          },
        },
      },
    });

    const spendTrackers = rows.map((row) => ({
      policyPubkey: row.policyPubkey,
      windowStart: row.windowStart,
      txnCount24h: row.txnCount24h,
      lamportsSpent24h: row.lamportsSpent24h.toString(),
      lastTxnTs: row.lastTxnTs,
      lastTxnProgram: row.lastTxnProgram,
      uniqueDestinations24h: row.uniqueDestinations24h,
      maxSingleTxnLamports: row.maxSingleTxnLamports.toString(),
      failedTxnCount24h: row.failedTxnCount24h,
      uniquePrograms24h: row.uniquePrograms24h,
      lamportsSpent1h: row.lamportsSpent1h.toString(),
      windowStart1h: row.windowStart1h,
      consecutiveHighAmountCount: row.consecutiveHighAmountCount,
      updatedAt: row.updatedAt,
      policy: {
        label: row.policy.label,
        isActive: row.policy.isActive,
        anomalyScore: row.policy.anomalyScore,
        dailyBudgetLamports: row.policy.dailyBudgetLamports.toString(),
      },
    }));

    res.json({ spendTrackers });
  } catch (err) {
    console.error("[api/spend-trackers] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
