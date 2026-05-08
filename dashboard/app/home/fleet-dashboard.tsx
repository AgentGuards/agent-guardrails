"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { Activity, ArrowRight, Plus, FileText, ShieldCheck } from "lucide-react";
import { AppShell, anomalyBarClass, StatusChip } from "@/components/dashboard-ui";
import { useProductTour } from "@/components/product-tour";
import { EmptyState } from "@/components/EmptyState";
import { QueryError } from "@/components/query-states";
import { SkeletonStatCard } from "@/components/skeletons";
import { useFleetSummaryQuery } from "@/lib/api/use-fleet-summary-query";
import { useAllSpendTrackersQuery } from "@/lib/api/use-spend-trackers-query";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import { useRecentIncidentsQuery } from "@/lib/api/use-recent-incidents-query";
import { useInfiniteTransactionsQuery } from "@/lib/api/use-infinite-transactions-query";
import type { IncidentSummary, PolicySummary, SpendTrackerRow, TransactionSummary } from "@/lib/types/dashboard";
import { useSSEEventLogStore } from "@/lib/stores/sse-event-log";
import {
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  lamportsToSol,
  policyLabel,
  programLabel,
  shortAddress,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function truncateText(text: string, max = 72): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function budgetBurnPct(spentLamports: string, budgetLamports: string): number {
  const spent = lamportsToSol(spentLamports);
  const budget = lamportsToSol(budgetLamports);
  if (budget <= 0) return 0;
  return (spent / budget) * 100;
}

function burnBarFill(pct: number): string {
  if (pct >= 90) return "hsl(var(--crimson))";
  if (pct >= 70) return "hsl(var(--amber))";
  return "hsl(var(--teal))";
}

function agentHealthTone(policy: PolicySummary): "green" | "amber" | "red" {
  if (!policy.isActive) return "amber";
  if (policy.anomalyScore >= 61) return "red";
  if (policy.anomalyScore >= 31) return "amber";
  return "green";
}

function healthDotClass(tone: "green" | "amber" | "red"): string {
  if (tone === "red") return "bg-[hsl(var(--crimson))] shadow-[0_0_10px_hsl(var(--crimson)/0.45)]";
  if (tone === "amber") return "bg-[hsl(var(--amber))] shadow-[0_0_10px_hsl(var(--amber)/0.35)]";
  return "bg-[hsl(var(--teal))] shadow-[0_0_10px_hsl(var(--teal)/0.35)]";
}

function sseRowAccent(type: string, payload: unknown): string {
  if (type === "agent_paused") return "border-l-amber-500 text-amber-200/95";
  if (type === "new_transaction") return "border-l-teal-500/80 text-teal-100/80";
  if (type === "escalation_created" || type === "escalation_updated") {
    return "border-l-purple-500 text-purple-200/95";
  }
  if (type === "verdict") {
    const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const v = o?.verdict != null ? String(o.verdict) : "";
    if (v === "pause") return "border-l-[hsl(var(--crimson))] text-red-200/95";
  }
  return "border-l-zinc-600 text-zinc-300/95";
}

function verdictColor(verdict: string | undefined): { dot: string; badge: string; label: string } {
  if (verdict === "pause") return {
    dot: "bg-[hsl(var(--crimson))] shadow-[0_0_8px_hsl(var(--crimson)/0.45)]",
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
    label: "Pause",
  };
  if (verdict === "flag") return {
    dot: "bg-[hsl(var(--amber))] shadow-[0_0_8px_hsl(var(--amber)/0.4)]",
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    label: "Flag",
  };
  return {
    dot: "bg-[hsl(var(--teal))] shadow-[0_0_8px_hsl(var(--teal)/0.35)]",
    badge: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
    label: "Allow",
  };
}

// ---------------------------------------------------------------------------
// AnimatedNumber — count-up effect with ease-out
// ---------------------------------------------------------------------------

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>;
}

// ---------------------------------------------------------------------------
// SparklineSVG — static area sparkline for stat card
// ---------------------------------------------------------------------------

function SparklineSVG() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 h-10 w-full opacity-40"
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--teal))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--teal))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,30 Q20,28 40,25 T80,20 T120,22 T160,15 T200,18 V40 H0 Z"
        fill="url(#spark-grad)"
      />
      <path
        d="M0,30 Q20,28 40,25 T80,20 T120,22 T160,15 T200,18"
        fill="none"
        stroke="hsl(var(--teal))"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// LiveBadge — SSE connection indicator
