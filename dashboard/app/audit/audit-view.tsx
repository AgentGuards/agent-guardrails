"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpCircle, ClipboardList, RefreshCw, RotateCcw, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { AppShell } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonRow } from "@/components/skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditLogQuery } from "@/lib/api/use-audit-log-query";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { AuditActionType, AuditLogFilters } from "@/lib/types/dashboard";
import { formatRelativeTime, formatRelativeTooltip, shortAddress } from "@/lib/utils";

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All actions" },
  { value: "pause", label: "Pause" },
  { value: "resume", label: "Resume" },
  { value: "rotate_key", label: "Rotate key" },
  { value: "close_policy", label: "Close policy" },
  { value: "escalation_created", label: "Escalation created" },
  { value: "escalation_updated", label: "Escalation updated" },
];

const ACTION_ICONS: Record<string, ReactNode> = {
  agent_paused: <ShieldOff className="h-3.5 w-3.5 text-red-400" />,
  pause: <ShieldOff className="h-3.5 w-3.5 text-red-400" />,
  resume: <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />,
  rotate_key: <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />,
  policy_closed: <XCircle className="h-3.5 w-3.5 text-zinc-400" />,
  close_policy: <XCircle className="h-3.5 w-3.5 text-zinc-400" />,
  escalation_created: <ArrowUpCircle className="h-3.5 w-3.5 text-purple-400" />,
  escalation_updated: <RefreshCw className="h-3.5 w-3.5 text-purple-400" />,
};

export function AuditView() {
  const router = useRouter();
  const policiesQuery = usePoliciesQuery();
  const [type, setType] = useState("all");
  const [policyPubkey, setPolicyPubkey] = useState("");
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("24h");

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

  if (policiesQuery.isLoading) {
    return (
      <AppShell title="Audit" subtitle="Operator actions across your fleet.">
        <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <table className="w-full min-w-[48rem] border-collapse text-left text-[13px]">
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonRow key={idx} cols={6} />
              ))}
            </tbody>
          </table>
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

  return (
    <AppShell title="Audit" subtitle="Operator actions across your fleet.">
      <div className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Action type</p>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger aria-label="Filter by action type">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Policy</p>
            <Select value={policyPubkey || "all"} onValueChange={(value) => setPolicyPubkey(value === "all" ? "" : value)}>
              <SelectTrigger aria-label="Filter by policy">
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
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Date range</p>
            <Select value={range} onValueChange={(value) => setRange(value as typeof range)}>
              <SelectTrigger aria-label="Filter by date range">
                <SelectValue placeholder="Last 24h" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="30d">Last 30d</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {auditQ.isLoading ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <table className="w-full min-w-[48rem] border-collapse text-left text-[13px]">
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonRow key={idx} cols={6} />
              ))}
            </tbody>
          </table>
        </div>
      ) : auditQ.isError ? (
        <QueryError error={auditQ.error} onRetry={() => void auditQ.refetch()} />
      ) : auditQ.data?.items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <EmptyState
            icon={ClipboardList}
            title="No actions in this period"
            description="Operator actions and system events will appear here."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Policy
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Details
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditQ.data!.items.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      const linkHref = row.relatedIncidentId
                        ? `/incidents/${row.relatedIncidentId}`
                        : row.relatedTxnSig
                          ? `/transactions/${row.relatedTxnSig}`
                          : row.relatedProposalId
                            ? `/agents/${row.policyPubkey}/proposals`
                            : `/agents/${row.policyPubkey}`;
                      router.push(linkHref);
                    }}
                    className="cursor-pointer border-b border-zinc-800/60 transition-colors duration-100 hover:bg-zinc-800/40 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-zinc-400">
                      <span title={formatRelativeTooltip(row.timestamp)}>
                        {formatRelativeTime(row.timestamp)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ACTION_ICONS[row.actionType] ?? <span className="h-3.5 w-3.5" />}
                        <span className="text-sm text-zinc-200">{row.actionType.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/agents/${row.policyPubkey}`}
                        className="text-teal-400 hover:text-teal-300"
                      >
                        {row.policyLabel ?? shortAddress(row.policyPubkey, 5)}
                      </Link>
                    </td>
                    <td className="max-w-[8rem] truncate px-4 py-3 font-mono text-[11px] text-zinc-500">
                      {shortAddress(row.actor, 6)}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-zinc-400">{row.details}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const linkHref = row.relatedIncidentId
                          ? `/incidents/${row.relatedIncidentId}`
                          : row.relatedTxnSig
                            ? `/transactions/${row.relatedTxnSig}`
                            : row.relatedProposalId
                              ? `/agents/${row.policyPubkey}/proposals`
                              : null;
                        const linkLabel = row.relatedIncidentId
                          ? "Incident"
                          : row.relatedTxnSig
                            ? "Txn"
                            : row.relatedProposalId
                              ? "Proposals"
                              : null;
                        return linkHref ? (
                          <Link
                            href={linkHref}
                            className="text-xs font-mono text-teal-400 underline underline-offset-2 hover:text-teal-300"
                          >
                            {linkLabel ?? "View"}
                          </Link>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
