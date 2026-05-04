// GET /api/transactions — paginated guarded transactions with verdicts.
// Filtered to policies owned by the authenticated wallet.

import express from "express";
import { prisma } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const transactionsRouter: express.Router = express.Router();

transactionsRouter.get("/", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const rawLimit = Number.parseInt(req.query.limit as string, 10);
    const rawOffset = Number.parseInt(req.query.offset as string, 10);
    const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);
    const policyFilter = req.query.policy as string | undefined;

    // Find policies owned by this wallet
    const ownedPolicies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      select: { pubkey: true },
    });
    const policyPubkeys = ownedPolicies.map((p) => p.pubkey);

    if (policyPubkeys.length === 0) {
      res.json({ transactions: [], total: 0 });
      return;
    }

    // Apply optional policy filter
    const policyWhere = policyFilter && policyPubkeys.includes(policyFilter)
      ? policyFilter
      : undefined;

    const where = {
      policyPubkey: policyWhere ? policyWhere : { in: policyPubkeys },
    };

    const [transactions, total] = await Promise.all([
      prisma.guardedTxn.findMany({
        where,
        include: { verdict: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.guardedTxn.count({ where }),
    ]);

    // Serialize bigint fields for JSON
    const serialized = transactions.map((t) => ({
      ...t,
      slot: t.slot.toString(),
      amountLamports: t.amountLamports?.toString() ?? null,
    }));

    res.json({ transactions: serialized, total });
  } catch (err) {
    console.error("[api/transactions] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializeTxn(row: {
  id: string;
  policyPubkey: string;
  txnSig: string;
  slot: bigint;
  blockTime: Date;
  targetProgram: string;
  amountLamports: bigint | null;
  status: string;
  rejectReason: string | null;
  destination: string | null;
  rawEvent: unknown;
  createdAt: Date;
  verdict: Record<string, unknown> | null;
  escalation:
  | ({
    amountLamports: bigint;
    transactionIndex: bigint | null;
  } & Record<string, unknown>)
  | null;
}) {
  const escalation =
    row.escalation == null
      ? null
      : {
        ...row.escalation,
        amountLamports: row.escalation.amountLamports.toString(),
        transactionIndex:
          row.escalation.transactionIndex == null
            ? null
            : row.escalation.transactionIndex.toString(),
      };

  return {
    ...row,
    slot: row.slot.toString(),
    amountLamports: row.amountLamports?.toString() ?? null,
    escalation,
  };
}

// GET /api/transactions/:sig — deep dive for one guarded transaction (owned policy).
transactionsRouter.get("/:sig", async (req, res) => {
  try {
    const { walletPubkey } = req as unknown as AuthenticatedRequest;
    const sig = req.params.sig;

    const txn = await prisma.guardedTxn.findFirst({
      where: {
        txnSig: sig,
        policy: { owner: walletPubkey },
      },
      include: {
        verdict: true,
        escalation: true,
      },
    });

    if (!txn) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const [incident, prev, next] = await Promise.all([
      prisma.incident.findFirst({
        where: {
          policyPubkey: txn.policyPubkey,
          triggeringTxnSig: sig,
        },
      }),
      prisma.guardedTxn.findFirst({
        where: {
          policyPubkey: txn.policyPubkey,
          blockTime: { lt: txn.blockTime },
        },
        orderBy: { blockTime: "desc" },
        select: { txnSig: true },
      }),
      prisma.guardedTxn.findFirst({
        where: {
          policyPubkey: txn.policyPubkey,
          blockTime: { gt: txn.blockTime },
        },
        orderBy: { blockTime: "asc" },
        select: { txnSig: true },
      }),
    ]);

    res.json({
      transaction: serializeTxn(txn),
      incident,
      prevTxnSig: prev?.txnSig ?? null,
      nextTxnSig: next?.txnSig ?? null,
    });
  } catch (err) {
    console.error("[api/transactions/:sig] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
