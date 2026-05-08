"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowRight, ChevronRight, Copy, Check, Play } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import {
  AnomalyRiskLabel,
  anomalyBarClass,
  AppShell,
  IncidentTable,
  SpendGauge,
  TransactionRow,
} from "@/components/dashboard-ui";
import { ClosePolicyButton } from "@/components/close-policy-button";
import { FundAgentButton } from "@/components/fund-agent-button";
import { KillSwitchButton } from "@/components/kill-switch-button";
import { RotateAgentKeyButton } from "@/components/rotate-agent-key-button";
import { EditPolicyButton } from "@/components/edit-policy-button";
import { SimulatePanel } from "@/components/simulate-panel";
import { QueryEmpty, QueryError } from "@/components/query-states";
import { AgentDetailSkeleton, IncidentsViewSkeleton } from "@/components/skeletons";
import { useInfiniteTransactionsQuery } from "@/lib/api/use-infinite-transactions-query";
import { useIncidentsQuery } from "@/lib/api/use-incidents-query";
import { useEscalationsQuery } from "@/lib/api/use-escalations-query";
import { usePolicyQuery } from "@/lib/api/use-policy-query";
import { useAllSpendTrackersQuery } from "@/lib/api/use-spend-trackers-query";
import { useSimulationStore } from "@/lib/stores/simulation";
import {
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  programLabel,
  shortAddress,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// CopyButton — inline pubkey copy
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void copy(); }}
      className="rounded p-0.5 text-zinc-500 transition-colors hover:text-teal-400"
      title="Copy address"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AgentDetailView({ pubkey }: { pubkey: string }) {
  const { publicKey } = useWallet();
  const simulationStore = useSimulationStore();
  const policyQuery = usePolicyQuery(pubkey);
  const transactionsQuery = useInfiniteTransactionsQuery(pubkey, 10);
  const incidentsQuery = useIncidentsQuery(pubkey, 10);
  const escalationsQuery = useEscalationsQuery(pubkey);
  const spendTrackersQuery = useAllSpendTrackersQuery();

  // ── Loading ──
  if (policyQuery.isLoading) {
    return (
      <AppShell title="Agent Detail" subtitle="Live status, spend view, and recent guarded activity.">
        <AgentDetailSkeleton />
      </AppShell>
    );
  }

  // ── Error ──
  if (policyQuery.isError || !policyQuery.data) {
    return (
      <AppShell title="Agent Detail" subtitle="Live status, spend view, and recent guarded activity.">
        <QueryError
          error={policyQuery.error ?? new Error("Unknown error")}
          title="Unable to load agent"
          onRetry={() => void policyQuery.refetch()}
        />
      </AppShell>
    );
  }

  const policy = policyQuery.data;
  const spendTracker = (spendTrackersQuery.data ?? []).find((row) => row.policyPubkey === policy.pubkey);
  const transactions = transactionsQuery.data?.items ?? [];
  const incidents = incidentsQuery.data?.items ?? [];
  const isOwner = publicKey && publicKey.toBase58() === policy.owner;
  const sessionExpired = new Date(policy.sessionExpiry).getTime() < Date.now();

  const spentLamports = spendTracker?.lamportsSpent24h ?? policy.dailySpentLamports ?? "0";
  const budgetRemaining = BigInt(policy.dailyBudgetLamports ?? "0") - BigInt(spentLamports);

  return (
    <AppShell
      title={policy.label ?? "Agent Detail"}
      subtitle="Live status, spend view, and recent guarded activity."
    >
      <div className="space-y-5">

        {/* ── Breadcrumb ── */}
        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ animation: "fade-in-up 0.3s ease-out backwards" }}
        >
          <Link href="/agents" className="text-zinc-500 transition-colors hover:text-teal-400">
            Agents
          </Link>
          <ChevronRight size={12} className="text-zinc-600" />
          <span className="font-medium text-zinc-300">{policy.label ?? shortAddress(pubkey, 6, 4)}</span>
        </div>

        {/* ================================================================
            HERO CARD
            ================================================================ */}
        <div
          className="relative overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.08s backwards" }}
        >
          {/* Glow orb */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-40 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, rgba(0,255,209,0.1), transparent 70%)" }} />

          {/* Identity + Badges */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-50 md:text-[22px]">
                {policy.label ?? "Unlabeled Agent"}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                {shortAddress(policy.pubkey, 6, 4)}
                <CopyButton text={policy.pubkey} />
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {policy.squadsMultisig && (
                <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                  Squads
                </span>
              )}
              {!policy.isActive ? (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Paused
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
                  </span>
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Anomaly bar inline */}
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Anomaly</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[12px] ${
                  policy.anomalyScore > 60 ? "text-red-400" : policy.anomalyScore > 30 ? "text-amber-400" : "text-teal-400"
                }`}>
                  {policy.anomalyScore} / 100
                </span>
                <AnomalyRiskLabel score={policy.anomalyScore} />
              </div>
            </div>
            <div className="relative h-[5px] overflow-hidden rounded-full bg-zinc-800">
              <div className="absolute left-[30%] top-0 h-full w-px bg-white/[0.08]" />
              <div className="absolute left-[60%] top-0 h-full w-px bg-white/[0.08]" />
              <div
                className={`h-full rounded-full transition-all ${anomalyBarClass(policy.anomalyScore)}`}
                style={{ width: `${Math.min(policy.anomalyScore, 100)}%` }}
              />
            </div>
          </div>

          {/* 4-metric row */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Daily Spend</div>
              <div className="mt-1 font-mono text-base font-bold text-zinc-50">
                {formatSol(spentLamports)} <span className="text-[11px] font-medium text-zinc-500">SOL</span>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-500">of {formatSol(policy.dailyBudgetLamports)} budget</div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">24h Transactions</div>
              <div className="mt-1 font-mono text-base font-bold text-zinc-50">{spendTracker?.txnCount24h ?? 0}</div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Budget Left</div>
              <div className="mt-1 font-mono text-base font-bold text-zinc-50">
                {formatSol(budgetRemaining)} <span className="text-[11px] font-medium text-zinc-500">SOL</span>
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Session Expiry</div>
              <div className={`mt-1 font-mono text-sm font-bold ${sessionExpired ? "text-amber-400" : "text-zinc-50"}`} title={formatRelativeTooltip(policy.sessionExpiry)}>
                {sessionExpired ? "expired" : formatRelativeTime(policy.sessionExpiry)}
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-500">{new Date(policy.sessionExpiry).toLocaleDateString()}</div>
            </div>
          </div>

        </div>

        {/* ================================================================
            ACTION TOOLBAR — separated from hero for clean info/action split
            ================================================================ */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1e1e22] bg-[#111113] px-5 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.12s backwards" }}
        >
          {/* Left: day-to-day actions */}
          <div className="flex flex-wrap items-center gap-2">
            <KillSwitchButton policy={policy} />
            <FundAgentButton policy={policy} />
            <EditPolicyButton policy={policy} />
            {isOwner && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-teal-500/20 bg-teal-500/[0.06] px-3.5 py-2 text-[12px] font-medium text-teal-300 transition-all hover:bg-teal-500/[0.12] hover:text-teal-200"
                onClick={() => simulationStore.setPanelOpen(true)}
              >
                <Play size={13} strokeWidth={1.8} /> Simulate
              </button>
            )}
          </div>

          {/* Right: multisig link (if configured) */}
          {policy.squadsMultisig ? (() => {
            const escalations = escalationsQuery.data ?? [];
            const pendingCount = escalations.filter(
              (e) => e.status === "awaiting_proposal" || e.status === "pending" || e.status === "approved",
            ).length;
            return (
              <Link
                href={`/agents/${pubkey}/proposals`}
                className="inline-flex items-center gap-2.5 rounded-md border border-teal-500/15 bg-teal-500/[0.05] px-3.5 py-2 text-[12px] font-medium text-teal-300 transition-all hover:bg-teal-500/[0.1]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Multisig
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    {pendingCount}
                  </span>
                )}
                <ArrowRight size={12} />
              </Link>
            );
          })() : null}
        </div>

        {/* ================================================================
            TWO-COLUMN GRID: Spend + Policy Config
            ================================================================ */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Left — Daily Spend */}
          <div
            className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            style={{ animation: "fade-in-up 0.4s ease-out 0.2s backwards" }}
          >
            <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Daily Spend
            </div>
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
              <div className="shrink-0">
                <SpendGauge
                  spentLamports={String(spentLamports)}
                  budgetLamports={String(policy.dailyBudgetLamports)}
                  size={140}
                />
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">24h Transactions</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-zinc-100">{spendTracker?.txnCount24h ?? 0}</div>
                </div>
                <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">1h Spend</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-zinc-100">{formatSol(spendTracker?.lamportsSpent1h ?? "0")} SOL</div>
                </div>
                <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Budget Remaining</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-teal-400">{formatSol(budgetRemaining)} SOL</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Policy Configuration */}
          <div
            className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            style={{ animation: "fade-in-up 0.4s ease-out 0.25s backwards" }}
          >
            <div className="mb-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Policy Configuration
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Per-Tx Cap</div>
                <div className="mt-1 font-mono text-[12px] text-zinc-300">{formatSol(policy.maxTxLamports)} SOL</div>
              </div>
              <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Daily Budget</div>
                <div className="mt-1 font-mono text-[12px] text-zinc-300">{formatSol(policy.dailyBudgetLamports)} SOL</div>
              </div>
              <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Escalation</div>
                <div className="mt-1 font-mono text-[12px] text-zinc-300">
                  {policy.escalationThreshold && policy.escalationThreshold !== "0"
                    ? `${formatSol(policy.escalationThreshold)} SOL`
                    : "—"}
                </div>
              </div>
              <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Multisig</div>
                <div className="mt-1 font-mono text-[12px]">
                  {policy.squadsMultisig
                    ? <span className="text-teal-400">Configured</span>
                    : <span className="text-zinc-500">—</span>}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-dashed border-white/[0.06] pt-3">
              {policy.allowedPrograms.map((p) => (
                <span key={p} className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">
                  {programLabel(p)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================================
            RECENT TRANSACTIONS
            ================================================================ */}
        <div
          className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.3s backwards" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Recent Transactions
            </span>
            <Link href="/activity" className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400/80 transition-colors hover:text-teal-300">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {transactionsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md border border-zinc-800/50 bg-white/[0.03]" />
              ))}
            </div>
          ) : transactionsQuery.isError ? (
            <QueryError error={transactionsQuery.error} onRetry={() => void transactionsQuery.refetch()} />
          ) : transactions.length ? (
            <>
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <TransactionRow key={txn.id} transaction={txn} />
                ))}
              </div>
              {transactionsQuery.hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="rounded-md border border-[#1e1e22] bg-transparent px-5 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-white/[0.03] hover:text-zinc-300 disabled:opacity-50"
                    disabled={transactionsQuery.isFetchingNextPage}
                    onClick={() => void transactionsQuery.fetchNextPage()}
                  >
                    {transactionsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <QueryEmpty title="No transactions yet." description="Guarded activity for this policy will appear here." />
          )}
        </div>

        {/* ================================================================
            RELATED INCIDENTS
            ================================================================ */}
        <div
          className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.35s backwards" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Related Incidents
            </span>
            <Link href="/incidents" className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400/80 transition-colors hover:text-teal-300">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {incidentsQuery.isLoading ? (
            <IncidentsViewSkeleton />
          ) : incidentsQuery.isError ? (
            <QueryError error={incidentsQuery.error} onRetry={() => void incidentsQuery.refetch()} />
          ) : (
            <IncidentTable incidents={incidents} />
          )}
        </div>

        {/* ================================================================
            DANGER ZONE — destructive actions at the bottom
            ================================================================ */}
        {isOwner && (
          <div
            className="rounded-xl border border-red-900/20 bg-red-950/[0.04] p-5"
            style={{ animation: "fade-in-up 0.4s ease-out 0.4s backwards" }}
          >
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-red-400/70">
              Danger Zone
            </div>
            <p className="mb-4 text-[12px] leading-relaxed text-zinc-500">
              These actions are irreversible or affect agent operation. Proceed with caution.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <RotateAgentKeyButton policy={policy} />
              <ClosePolicyButton policy={policy} />
            </div>
          </div>
        )}

      </div>

      {simulationStore.panelOpen && <SimulatePanel policy={policy} />}
    </AppShell>
  );
}
