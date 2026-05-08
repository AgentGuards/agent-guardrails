"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpCircle,
  ClipboardList,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
  XCircle,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { AppShell } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonStatCard } from "@/components/skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogQuery } from "@/lib/api/use-audit-log-query";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { AuditLogFilters, AuditRow } from "@/lib/types/dashboard";
import { formatRelativeTime, formatRelativeTooltip, shortAddress } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<string, ReactNode> = {
  agent_paused: <ShieldOff className="h-4 w-4 text-red-400" />,
  pause: <ShieldOff className="h-4 w-4 text-red-400" />,
  resume: <ShieldCheck className="h-4 w-4 text-teal-400" />,
  rotate_key: <RotateCcw className="h-4 w-4 text-zinc-400" />,
  policy_closed: <XCircle className="h-4 w-4 text-zinc-400" />,
  close_policy: <XCircle className="h-4 w-4 text-zinc-400" />,
  escalation_created: <ArrowUpCircle className="h-4 w-4 text-purple-400" />,
  escalation_updated: <RefreshCw className="h-4 w-4 text-purple-400" />,
};

function actionTone(type: string): string {
  if (type === "pause" || type === "agent_paused") return "bg-red-500";
  if (type === "resume") return "bg-teal-500";
  if (type.startsWith("escalation")) return "bg-purple-500";
  return "bg-zinc-600";
}

function actionLabel(type: string): string {
  return type.replace(/_/g, " ");
}

function rowLink(row: AuditRow): string {
  if (row.relatedIncidentId) return `/incidents/${row.relatedIncidentId}`;
  if (row.relatedTxnSig) return `/transactions/${row.relatedTxnSig}`;
  if (row.relatedProposalId) return `/agents/${row.policyPubkey}/proposals`;
  return `/agents/${row.policyPubkey}`;
}

// ---------------------------------------------------------------------------
// AnimatedNumber
// ---------------------------------------------------------------------------

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const to = value;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{Math.round(display)}</>;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
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
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="relative mt-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit row card
// ---------------------------------------------------------------------------

