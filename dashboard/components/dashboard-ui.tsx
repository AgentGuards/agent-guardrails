"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";
import {
  effectiveVerdict,
  policyLabel,
  programLabel,
  shortAddress,
  formatDateTime,
  formatRelativeTime,
  lamportsToSol,
  statusTone,
  verdictTone,
} from "@/lib/utils";
import type { IncidentSummary, PolicySummary, TransactionSummary } from "@/lib/types/dashboard";
import { useLayoutStore } from "@/lib/stores/layout";
import { WalletControls } from "./wallet-controls";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapsed, setSidebarOpen } = useLayoutStore();
  const monitorLinks = [
    { href: "/agents", label: "Agents" },
    { href: "/activity", label: "Activity" },
    { href: "/incidents", label: "Incidents" },
  ];
  const setupLinks = [
    { href: "/agents/new", label: "New agent" },
    { href: "/signin", label: "Sign in" },
  ];
  const isLinkActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="shell-dash">
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`sidebar${sidebarOpen ? " is-open" : ""}${sidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-mark">G</div>
          <div className="brand-copy">
            <strong>Guardrails</strong>
            <span>Solana - devnet</span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn hidden md:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebarCollapsed}
        >
          {sidebarCollapsed ? "Expand" : "Collapse"}
        </button>
        <nav className="nav">
          <div className="nav-heading">Monitor</div>
          {monitorLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isLinkActive(link.href) ? "active" : ""}`}
              aria-current={isLinkActive(link.href) ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              title={link.label}
            >
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
          <div className="nav-heading mt-4">Setup</div>
          {setupLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isLinkActive(link.href) ? "active" : ""}`}
              aria-current={isLinkActive(link.href) ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              title={link.label}
            >
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-wallet">
          <div className="sidebar-wallet-dot" />
          <div className="sidebar-wallet-copy">
            <span>Connected wallet</span>
            <strong>7xKX...gAsU</strong>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="min-w-0 pr-2">
            <div className="page-title">{title}</div>
            {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
          </div>
          <div className="toolbar">
            <button
              className="button button-secondary md:hidden"
              type="button"
              onClick={toggleSidebar}
            >
              {sidebarOpen ? "Hide nav" : "Menu"}
            </button>
            {actions}
            <WalletControls />
          </div>
        </header>
        <div className="content-enter">{children}</div>
      </main>
    </div>
  );
}

export function StatusChip({ tone, children }: { tone: "green" | "amber" | "red"; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function PolicyCard({ policy }: { policy: PolicySummary }) {
  const tone = statusTone(policy);
  const spent = lamportsToSol(policy.dailySpentLamports ?? "0");
  const budget = lamportsToSol(policy.dailyBudgetLamports);
  const spendPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const progressTone = spendPct >= 90 ? "bg-red-500" : spendPct >= 66 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <Link href={`/agents/${policy.pubkey}`} className="card card-interactive">
      <div className="spread">
        <div>
          <div className="card-title">Agent</div>
          <div className="metric-value">{policy.label ?? shortAddress(policy.pubkey, 6, 4)}</div>
        </div>
        <StatusChip tone={tone}>
          {!policy.isActive ? "Paused" : new Date(policy.sessionExpiry).getTime() < Date.now() ? "Expired" : "Active"}
        </StatusChip>
      </div>
      <div className="mt-4 text-xs text-zinc-500">Daily spend</div>
      <div className="mt-1 flex items-center justify-between text-sm text-zinc-300">
        <span>{spent.toFixed(2)}</span>
        <span>/ {budget.toFixed(0)} SOL</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${progressTone}`} style={{ width: `${spendPct}%` }} />
      </div>
      <div className="layout-three mt-4">
        <Metric label="Session" value={formatRelativeTime(policy.sessionExpiry)} />
        <Metric label="Per tx cap" value={`${lamportsToSol(policy.maxTxLamports)} SOL`} />
        <Metric label="Daily budget" value={`${budget.toFixed(0)} SOL`} />
      </div>
      <div className="muted" style={{ marginTop: 16 }}>
        Programs: {policy.allowedPrograms.slice(0, 3).map(programLabel).join(", ")}
        {policy.allowedPrograms.length > 3 ? ` +${policy.allowedPrograms.length - 3}` : ""}
      </div>
    </Link>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

