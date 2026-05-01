// GET /api/escalations — paginated escalation proposals for authenticated wallet.
// GET /api/escalations/:id — single escalation with reconstructed instruction.
// PATCH /api/escalations/:id — dashboard updates proposal PDA after on-chain creation.
// Filtered to policies owned by the authenticated wallet.

import express from "express";
import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { reconstructInstruction } from "../../worker/pipeline/reconstruct-instruction.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const escalationsRouter: express.Router = express.Router();

// List escalation proposals
escalationsRouter.get("/", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const rawLimit = Number.parseInt(req.query.limit as string, 10);
    const rawOffset = Number.parseInt(req.query.offset as string, 10);
    const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);

    const ownedPolicies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      select: { pubkey: true },
    });
    const policyPubkeys = ownedPolicies.map((p) => p.pubkey);

    if (policyPubkeys.length === 0) {
      res.json({ escalations: [], total: 0 });
      return;
    }

    const policyFilter = req.query.policy as string | undefined;
    const scopedPubkey =
      policyFilter && policyPubkeys.includes(policyFilter) ? policyFilter : undefined;

    const where = {
      policyPubkey: scopedPubkey ? scopedPubkey : { in: policyPubkeys },
    };

    const [escalations, total] = await Promise.all([
      prisma.escalationProposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.escalationProposal.count({ where }),
    ]);

    // Serialize bigints as strings for JSON
    const serialized = escalations.map((e) => ({
      ...e,
      amountLamports: e.amountLamports.toString(),
      transactionIndex: e.transactionIndex?.toString() ?? null,
    }));

    res.json({ escalations: serialized, total });
  } catch (err) {
    console.error("[api/escalations] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Single escalation with reconstructed instruction
escalationsRouter.get("/:id", async (req, res) => {
  try {
    const walletPubkey = (req as unknown as AuthenticatedRequest).walletPubkey;

    const escalation = await prisma.escalationProposal.findFirst({
      where: {
        id: req.params.id,
        policy: { owner: walletPubkey },
      },
      include: { txn: { include: { verdict: true } } },
    });

    if (!escalation) {
      res.status(404).json({ error: "Escalation not found" });
      return;
    }

    // Reconstruct the target instruction for Squads proposal creation
    const instruction = reconstructInstruction(escalation.txn);

    res.json({
      ...escalation,
      amountLamports: escalation.amountLamports.toString(),
      transactionIndex: escalation.transactionIndex?.toString() ?? null,
      txn: {
        ...escalation.txn,
        slot: escalation.txn.slot.toString(),
        amountLamports: escalation.txn.amountLamports?.toString() ?? null,
      },
      instruction,
    });
  } catch (err) {
    console.error("[api/escalations/:id] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dashboard updates escalation after creating Squads proposal on-chain
escalationsRouter.patch("/:id", async (req, res) => {
  try {
    const walletPubkey = (req as unknown as AuthenticatedRequest).walletPubkey;
    const { proposalPda, transactionIndex } = req.body;

    if (!proposalPda || transactionIndex == null) {
      res.status(400).json({ error: "proposalPda and transactionIndex are required" });
      return;
    }

    // Verify ownership
    const escalation = await prisma.escalationProposal.findFirst({
      where: {
        id: req.params.id,
        policy: { owner: walletPubkey },
      },
    });

    if (!escalation) {
      res.status(404).json({ error: "Escalation not found" });
      return;
    }

    if (escalation.status !== "awaiting_proposal") {
      res.status(409).json({ error: `Cannot update — status is "${escalation.status}"` });
      return;
    }

    const updated = await prisma.escalationProposal.update({
      where: { id: req.params.id },
      data: {
        proposalPda,
        transactionIndex: BigInt(transactionIndex),
        status: "pending",
      },
    });

    sseEmitter.emitEvent("escalation_updated", {
      id: updated.id,
      policyPubkey: updated.policyPubkey,
      status: updated.status,
      approvals: updated.approvals as Array<{ member: string; timestamp: string }>,
      rejections: updated.rejections as Array<{ member: string; timestamp: string }>,
      executedTxnSig: updated.executedTxnSig,
      updatedAt: updated.updatedAt,
    });

    res.json({
      ...updated,
      amountLamports: updated.amountLamports.toString(),
      transactionIndex: updated.transactionIndex?.toString() ?? null,
    });
  } catch (err) {
    console.error("[api/escalations/:id PATCH] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