// ---------------------------------------------------------------------------

function LiveBadge() {
  const { connected: walletConnected, publicKey } = useWallet();
  const siwsWallet = useSiwsAuthStore((s) => s.siwsWallet);

  const isAuthed = walletConnected && !!siwsWallet;
  const walletFull = publicKey?.toBase58() ?? "";
  const walletShort = walletFull
    ? `${walletFull.slice(0, 4)}…${walletFull.slice(-4)}`
    : "";

  if (!isAuthed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 text-amber-400 animate-[pulse-dot_2s_ease-in-out_infinite]" />
        Connecting…
      </span>
    );
  }

  return (
    <span
      className="group relative inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-400 cursor-default"
      title={walletFull}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-teal-400 text-teal-400 animate-[pulse-dot_2s_ease-in-out_infinite]" />
      <span className="group-hover:hidden">Connected</span>
      <span className="hidden font-mono text-[10px] group-hover:inline">{walletShort}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// FleetStatCardV2 — enhanced stat card with glow, animation, hover
// ---------------------------------------------------------------------------

function FleetStatCardV2({
  label,
  glowColor,
  animDelay,
  sparkline,
  children,
}: {
  label: string;
  glowColor: string;
  animDelay: string;
  sparkline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] px-5 py-[18px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-zinc-700/50 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_hsl(var(--teal)/0.1),0_0_20px_hsl(var(--teal)/0.05)]"
      style={{
        animation: `fade-in-up 0.4s ease-out backwards`,
        animationDelay: animDelay,
      }}
    >
      {/* Gradient glow orb */}
      <div
        className="pointer-events-none absolute -right-5 -top-8 h-20 w-24 rounded-full opacity-50 blur-2xl"
        style={{ background: glowColor }}
      />
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="relative mt-2">{children}</div>
      {sparkline && <SparklineSVG />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComplianceGauge — SVG ring with animated fill
// ---------------------------------------------------------------------------

function ComplianceGauge({ percentage }: { percentage: number }) {
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const target = circumference - (circumference * percentage) / 100;

  return (
    <div className="flex items-center justify-center py-2">
      <div className="relative h-[120px] w-[120px]">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="hsl(var(--teal))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              "--gauge-circumference": `${circumference}`,
              "--gauge-target": `${target}`,
              animation: "gauge-fill 1.2s ease-out forwards",
              strokeDashoffset: circumference,
              filter: "drop-shadow(0 0 6px hsl(var(--teal) / 0.35))",
            } as React.CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-zinc-50">{percentage}%</span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-500">
            compliant
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineItem — single activity entry with verdict dot + connector
// ---------------------------------------------------------------------------

function TimelineItem({
  txn,
  index,
  isLast,
}: {
  txn: TransactionSummary;
  index: number;
  isLast: boolean;
}) {
  const v = txn.verdict?.verdict;
  const vc = verdictColor(v);

  return (
    <div
      className="relative flex gap-3.5 pb-5"
      style={{
        animation: "slide-in-left 0.35s ease-out backwards",
        animationDelay: `${0.3 + index * 0.06}s`,
      }}
    >
      {/* Dot + connector */}
      <div className="flex flex-col items-center pt-1">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${vc.dot}`} />
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-gradient-to-b from-zinc-700/60 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 rounded-lg border border-[#1e1e22] bg-[#0d0d0f] p-3 transition-colors hover:border-zinc-700/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${vc.badge}`}>
            {vc.label}
          </span>
          <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {programLabel(txn.targetProgram)}
          </span>
          {txn.amountLamports && (
            <span className="font-mono text-[11px] text-zinc-300">
              {formatSol(txn.amountLamports)}
            </span>
          )}
          {txn.verdict?.confidence != null && (
            <span className="font-mono text-[10px] text-zinc-600">
              conf {txn.verdict.confidence}%
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-zinc-200">
            {policyLabel(txn.policyPubkey)}
          </span>
          <span
            className="whitespace-nowrap font-mono text-[10px] text-zinc-500"
            title={formatRelativeTooltip(txn.blockTime)}
          >
            {formatRelativeTime(txn.blockTime)}
          </span>
        </div>

        {txn.verdict?.reasoning && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            {truncateText(txn.verdict.reasoning, 140)}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FleetDashboard() {
  const { startTour } = useProductTour();
  const fleetQuery = useFleetSummaryQuery();
  const policiesQuery = usePoliciesQuery();
  const spendQuery = useAllSpendTrackersQuery();
  const incidentsQuery = useRecentIncidentsQuery(10);
  const txnQuery = useInfiniteTransactionsQuery(undefined, 8);

  const sseEntries = useSSEEventLogStore((s) => s.entries);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const [logPaused, setLogPaused] = useState(false);

  const logLines = useMemo(() => sseEntries.slice(-15), [sseEntries]);

  useEffect(() => {
    if (logPaused || !logViewportRef.current) return;
    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight;
  }, [logLines, logPaused]);

  const policies = policiesQuery.data ?? [];
  const spendRows = spendQuery.data ?? [];

  const trackerByPubkey = useMemo(() => {
    const m = new Map<string, SpendTrackerRow>();
    for (const row of spendRows) {
      m.set(row.policyPubkey, row);
    }
    return m;
  }, [spendRows]);

  const healthRows = useMemo(() => {
    return [...policies]
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
      .map((policy) => ({
        policy,
        tracker: trackerByPubkey.get(policy.pubkey) ?? null,
      }));
  }, [policies, trackerByPubkey]);

  const recentTxns: TransactionSummary[] = txnQuery.data?.items ?? [];

  const compliancePct = useMemo(() => {
    if (policies.length === 0) return 100;
    const compliant = policies.filter((p) => p.isActive && p.anomalyScore <= 30).length;
    return Math.round((compliant / policies.length) * 100);
  }, [policies]);

  const incidents = incidentsQuery.data?.items ?? [];

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (fleetQuery.isLoading || policiesQuery.isLoading) {
    return (
      <AppShell brandedHeader title="Dashboard" subtitle="Fleet health and real-time monitoring.">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonStatCard key={idx} />
          ))}
        </section>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (fleetQuery.isError || policiesQuery.isError) {
    const err = fleetQuery.error ?? policiesQuery.error;
    return (
      <AppShell brandedHeader title="Dashboard" subtitle="Fleet health and real-time monitoring.">
        <QueryError
          error={err ?? new Error("Unknown error")}
          title="Unable to load fleet dashboard"
          onRetry={() => {
            void fleetQuery.refetch();
            void policiesQuery.refetch();
            void spendQuery.refetch();
            void incidentsQuery.refetch();
          }}
        />
      </AppShell>
    );
  }

  const summary = fleetQuery.data;
  if (!summary) return null;

  const incidentDelta = summary.incidentsLast24h - summary.incidentsPrev24h;

  return (
    <AppShell
      brandedHeader
      title="Dashboard"
      subtitle="Fleet health and real-time monitoring."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startTour}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-teal-400"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            Tour
          </button>
          <LiveBadge />
        </div>
      }
    >
      <div className="flex flex-col gap-8">

        {/* ================================================================
            Section 1 — Stat Cards
            ================================================================ */}
        <section id="tour-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FleetStatCardV2
            label="Active Agents"
            glowColor="radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 70%)"
            animDelay="0.05s"
          >
            <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-50">
              <AnimatedNumber value={summary.activeAgents} />
            </div>
          </FleetStatCardV2>

          <FleetStatCardV2
            label="Threats Blocked"
            glowColor="radial-gradient(circle, hsl(var(--crimson) / 0.14), transparent 70%)"
            animDelay="0.12s"
          >
            <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-50">
              <AnimatedNumber value={summary.incidentsLast24h} />
            </div>
            {incidentDelta !== 0 ? (
              <div className={`mt-2 font-mono text-xs ${incidentDelta > 0 ? "text-amber-400/90" : "text-teal-400/90"}`}>
                {incidentDelta > 0 ? "+" : ""}{incidentDelta} vs prior 24h
              </div>
            ) : (
              <div className="mt-2 font-mono text-xs text-zinc-600">Flat vs prior 24h</div>
            )}
          </FleetStatCardV2>

          <FleetStatCardV2
            label="Spend (24h)"
            glowColor="radial-gradient(circle, hsl(var(--teal) / 0.14), transparent 70%)"
            animDelay="0.19s"
            sparkline
          >
            <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-50">
              <AnimatedNumber value={lamportsToSol(summary.totalLamportsSpent24h)} decimals={summary.totalLamportsSpent24h === "0" ? 0 : 3} />
              <span className="ml-1 text-sm font-medium text-zinc-500">SOL</span>
            </div>
          </FleetStatCardV2>

          <FleetStatCardV2
            label="Fleet Compliance"
            glowColor="radial-gradient(circle, hsl(var(--teal) / 0.16), transparent 70%)"
            animDelay="0.26s"
          >
            <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-50">
              <AnimatedNumber value={compliancePct} decimals={1} />
              <span className="ml-0.5 text-base font-medium text-zinc-500">%</span>
            </div>
          </FleetStatCardV2>
        </section>

        {/* ================================================================
            Section 2 — Bento Grid: Activity Timeline + Sidebar
            ================================================================ */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">

          {/* Left — Activity Timeline */}
          <div
            id="tour-activity"
            className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5"
            style={{ animation: "fade-in-up 0.4s ease-out 0.3s backwards" }}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Recent Activity
              </h2>
              <Link href="/activity" className="inline-flex items-center gap-1 text-xs font-medium text-teal-400/90 hover:text-teal-300">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {txnQuery.isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-white/[0.08]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.08]" />
                      <div className="h-2 w-full animate-pulse rounded bg-white/[0.06]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : txnQuery.isError ? (
              <QueryError error={txnQuery.error} onRetry={() => void txnQuery.refetch()} />
            ) : recentTxns.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40">
                <EmptyState
                  icon={Activity}
                  title="No recent transactions"
                  description="Transactions from your agents will appear here."
                />
              </div>
            ) : (
              <div className="relative">
                {recentTxns.map((txn, idx) => (
                  <TimelineItem
                    key={txn.id}
                    txn={txn}
                    index={idx}
                    isLast={idx === recentTxns.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right — Sidebar (single card, only agent list scrolls) */}
          <aside
            id="tour-sidebar"
            className="flex min-h-0 min-w-0 flex-col self-stretch rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            style={{ animation: "fade-in-up 0.4s ease-out 0.35s backwards" }}
          >

            {/* Quick Actions — pinned */}
            <div className="mb-4 shrink-0">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Quick Actions
              </h3>
              <div className="flex gap-2.5">
                <Link
                  href="/agents/new"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-teal-500/15 bg-teal-500/[0.06] px-3.5 py-2 text-[11px] font-medium text-teal-400 transition-all hover:bg-teal-500/[0.12] hover:text-teal-300"
                >
                  <Plus size={14} strokeWidth={1.7} /> New Agent
                </Link>
                <Link
                  href="/agents"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#1e1e22] bg-transparent px-3.5 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:bg-white/[0.03] hover:text-zinc-300 hover:border-zinc-600"
                >
                  <FileText size={14} strokeWidth={1.7} /> Policies
                </Link>
              </div>
            </div>

            {/* Compliance Gauge — pinned */}
            <div className="mb-4 shrink-0 border-b border-white/[0.06] pb-4">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Fleet Compliance
              </h3>
              <ComplianceGauge percentage={compliancePct} />
            </div>

            {/* Agent Health header — pinned */}
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Agent Health
              </h2>
              <Link href="/agents" className="inline-flex items-center gap-1 text-xs font-medium text-teal-400/90 hover:text-teal-300">
                All <ArrowRight size={12} />
              </Link>
            </div>

            {/* Agent list — scrollable */}
            {healthRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No agents yet.</p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {healthRows.map(({ policy, tracker }) => {
                  const tone = agentHealthTone(policy);
                  const spent = tracker?.lamportsSpent24h ?? "0";
                  const pct = budgetBurnPct(spent, policy.dailyBudgetLamports);
                  const spendLoading = spendQuery.isLoading && !tracker;
                  return (
                    <li key={policy.pubkey}>
                      <Link
                        href={`/agents/${policy.pubkey}`}
                        className="block cursor-pointer rounded-lg border border-zinc-800 p-3.5 transition-all duration-100 hover:border-zinc-600 hover:bg-zinc-800/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${healthDotClass(tone)}`} aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-zinc-100">
                            {policy.label ?? shortAddress(policy.pubkey, 6)}
                          </span>
                          <StatusChip tone={policy.isActive ? "green" : "amber"}>
                            {policy.isActive ? "Active" : "Paused"}
                          </StatusChip>
                        </div>
                        <div className="mt-2.5 space-y-1.5 pl-4">
                          <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            <span>Anomaly</span>
                            <span className="font-mono normal-case text-xs text-zinc-300">{policy.anomalyScore}/100</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={`h-full rounded-full transition-all ${anomalyBarClass(policy.anomalyScore)}`}
                              style={{ width: `${Math.min(policy.anomalyScore, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            <span>24h spend</span>
                            <span className="font-mono normal-case text-zinc-400">
                              {spendLoading ? "…" : `${formatSol(spent)} SOL`}
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                            {spendLoading ? (
                              <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-700" />
                            ) : (
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: burnBarFill(pct),
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>

        {/* ================================================================
            Section 3 — Bottom Grid: Incidents + Live Events
            ================================================================ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Left — Recent Incidents */}
          <div
            id="tour-incidents"
            className="rounded-xl border border-[#1e1e22] bg-[#111113] p-4"
            style={{ animation: "fade-in-up 0.4s ease-out 0.5s backwards" }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Recent Incidents
              </h2>
              <Link href="/incidents" className="inline-flex items-center gap-1 text-xs font-medium text-teal-400/90 hover:text-teal-300">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {incidentsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-white/[0.06]" />
                ))}
              </div>
            ) : incidentsQuery.isError ? (
              <QueryError error={incidentsQuery.error} onRetry={() => void incidentsQuery.refetch()} />
            ) : incidents.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40">
                <EmptyState
                  icon={ShieldCheck}
                  title="No incidents"
                  description="Your fleet is clean — no pauses recorded."
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-800/80">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60">
                      <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Agent</th>
                      <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">When</th>
                      <th className="hidden px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:table-cell">Reason</th>
                      <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc: IncidentSummary) => (
                      <tr key={inc.id} className="border-b border-zinc-800/80 transition-colors hover:bg-zinc-900/40">
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/incidents/${inc.id}`}
                            className="block font-mono text-xs text-teal-300/90 hover:text-teal-200"
                            title={inc.policyPubkey}
                          >
                            {inc.policyPubkey.slice(0, 4)}…{inc.policyPubkey.slice(-4)}
                            <span className="mt-0.5 block text-[11px] font-sans font-normal text-zinc-500">
                              {policyLabel(inc.policyPubkey)}
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-zinc-400">
                          <span title={formatRelativeTooltip(inc.pausedAt)}>
                            {formatRelativeTime(inc.pausedAt)}
                          </span>
                        </td>
                        <td className="hidden max-w-[14rem] truncate px-3 py-2.5 text-zinc-400 sm:table-cell">
                          {truncateText(inc.reason)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusChip tone={inc.resolvedAt ? "green" : "amber"}>
                            {inc.resolvedAt ? "Resolved" : "Open"}
                          </StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right — Live Events */}
          <div
            id="tour-live"
            className="rounded-xl border border-[#1e1e22] bg-[#0a0a0b] p-4"
            style={{ animation: "fade-in-up 0.4s ease-out 0.55s backwards" }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">Live Events</h2>
              <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                Hover to pause scroll
              </span>
            </div>
            <div
              ref={logViewportRef}
              className="max-h-[220px] overflow-y-auto rounded-lg border border-zinc-800/90 bg-black/50 px-3 py-2 font-mono text-[11px] leading-relaxed"
              onMouseEnter={() => setLogPaused(true)}
              onMouseLeave={() => setLogPaused(false)}
            >
              {logLines.length === 0 ? (
                <div className="flex h-full min-h-[80px] items-center justify-center">
                  <p className="font-mono text-xs text-zinc-600">— waiting for events —</p>
                </div>
              ) : (
                logLines.map((line) => (
                  <div
                    key={line.id}
                    className={`mb-2 border-l-2 pl-2 ${sseRowAccent(line.type, line.payload)}`}
                  >
                    <span className="text-zinc-500">{new Date(line.receivedAt).toLocaleTimeString()} </span>
                    <span className="font-semibold text-zinc-200">{line.type}</span>
                    <pre className="mt-1 whitespace-pre-wrap break-all text-[10px] text-zinc-500/95">
                      {truncateText(JSON.stringify(line.payload), 280)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
