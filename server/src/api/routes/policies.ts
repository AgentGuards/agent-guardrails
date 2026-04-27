// GET /api/policies — all policies owned by the authenticated wallet.

import express from "express";
import { prisma } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const policiesRouter: express.Router = express.Router();

// Update policy label (DB-only field, not stored on-chain)
policiesRouter.patch("/:pubkey", async (req, res) => {
  try {
    const walletPubkey = (req as unknown as AuthenticatedRequest).walletPubkey;
    const { label } = req.body;

    if (typeof label !== "string") {
      res.status(400).json({ error: "label must be a string" });
      return;
    }

    const policy = await prisma.policy.findFirst({
      where: { pubkey: req.params.pubkey, owner: walletPubkey },
    });

    if (!policy) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }

    const updated = await prisma.policy.update({
      where: { pubkey: req.params.pubkey },
      data: { label: label.trim() || null },
    });

    res.json({
      ...updated,
      maxTxLamports: updated.maxTxLamports.toString(),
      dailyBudgetLamports: updated.dailyBudgetLamports.toString(),
      escalationThreshold: updated.escalationThreshold?.toString() ?? null,
    });
  } catch (err) {
    console.error("[api/policies/:pubkey PATCH] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

policiesRouter.get("/", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const policies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      orderBy: { createdAt: "desc" },
    });

    // Serialize bigint fields for JSON
    const serialized = policies.map((p) => ({
      ...p,
      maxTxLamports: p.maxTxLamports.toString(),
      dailyBudgetLamports: p.dailyBudgetLamports.toString(),
      escalationThreshold: p.escalationThreshold?.toString() ?? null,
    }));

    res.json({ policies: serialized });
  } catch (err) {
    console.error("[api/policies] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