export function SpendGauge({ spentLamports, budgetLamports }: { spentLamports: string; budgetLamports: string }) {
  const spent = lamportsToSol(spentLamports);
  const budget = lamportsToSol(budgetLamports);
  const ratio = budget === 0 ? 0 : (spent / budget) * 100;
  const clampedRatio = Math.min(ratio, 100);
  const tone = ratio >= 90 ? "#ff6b6b" : ratio >= 66 ? "#ffb84d" : "#29c780";

  if (budget <= 0) {
    return (
      <div className="card empty" style={{ marginTop: 12 }}>
        No budget set.
      </div>
    );
  }

  return (
    <div className="mx-auto max-h-[min(220px,50vw)] w-full max-w-full">
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          barSize={18}
          data={[{ value: clampedRatio, fill: tone }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background dataKey="value" cornerRadius={16} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -128, textAlign: "center" }}>
        {ratio > 100 ? (
          <>
            <div className="metric-value" style={{ color: "#ff6b6b" }}>
              OVER BUDGET
            </div>
            <div className="muted">
              {spent.toFixed(1)} / {budget.toFixed(1)} SOL
            </div>
          </>
        ) : (
          <>
            <div className="metric-value">{spent.toFixed(1)} SOL</div>
            <div className="muted">of {budget.toFixed(1)} SOL budget</div>
          </>
        )}
      </div>
    </div>
  );
}

export function TransactionRow({
  transaction,
  showAgent = false,
}: {
  transaction: TransactionSummary;
  showAgent?: boolean;
}) {
  const verdict = effectiveVerdict(transaction.verdict?.verdict);
  const tone = verdictTone(verdict);
  return (
    <div className="row-card card-interactive">
      <div className="row-main">
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <StatusChip tone={tone === "slate" ? "green" : tone}>{verdict.toUpperCase()}</StatusChip>
            <strong>{programLabel(transaction.targetProgram)}</strong>
            {showAgent ? <span className="muted">{policyLabel(transaction.policyPubkey)}</span> : null}
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            {transaction.verdict?.reasoning ?? "No anomaly reasoning stored for this transaction."}
          </div>
        </div>
        <div className="min-w-0 shrink-0 text-left sm:text-right">
          <div className="metric-value text-base">
            {transaction.amountLamports ? `${lamportsToSol(transaction.amountLamports).toFixed(2)} SOL` : "—"}
          </div>
          <div className="muted">{formatRelativeTime(transaction.blockTime)}</div>
        </div>
      </div>
      <div className="spread muted mt-3 gap-x-4">
        <span className="mono min-w-0 break-all">{shortAddress(transaction.txnSig, 10, 8)}</span>
        <span className="shrink-0 whitespace-nowrap">{formatDateTime(transaction.blockTime)}</span>
      </div>
    </div>
  );
}

export function IncidentTimeline({
  items,
}: {
  items: Array<{ time: string; title: string; detail: string; tone: "green" | "amber" | "red" | "blue" }>;
}) {
  return (
    <div className="timeline">
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className={`timeline-item ${item.tone === "blue" ? "" : item.tone}`}>
          <div className="muted mono">{item.time}</div>
          <strong>{item.title}</strong>
          <div className="muted">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function IncidentTable({ incidents }: { incidents: IncidentSummary[] }) {
  if (!incidents.length) {
    return <div className="card empty">No incidents yet.</div>;
  }

  return (
    <div className="card p-0 sm:p-5">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Reason</th>
              <th>Paused at</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id}>
                <td className="max-w-[10rem] truncate sm:max-w-none sm:whitespace-normal">
                  <Link href={`/incidents/${incident.id}`}>{policyLabel(incident.policyPubkey)}</Link>
                </td>
                <td className="max-w-[12rem] truncate sm:max-w-none sm:whitespace-normal">{incident.reason}</td>
                <td className="whitespace-nowrap">{formatDateTime(incident.pausedAt)}</td>
                <td>
                  <StatusChip tone={incident.resolvedAt ? "green" : "red"}>{incident.resolvedAt ? "Resolved" : "Active"}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

