"use client";

import Link from "next/link";
import { ChevronLeft, Play } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AnomalyRiskLabel,
  anomalyBarClass,
  AppShell,
  IncidentTable,
  Metric,
  SpendGauge,
  TransactionRow,
} from "@/components/dashboard-ui";
import { ClosePolicyButton } from "@/components/close-policy-button";
import { FundAgentButton } from "@/components/fund-agent-button";
import { KillSwitchButton } from "@/components/kill-switch-button";
import { RotateAgentKeyButton } from "@/components/rotate-agent-key-button";
import { SimulatePanel } from "@/components/simulate-panel";
import { QueryEmpty, QueryError } from "@/components/query-states";
import { AgentDetailSkeleton, IncidentsViewSkeleton } from "@/components/skeletons";
import { useInfiniteTransactionsQuery } from "@/lib/api/use-infinite-transactions-query";
import { useIncidentsQuery } from "@/lib/api/use-incidents-query";
import { useEscalationsQuery } from "@/lib/api/use-escalations-query";
import { usePolicyQuery } from "@/lib/api/use-policy-query";
import { useAllSpendTrackersQuery } from "@/lib/api/use-spend-trackers-query";
import { useSimulationStore } from "@/lib/stores/simulation";
import { formatSol } from "@/lib/utils";

function BackToAgentsLink() {
  return (
    <Link
      href="/agents"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
      Back to agents
    </Link>
  );
}

export function AgentDetailView({ pubkey }: { pubkey: string }) {
  const { publicKey } = useWallet();
  const simulationStore = useSimulationStore();
  const policyQuery = usePolicyQuery(pubkey);
  const transactionsQuery = useInfiniteTransactionsQuery(pubkey, 10);
  const incidentsQuery = useIncidentsQuery(pubkey, 10);
  const escalationsQuery = useEscalationsQuery(pubkey);
  const spendTrackersQuery = useAllSpendTrackersQuery();

  if (policyQuery.isLoading) {
    return (
      <AppShell
        title="Agent Detail"
        subtitle="Live status, spend view, and recent guarded activity."
        actions={<BackToAgentsLink />}
      >
        <AgentDetailSkeleton />
      </AppShell>
    );
  }

  if (policyQuery.isError || !policyQuery.data) {
    return (
      <AppShell
        title="Agent Detail"
        subtitle="Live status, spend view, and recent guarded activity."
        actions={<BackToAgentsLink />}
      >
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
  const shortenedPolicyPubkey =
    policy.pubkey.length > 8 ? `${policy.pubkey.slice(0, 4)}...${policy.pubkey.slice(-4)}` : policy.pubkey;

  return (
    <AppShell
      title={policy.label ?? "Agent Detail"}
      subtitle="Live status, spend view, and recent guarded activity."
      actions={<BackToAgentsLink />}
    >
      <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Policy" value={shortenedPolicyPubkey} />
        <Metric label="Status" value={policy.isActive ? "Active" : "Paused"} />
        <Metric label="Session expiry" value={new Date(policy.sessionExpiry).toLocaleString()} />
      </div>
      <div className="rounded-xl mt-4 border border-white/[0.06] bg-white/[0.02] p-4 panel-glow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Anomaly</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-300">{policy.anomalyScore}/100</span>
            <AnomalyRiskLabel score={policy.anomalyScore} />
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${anomalyBarClass(policy.anomalyScore)}`}
            style={{ width: `${Math.min(policy.anomalyScore, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <KillSwitchButton policy={policy} />
        <RotateAgentKeyButton policy={policy} />
        <FundAgentButton policy={policy} />
        <ClosePolicyButton policy={policy} />
        {publicKey && publicKey.toBase58() === policy.owner && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-blue-800 bg-blue-950/40 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-950/70"
            onClick={() => simulationStore.setPanelOpen(true)}
          >
            <Play className="h-4 w-4" />
            Simulate
          </button>
        )}
      </div>

      {policy.squadsMultisig ? (() => {
        const escalations = escalationsQuery.data ?? [];
        const pendingCount = escalations.filter(
          (e) => e.status === "awaiting_proposal" || e.status === "pending" || e.status === "approved",
        ).length;
        return (
          <Link
            href={`/agents/${pubkey}/proposals`}
            className="panel-glow panel-glow-hover flex items-center justify-between p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-sm font-bold uppercase tracking-widest text-transparent">
                Multisig Proposals
              </div>
              {pendingCount > 0 ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 shadow-sm">
                  {pendingCount} pending
                </span>
              ) : null}
            </div>
            <span className="text-sm text-zinc-500">View all &rarr;</span>
          </Link>
        );
      })() : null}

      <div className="panel-glow p-5 md:p-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-sm font-bold uppercase tracking-widest text-transparent">
          Daily spend
        </div>
        <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          <div className="flex shrink-0 justify-center md:justify-start">
            <SpendGauge
              spentLamports={String(spendTracker?.lamportsSpent24h ?? policy.dailySpentLamports ?? "0")}
              budgetLamports={String(policy.dailyBudgetLamports)}
              size={140}
            />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">24h Transactions</p>
              <p className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-100">
                {spendTracker?.txnCount24h ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">1h Spend</p>
              <p className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-100">
                {formatSol(spendTracker?.lamportsSpent1h ?? "0")}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Budget remaining</p>
              <p className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-100">
                {formatSol(
                  BigInt(policy.dailyBudgetLamports ?? "0") -
                    BigInt(spendTracker?.lamportsSpent24h ?? policy.dailySpentLamports ?? "0"),
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-glow p-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-sm font-bold uppercase tracking-widest text-transparent">Recent transactions</div>
        {transactionsQuery.isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-28 rounded-xl border border-border/70 bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : transactionsQuery.isError ? (
          <QueryError
            error={transactionsQuery.error}
            onRetry={() => void transactionsQuery.refetch()}
          />
        ) : transactions.length ? (
          <>
            {transactionsQuery.data?.isCapped ? (
              <p className="mb-3 text-xs text-zinc-500">
                Showing {transactions.length} transactions (newest first, feed capped).
              </p>
            ) : (
              <p className="mb-3 text-xs text-zinc-500">
                Showing {transactions.length} transaction{transactions.length === 1 ? "" : "s"} (newest first).
              </p>
            )}
            <div className="grid gap-3">
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
            {transactionsQuery.hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="button button-secondary disabled:opacity-50"
                  disabled={transactionsQuery.isFetchingNextPage}
                  onClick={() => void transactionsQuery.fetchNextPage()}
                >
                  {transactionsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <QueryEmpty title="No transactions yet." description="Guarded activity for this policy will appear here." />
        )}
      </div>

      <div className="panel-glow p-5">
        <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-sm font-bold uppercase tracking-widest text-transparent">Related incidents</div>
        {incidentsQuery.isLoading ? (
          <IncidentsViewSkeleton />
        ) : incidentsQuery.isError ? (
          <QueryError error={incidentsQuery.error} onRetry={() => void incidentsQuery.refetch()} />
        ) : (
          <IncidentTable incidents={incidents} />
        )}
      </div>
      </div>

      {simulationStore.panelOpen && <SimulatePanel policy={policy} />}
    </AppShell>
  );
}
