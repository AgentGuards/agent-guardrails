"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowUp, Search, X } from "lucide-react";
import { AppShell, TransactionRow } from "@/components/dashboard-ui";
import { EmptyState } from "@/components/EmptyState";
import { QueryError } from "@/components/query-states";
import { ActivityViewSkeleton } from "@/components/skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api/client";
import { useInfiniteTransactionsQuery } from "@/lib/api/use-infinite-transactions-query";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import { useActivityFiltersStore } from "@/lib/stores/activity-filters";
import type { DateRange } from "@/lib/stores/activity-filters";
import { subscribeSSEEvents } from "@/lib/sse/useSSE";
import { effectiveVerdict, shortAddress } from "@/lib/utils";
import type { TransactionSummary } from "@/lib/types/dashboard";

// ---------------------------------------------------------------------------
// AnimatedNumber — count-up with cubic ease-out (from fleet-dashboard.tsx)
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
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>;
}

// ---------------------------------------------------------------------------
// ActivityStatCard — from FleetStatCardV2 pattern
// ---------------------------------------------------------------------------

function ActivityStatCard({
  label,
  glowColor,
  animDelay,
  children,
}: {
  label: string;
  glowColor: string;
  animDelay: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] px-5 py-[18px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-zinc-700/50 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_hsl(var(--teal)/0.1),0_0_20px_hsl(var(--teal)/0.05)]"
      style={{ animation: `fade-in-up 0.4s ease-out ${animDelay} backwards` }}
    >
      <div
        className="pointer-events-none absolute -right-5 -top-8 h-20 w-24 rounded-full opacity-50 blur-2xl"
        style={{ background: glowColor }}
      />
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="relative mt-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time-grouping helper
// ---------------------------------------------------------------------------

type TimeGroup = { label: string; items: TransactionSummary[] };

function groupByTimePeriod(transactions: TransactionSummary[]): TimeGroup[] {
  const now = Date.now();
  const groups: Record<string, TransactionSummary[]> = {};
  const order = ["Last 5 minutes", "Last hour", "Today", "Yesterday", "Older"];

  for (const txn of transactions) {
    const diff = now - new Date(txn.blockTime).getTime();
    const mins = diff / 60_000;
    let key: string;
    if (mins < 5) key = "Last 5 minutes";
    else if (mins < 60) key = "Last hour";
    else if (mins < 1440) key = "Today";
    else if (mins < 2880) key = "Yesterday";
    else key = "Older";
    (groups[key] ??= []).push(txn);
  }

  return order.filter((k) => groups[k]?.length).map((k) => ({ label: k, items: groups[k] }));
}

// ---------------------------------------------------------------------------
// Date range cutoff helper
// ---------------------------------------------------------------------------

function dateRangeCutoff(range: DateRange): number | null {
  if (range === "all") return null;
  const ms = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  return Date.now() - ms;
}

// ---------------------------------------------------------------------------
// Filter chip constants
// ---------------------------------------------------------------------------

const VERDICT_OPTIONS = [
  { key: "all" as const, label: "All" },
  { key: "allow" as const, label: "Allow" },
  { key: "flag" as const, label: "Flag" },
  { key: "pause" as const, label: "Pause" },
];

const DATE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityView() {
  const {
    selectedPolicyPubkey,
    verdictFilter,
    searchQuery,
    dateRange,
    setSelectedPolicy,
    setVerdictFilter,
    setSearchQuery,
    setDateRange,
    resetFilters,
  } = useActivityFiltersStore();

  const policiesQuery = usePoliciesQuery();
  const transactionsQuery = useInfiniteTransactionsQuery(
    selectedPolicyPubkey ?? undefined,
    50,
  );

  // ── New-txn banner state ──
  const [newTxnCount, setNewTxnCount] = useState(0);
  const [sentinelVisible, setSentinelVisible] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to detect scroll position
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setSentinelVisible(entry.isIntersecting);
        if (entry.isIntersecting) setNewTxnCount(0);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Subscribe to SSE for new-txn banner
  useEffect(() => {
    return subscribeSSEEvents((event) => {
      if (event.type === "new_transaction" && !sentinelVisible) {
        setNewTxnCount((c) => c + 1);
      }
    });
  }, [sentinelVisible]);

  const scrollToTop = useCallback(() => {
    sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewTxnCount(0);
  }, []);

  // ── Loading / Error states ──
  if (transactionsQuery.isLoading) {
    return (
      <AppShell title="Activity" subtitle="Global guarded transactions and Guardian verdicts.">
        <ActivityViewSkeleton />
      </AppShell>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <AppShell title="Activity" subtitle="Global guarded transactions and Guardian verdicts.">
        <QueryError
          error={transactionsQuery.error}
          onRetry={() => void transactionsQuery.refetch()}
        />
      </AppShell>
    );
  }

  // ── Filtering ──
  const allItems = transactionsQuery.data?.items ?? [];
  const cutoff = dateRangeCutoff(dateRange);
  const searchLower = searchQuery.toLowerCase().trim();

  const transactions = allItems.filter((item) => {
    if (verdictFilter !== "all" && effectiveVerdict(item.verdict?.verdict) !== verdictFilter)
      return false;
    if (cutoff && new Date(item.blockTime).getTime() < cutoff) return false;
    if (
      searchLower &&
      !item.txnSig.toLowerCase().includes(searchLower) &&
      !(item.verdict?.reasoning ?? "").toLowerCase().includes(searchLower)
    )
      return false;
    return true;
  });

  // ── Verdict counts for stats ──
  const verdictCounts = { total: allItems.length, allow: 0, flag: 0, pause: 0 };
  for (const item of allItems) {
    const v = effectiveVerdict(item.verdict?.verdict);
    if (v === "allow") verdictCounts.allow++;
    else if (v === "flag") verdictCounts.flag++;
    else if (v === "pause") verdictCounts.pause++;
  }

  // ── Time groups ──
  const timeGroups = groupByTimePeriod(transactions);

  // ── Active filters check ──
  const hasActiveFilters =
    verdictFilter !== "all" ||
    searchQuery !== "" ||
    dateRange !== "all" ||
    selectedPolicyPubkey !== null;

  const policiesError =
    policiesQuery.isError && !policiesQuery.data?.length
      ? getErrorMessage(policiesQuery.error)
      : null;

  return (
    <AppShell title="Activity" subtitle="Global guarded transactions and Guardian verdicts.">
      {/* Scroll sentinel for new-txn banner */}
      <div ref={sentinelRef} />

      {policiesError ? (
        <div className="mb-4">
          <QueryError
            error={policiesQuery.error}
            title="Could not load policy filter list"
            onRetry={() => void policiesQuery.refetch()}
          />
        </div>
      ) : null}

      {/* ── Stats Strip ── */}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActivityStatCard
          label="Transactions"
          glowColor="radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 70%)"
          animDelay="0s"
        >
          <div className="font-mono text-xl font-bold tracking-tight text-zinc-50">
            <AnimatedNumber value={verdictCounts.total} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {transactionsQuery.data?.isCapped ? "feed capped" : "loaded"}
          </div>
        </ActivityStatCard>

        <ActivityStatCard
          label="Allowed"
          glowColor="radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 70%)"
          animDelay="0.06s"
        >
          <div className="font-mono text-xl font-bold tracking-tight text-teal-400">
            <AnimatedNumber value={verdictCounts.allow} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {verdictCounts.total > 0
              ? `${((verdictCounts.allow / verdictCounts.total) * 100).toFixed(1)}% pass rate`
              : "—"}
          </div>
        </ActivityStatCard>

        <ActivityStatCard
          label="Flagged"
          glowColor="radial-gradient(circle, hsl(var(--amber) / 0.18), transparent 70%)"
          animDelay="0.12s"
        >
          <div className="font-mono text-xl font-bold tracking-tight text-amber-400">
            <AnimatedNumber value={verdictCounts.flag} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {verdictCounts.total > 0
              ? `${((verdictCounts.flag / verdictCounts.total) * 100).toFixed(1)}% flag rate`
              : "—"}
          </div>
        </ActivityStatCard>

        <ActivityStatCard
          label="Paused"
          glowColor="radial-gradient(circle, hsl(var(--crimson) / 0.18), transparent 70%)"
          animDelay="0.18s"
        >
          <div className="font-mono text-xl font-bold tracking-tight text-red-400">
            <AnimatedNumber value={verdictCounts.pause} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {verdictCounts.pause > 0 ? "kill switch triggered" : "all clear"}
          </div>
        </ActivityStatCard>
      </section>

      {/* ── Toolbar ── */}
      <div
        className="mb-4 flex flex-wrap items-center gap-3"
        style={{ animation: "fade-in-up 0.35s ease-out 0.25s backwards" }}
      >
        {/* Search */}
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-md border border-[#1e1e22] px-3 py-2 transition-colors focus-within:border-teal-500/20">
          <Search size={15} className="shrink-0 text-zinc-500" strokeWidth={1.7} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signature or reasoning..."
            className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="shrink-0 text-zinc-500 hover:text-zinc-300"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Verdict chips */}
        <div className="flex gap-1">
          {VERDICT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setVerdictFilter(opt.key)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition-all ${
                verdictFilter === opt.key
                  ? "border-teal-500/20 bg-teal-500/[0.08] text-teal-400"
                  : "border-[#1e1e22] bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Policy select */}
        <Select
          value={selectedPolicyPubkey ?? "all"}
          onValueChange={(v) => setSelectedPolicy(v === "all" ? null : v)}
        >
          <SelectTrigger aria-label="Filter by agent" className="w-auto min-w-[140px]">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {(policiesQuery.data ?? []).map((policy) => (
              <SelectItem key={policy.pubkey} value={policy.pubkey}>
                {policy.label ?? shortAddress(policy.pubkey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Date range presets */}
        <div className="flex gap-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDateRange(dateRange === opt.key ? "all" : opt.key)}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                dateRange === opt.key
                  ? "border-teal-500/20 bg-teal-500/[0.08] text-teal-400"
                  : "border-[#1e1e22] bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Filter Pills ── */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {verdictFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/40 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400">
              Verdict: {verdictFilter}
              <button
                type="button"
                onClick={() => setVerdictFilter("all")}
                className="rounded-full text-zinc-500 hover:text-zinc-200"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {selectedPolicyPubkey && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/40 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400">
              Agent: {shortAddress(selectedPolicyPubkey)}
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="rounded-full text-zinc-500 hover:text-zinc-200"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/40 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400">
              Search: {searchQuery.slice(0, 16)}
              {searchQuery.length > 16 ? "…" : ""}
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-full text-zinc-500 hover:text-zinc-200"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {dateRange !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/40 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400">
              Range: {dateRange}
              <button
                type="button"
                onClick={() => setDateRange("all")}
                className="rounded-full text-zinc-500 hover:text-zinc-200"
              >
                <X size={11} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── New Transactions Banner ── */}
      {newTxnCount > 0 && !sentinelVisible && (
        <div className="sticky top-0 z-10 mb-4 flex justify-center">
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/[0.08] px-4 py-2 text-[12px] font-medium text-teal-400 shadow-lg backdrop-blur-sm transition-all hover:bg-teal-500/[0.12]"
          >
            <ArrowUp size={14} />
            {newTxnCount} new transaction{newTxnCount > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* ── Feed Meta ── */}
      <p className="mb-3 text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-400">{transactions.length}</span>
        {" "}of {allItems.length} loaded (newest first)
        {hasActiveFilters ? " — filtered" : ""}
        {transactionsQuery.data?.isCapped ? " · feed capped" : ""}.
      </p>

      {/* ── Time-Grouped Transaction Feed ── */}
      {transactions.length > 0 ? (
        <div className="space-y-1">
          {timeGroups.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              <div className="mb-3 mt-5 flex items-center gap-3 first:mt-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {group.label}
                </span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {group.items.length}
                </span>
                <div className="h-px flex-1 bg-zinc-800/60" />
              </div>
              {/* Transaction rows */}
              <div className="grid gap-3">
                {group.items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    showAgent
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <EmptyState
            icon={Activity}
            title="No matching transactions"
            description="Try adjusting your filters or search query."
          />
        </div>
      )}

      {/* ── Load More ── */}
      {transactionsQuery.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="rounded-md border border-[#1e1e22] bg-transparent px-5 py-2.5 text-[12px] font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-white/[0.03] hover:text-zinc-300 disabled:opacity-50"
            disabled={transactionsQuery.isFetchingNextPage}
            onClick={() => void transactionsQuery.fetchNextPage()}
          >
            {transactionsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
