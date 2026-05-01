// GET /api/audit — unified operator action timeline for owned policies.

import express from "express";
import { prisma } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { detectAndExtract } from "../../worker/pipeline/ingest.js";
import type { HeliusEnhancedTransaction } from "../../worker/routes/webhook.js";

export const auditRouter: express.Router = express.Router();

export type AuditActionType =
  | "pause"
  | "resume"
  | "rotate_key"
  | "close_policy"
  | "escalation_created"
  | "escalation_updated";

export interface AuditRow {
  id: string;
  timestamp: string;
  actionType: AuditActionType;
  policyPubkey: string;
  policyLabel: string | null;
  actor: string;
  details: string;
  relatedIncidentId: string | null;
  relatedTxnSig: string | null;
  relatedProposalId: string | null;
}

const ALL_ACTIONS: AuditActionType[] = [
  "pause",
  "resume",
  "rotate_key",
  "close_policy",
  "escalation_created",
  "escalation_updated",
];

function mapInstructionToAction(
  ix: string,
): "pause" | "resume" | "rotate_key" | "close_policy" | null {
  if (ix === "pause_agent") return "pause";
  if (ix === "resume_agent") return "resume";
  if (ix === "rotate_agent_key") return "rotate_key";
  if (ix === "close_policy") return "close_policy";
  return null;
}

function parseTypesParam(raw: string | undefined): AuditActionType[] | null {
  if (raw == null || raw === "" || raw === "all") return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const set = new Set<AuditActionType>();
  for (const p of parts) {
    if (ALL_ACTIONS.includes(p as AuditActionType)) {
      set.add(p as AuditActionType);
    }
  }
  return set.size === 0 ? [] : [...set];
}

auditRouter.get("/", async (req, res) => {
  try {
    const { walletPubkey } = req as AuthenticatedRequest;

    const policies = await prisma.policy.findMany({
      where: { owner: walletPubkey },
      select: { pubkey: true, label: true, owner: true },
    });

    const pubkeys = policies.map((p) => p.pubkey);
    const labelMap = new Map(policies.map((p) => [p.pubkey, p.label]));
    const ownerMap = new Map(policies.map((p) => [p.pubkey, p.owner]));

    if (pubkeys.length === 0) {
      res.json({ items: [] satisfies AuditRow[] });
      return;
    }

    const policyFilter = req.query.policyPubkey as string | undefined;
    const scopedPubkeys =
      policyFilter && pubkeys.includes(policyFilter) ? [policyFilter] : pubkeys;

    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;

    const typeFilter = parseTypesParam(req.query.type as string | undefined);

    const [incidents, escalations, guardTxns] = await Promise.all([
      prisma.incident.findMany({
        where: { policyPubkey: { in: scopedPubkeys } },
      }),
      prisma.escalationProposal.findMany({
        where: { policyPubkey: { in: scopedPubkeys } },
        include: { txn: { select: { txnSig: true } } },
      }),
      prisma.guardedTxn.findMany({
        where: { policyPubkey: { in: scopedPubkeys } },
        orderBy: { blockTime: "desc" },
        take: 350,
      }),
    ]);

    const rows: AuditRow[] = [];

    for (const inc of incidents) {
      rows.push({
        id: `inc-pause-${inc.id}`,
        timestamp: inc.pausedAt.toISOString(),
        actionType: "pause",
        policyPubkey: inc.policyPubkey,
        policyLabel: labelMap.get(inc.policyPubkey) ?? null,
        actor: inc.pausedBy,
        details:
          inc.reason.length > 240 ? `${inc.reason.slice(0, 239)}…` : inc.reason,
        relatedIncidentId: inc.id,
        relatedTxnSig: inc.triggeringTxnSig,
        relatedProposalId: null,
      });

      if (inc.resolvedAt) {
        rows.push({
          id: `inc-resume-${inc.id}`,
          timestamp: inc.resolvedAt.toISOString(),
          actionType: "resume",
          policyPubkey: inc.policyPubkey,
          policyLabel: labelMap.get(inc.policyPubkey) ?? null,
          actor: ownerMap.get(inc.policyPubkey) ?? inc.pausedBy,
          details:
            inc.resolution && inc.resolution.length > 0
              ? inc.resolution.length > 200
                ? `${inc.resolution.slice(0, 199)}…`
                : inc.resolution
              : "Incident resolved",
          relatedIncidentId: inc.id,
          relatedTxnSig: inc.triggeringTxnSig,
          relatedProposalId: null,
        });
      }
    }

    for (const esc of escalations) {
      rows.push({
        id: `esc-created-${esc.id}`,
        timestamp: esc.createdAt.toISOString(),
        actionType: "escalation_created",
        policyPubkey: esc.policyPubkey,
        policyLabel: labelMap.get(esc.policyPubkey) ?? null,
        actor: ownerMap.get(esc.policyPubkey) ?? "",
        details: `Multisig escalation — status ${esc.status}`,
        relatedIncidentId: null,
        relatedTxnSig: esc.txn.txnSig,
        relatedProposalId: esc.id,
      });

      if (esc.updatedAt.getTime() > esc.createdAt.getTime() + 1500) {
        rows.push({
          id: `esc-updated-${esc.id}-${esc.updatedAt.toISOString()}`,
          timestamp: esc.updatedAt.toISOString(),
          actionType: "escalation_updated",
          policyPubkey: esc.policyPubkey,
          policyLabel: labelMap.get(esc.policyPubkey) ?? null,
          actor: ownerMap.get(esc.policyPubkey) ?? "",
          details: `Escalation updated — status ${esc.status}`,
          relatedIncidentId: null,
          relatedTxnSig: esc.txn.txnSig,
          relatedProposalId: esc.id,
        });
      }
    }

    for (const txn of guardTxns) {
      const rawUnknown = txn.rawEvent as unknown;
      if (!rawUnknown || typeof rawUnknown !== "object") continue;

      let instructionType = "unknown";
      try {
        const det = detectAndExtract(rawUnknown as HeliusEnhancedTransaction);
        instructionType = det.instructionType;
      } catch {
        instructionType = "unknown";
      }

      const mapped = mapInstructionToAction(instructionType);
      if (!mapped) continue;

      rows.push({
        id: `txn-${mapped}-${txn.id}`,
        timestamp: txn.blockTime.toISOString(),
        actionType: mapped,
        policyPubkey: txn.policyPubkey,
        policyLabel: labelMap.get(txn.policyPubkey) ?? null,
        actor: ownerMap.get(txn.policyPubkey) ?? "",
        details: `On-chain ${instructionType} — ${txn.txnSig.slice(0, 10)}…`,
        relatedIncidentId: null,
        relatedTxnSig: txn.txnSig,
        relatedProposalId: null,
      });
    }

    let filtered = rows;

    if (typeFilter && typeFilter.length > 0) {
      const allow = new Set(typeFilter);
      filtered = filtered.filter((r) => allow.has(r.actionType));
    }

    if (from && !Number.isNaN(from.getTime())) {
      filtered = filtered.filter((r) => new Date(r.timestamp).getTime() >= from.getTime());
    }
    if (to && !Number.isNaN(to.getTime())) {
      filtered = filtered.filter((r) => new Date(r.timestamp).getTime() <= to.getTime());
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ items: filtered.slice(0, 500) });
  } catch (err) {
    console.error("[api/audit] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
