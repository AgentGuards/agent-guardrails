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

// Report an escalation from the client.
// Called when the client catches EscalatedToMultisig (Anchor error 6007).
// Helius does not parse failed transactions, so the webhook/poller pipeline
// can never see these — the client must report them directly.
escalationsRouter.post("/report", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;
    const { policyPubkey, txnSig, amountLamports, targetProgram, destination, instruction } = req.body;

    if (!policyPubkey || !txnSig || amountLamports == null || !targetProgram) {
      res.status(400).json({ error: "policyPubkey, txnSig, amountLamports, and targetProgram are required" });
      return;
    }

    // Verify policy exists and is owned by the caller
    const policy = await prisma.policy.findUnique({ where: { pubkey: policyPubkey } });
    if (!policy || policy.owner !== walletPubkey) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }

    if (!policy.squadsMultisig) {
      res.status(400).json({ error: "Policy has no multisig configured" });
      return;
    }

    // Deduplicate — skip if this txn was already recorded
    const existing = await prisma.guardedTxn.findUnique({ where: { txnSig } });
    if (existing) {
      res.json({ ok: true, duplicate: true });
      return;
    }

    // Create the guarded_txn row with status "escalated"
    const row = await prisma.guardedTxn.create({
      data: {
        policyPubkey,
        txnSig,
        slot: BigInt(0),
        blockTime: new Date(),
        targetProgram,
        amountLamports: BigInt(amountLamports),
        destination: destination ?? null,
        status: "escalated",
        rejectReason: "EscalatedToMultisig",
        rawEvent: instruction ? { _reconstructed: true, instruction } : undefined,
      },
    });

    // Emit new_transaction SSE event
    sseEmitter.emitEvent("new_transaction", {
      id: row.id,
      policyPubkey: row.policyPubkey,
      txnSig: row.txnSig,
      slot: "0",
      blockTime: row.blockTime,
      targetProgram: row.targetProgram,
      amountLamports: row.amountLamports?.toString() ?? null,
      status: row.status,
      rejectReason: row.rejectReason,
      rawEvent: null,
      createdAt: row.createdAt,
    });

    // Create the escalation proposal
    const proposal = await prisma.escalationProposal.create({
      data: {
        policyPubkey,
        txnId: row.id,
        squadsMultisig: policy.squadsMultisig,
        targetProgram,
        amountLamports: BigInt(amountLamports),
        status: "awaiting_proposal",
      },
    });

    sseEmitter.emitEvent("escalation_created", {
      id: proposal.id,
      policyPubkey: proposal.policyPubkey,
      txnId: proposal.txnId,
      squadsMultisig: proposal.squadsMultisig,
      targetProgram: proposal.targetProgram,
      amountLamports: proposal.amountLamports.toString(),
      status: proposal.status,
      createdAt: proposal.createdAt,
    });

    console.log(
      `[api/escalations/report] created escalation for txn ${txnSig.slice(0, 16)}… ` +
      `amount=${amountLamports} policy=${policyPubkey.slice(0, 8)}…`,
    );

    res.json({
      ok: true,
      escalationId: proposal.id,
      txnId: row.id,
    });
  } catch (err) {
    console.error("[api/escalations/report] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