function AuditCard({ row, index }: { row: AuditRow; index: number }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(rowLink(row))}
      className="group flex cursor-pointer items-stretch rounded-xl border border-[#1e1e22] bg-transparent transition-all duration-150 hover:border-zinc-600 hover:bg-white/[0.02]"
      style={{ animation: `fade-in-up 0.25s ease-out ${0.03 * index}s backwards` }}
    >
      {/* Severity strip */}
      <div className={`w-[3px] flex-shrink-0 rounded-l-xl ${actionTone(row.actionType)}`} />

      <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
        {/* Icon */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
          {ACTION_ICONS[row.actionType] ?? <ClipboardList className="h-4 w-4 text-zinc-500" />}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold capitalize text-zinc-200">
              {actionLabel(row.actionType)}
            </span>
            <span className="text-[10px] text-zinc-600">·</span>
            <Link
              href={`/agents/${row.policyPubkey}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-teal-400 hover:text-teal-300"
            >
              {row.policyLabel ?? shortAddress(row.policyPubkey, 5)}
            </Link>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{row.details}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-[10px] text-zinc-600">
              {shortAddress(row.actor, 6)}
            </span>
            {row.relatedIncidentId && (
              <span className="text-[9px] text-red-400/70">incident</span>
            )}
            {row.relatedProposalId && (
              <span className="text-[9px] text-purple-400/70">escalation</span>
            )}
          </div>
        </div>

        {/* Time + arrow */}
        <span
          className="flex-shrink-0 font-mono text-[10px] text-zinc-600"
          title={formatRelativeTooltip(row.timestamp)}
        >
          {formatRelativeTime(row.timestamp)}
        </span>
        <ArrowRight
          size={14}
          className="flex-shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function AuditView() {
  const policiesQuery = usePoliciesQuery();
  const [type, setType] = useState("all");
  const [policyPubkey, setPolicyPubkey] = useState("");
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("24h");
  const [search, setSearch] = useState("");

  const filters: AuditLogFilters = useMemo(() => {
    const f: AuditLogFilters = {};
    if (type !== "all") f.type = type;
    if (policyPubkey) f.policyPubkey = policyPubkey;
    if (range !== "all") {
      const now = Date.now();
      const ms =
        range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
      f.from = new Date(now - ms).toISOString();
      f.to = new Date(now).toISOString();
    }
    return f;
  }, [type, policyPubkey, range]);

  const auditQ = useAuditLogQuery(filters);

  // Client-side search filter
  const searchLower = search.toLowerCase().trim();
  const filteredItems = useMemo(() => {
    if (!auditQ.data?.items) return [];
    if (!searchLower) return auditQ.data.items;
    return auditQ.data.items.filter(
      (row) =>
        row.details.toLowerCase().includes(searchLower) ||
        actionLabel(row.actionType).includes(searchLower) ||
        (row.policyLabel ?? "").toLowerCase().includes(searchLower),
    );
  }, [auditQ.data?.items, searchLower]);

  // Compute stats from all items (before search filter)
  const allItems = auditQ.data?.items ?? [];
  const pauseCount = allItems.filter((r) => r.actionType === "pause").length;
  const resumeCount = allItems.filter((r) => r.actionType === "resume").length;
  const escalationCount = allItems.filter(
    (r) => r.actionType === "escalation_created" || r.actionType === "escalation_updated",
  ).length;

  // Loading state
  if (policiesQuery.isLoading) {
    return (
      <AppShell title="Audit" subtitle="Operator actions across your fleet.">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-9 w-52 animate-pulse rounded-md bg-zinc-800" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-7 w-14 animate-pulse rounded-full bg-zinc-800" />
              ))}
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#1e1e22] bg-zinc-800/30" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (policiesQuery.isError) {
    return (
      <AppShell title="Audit" subtitle="Operator actions across your fleet.">
        <QueryError error={policiesQuery.error} onRetry={() => void policiesQuery.refetch()} />
      </AppShell>
    );
  }

  const dateChips: { key: typeof range; label: string }[] = [
    { key: "24h", label: "24h" },
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
    { key: "all", label: "All" },
  ];

  return (
    <AppShell title="Audit" subtitle="Operator actions across your fleet.">

      {/* ── Stats Strip ── */}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Actions" glowColor="radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 70%)" animDelay="0s">
          <div className="font-mono text-xl font-bold tracking-tight text-zinc-50">
            <AnimatedNumber value={allItems.length} />
          </div>
        </StatCard>

        <StatCard label="Pauses" glowColor="radial-gradient(circle, hsl(var(--crimson) / 0.18), transparent 70%)" animDelay="0.06s">
          <div className="font-mono text-xl font-bold tracking-tight text-red-400">
            <AnimatedNumber value={pauseCount} />
          </div>
        </StatCard>

        <StatCard label="Resumes" glowColor="radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 70%)" animDelay="0.12s">
          <div className="font-mono text-xl font-bold tracking-tight text-teal-400">
            <AnimatedNumber value={resumeCount} />
          </div>
        </StatCard>

        <StatCard label="Escalations" glowColor="radial-gradient(circle, hsla(245,58%,51%,0.18), transparent 70%)" animDelay="0.18s">
          <div className="font-mono text-xl font-bold tracking-tight text-purple-400">
            <AnimatedNumber value={escalationCount} />
          </div>
        </StatCard>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="shrink-0 text-zinc-500 hover:text-zinc-300">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Action type select */}
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label="Filter by action type" className="w-auto min-w-[140px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="pause">Pause</SelectItem>
            <SelectItem value="resume">Resume</SelectItem>
            <SelectItem value="rotate_key">Rotate key</SelectItem>
            <SelectItem value="close_policy">Close policy</SelectItem>
            <SelectItem value="escalation_created">Escalation created</SelectItem>
            <SelectItem value="escalation_updated">Escalation updated</SelectItem>
          </SelectContent>
        </Select>

        {/* Policy select */}
        <Select
          value={policyPubkey || "all"}
          onValueChange={(v) => setPolicyPubkey(v === "all" ? "" : v)}
        >
          <SelectTrigger aria-label="Filter by policy" className="w-auto min-w-[140px]">
            <SelectValue placeholder="All policies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All policies</SelectItem>
            {(policiesQuery.data ?? []).map((p) => (
              <SelectItem key={p.pubkey} value={p.pubkey}>
                {p.label ?? shortAddress(p.pubkey, 6)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Date range chips */}
        <div className="flex gap-1">
          {dateChips.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setRange(d.key)}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                range === d.key
                  ? "border-teal-500/20 bg-teal-500/[0.08] text-teal-400"
                  : "border-[#1e1e22] bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed ── */}
      {auditQ.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#1e1e22] bg-zinc-800/30" />
          ))}
        </div>
      ) : auditQ.isError ? (
        <QueryError error={auditQ.error} onRetry={() => void auditQ.refetch()} />
      ) : (
        <>
          <p className="mb-3 text-[11px] text-zinc-500">
            <span className="font-semibold text-zinc-400">{filteredItems.length}</span>
            {" "}of {allItems.length} actions
            {search ? " — filtered" : ""}.
          </p>

          {filteredItems.length > 0 ? (
            <div className="grid gap-3">
              {filteredItems.map((row, i) => (
                <AuditCard key={row.id} row={row} index={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
              <EmptyState
                icon={ClipboardList}
                title={search ? "No matching actions" : "No actions in this period"}
                description={search ? "Try adjusting your search." : "Operator actions and system events will appear here."}
              />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
