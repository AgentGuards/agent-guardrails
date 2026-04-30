"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { useEffect, type ReactNode } from "react";
import {
  effectiveVerdict,
  policyLabel,
  programLabel,
  shortAddress,
  formatDateTime,
  formatRelativeTime,
  lamportsToSol,
  verdictTone,
} from "@/lib/utils";
import type { IncidentSummary, PolicySummary, TransactionSummary } from "@/lib/types/dashboard";
import { useLayoutStore } from "@/lib/stores/layout";
import { WalletControls } from "./wallet-controls";

/* ── SVG icon paths (matching design reference) ── */
const navIconPaths = {
  home: "M3 11.5L12 4l9 7.5M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10",
  agents: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21v-1a5 5 0 015-5h8a5 5 0 015 5v1",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  incidents: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  plus: "M12 5v14M5 12h14",
  panelToggle: "M4 5h16v14H4zM9 5v14",
  bell: "M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1.1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1",
  chevronUpDown: "M7 9l5-5 5 5M7 15l5 5 5-5",
} as const;

function NavIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

type NavLink = {
  href: string;
  label: string;
  icon: string;
  nested?: boolean;
};

const navGroups: NavLink[][] = [
  [{ href: "/", label: "Home", icon: navIconPaths.home, nested: false }],
  [
    { href: "/agents", label: "Agents", icon: navIconPaths.agents },
    { href: "/activity", label: "Activity", icon: navIconPaths.activity },
    { href: "/incidents", label: "Incidents", icon: navIconPaths.incidents },
  ],
  [{ href: "/agents/new", label: "New agent", icon: navIconPaths.plus, nested: false }],
];

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
  const router = useRouter();
  const walletAdapter = useWallet();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapsed, setSidebarOpen } =
    useLayoutStore();

  if (!walletAdapter.connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  let connected = false;
  let publicKey: { toBase58(): string } | null = null;
  try {
    connected = Boolean(walletAdapter.connected);
    publicKey = walletAdapter.publicKey ?? null;
  } catch {
    // Graceful fallback when WalletProvider is not mounted (e.g. tests).
  }

  const walletAddress = publicKey ? shortAddress(publicKey.toBase58(), 4, 4) : "Not connected";
  const currentPath = pathname ?? "";
  const isLinkActive = (href: string, nested: boolean | undefined) =>
    href === "/"
      ? currentPath === "/"
      : currentPath === href || (nested !== false && currentPath.startsWith(`${href}/`));

  const collapsed = sidebarCollapsed;
  const sidebarWidth = collapsed ? "w-[60px]" : "w-60";

  const renderNavItem = (link: NavLink) => {
    const active = isLinkActive(link.href, link.nested);
    return (
      <Link
        key={link.href}
        href={link.href}
        title={collapsed ? link.label : undefined}
        aria-label={link.label}
        aria-current={active ? "page" : undefined}
        onClick={() => setSidebarOpen(false)}
        className={`group relative flex items-center rounded-md text-[13px] transition-[background,color] duration-150 ${collapsed ? "h-9 w-9 mx-auto justify-center" : "gap-2.5 px-2.5 py-[7px]"
          } ${active
            ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.32)]"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
      >
        <NavIcon d={link.icon} size={collapsed ? 18 : 16} />
        {!collapsed ? <span className="truncate">{link.label}</span> : null}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full ${sidebarWidth} flex-col border-r border-border bg-card shadow-2xl transition-[width,transform] duration-300 ease-out md:sticky md:top-0 md:z-0 md:h-screen md:shrink-0 md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Workspace pill / brand selector */}
        <div className={`px-2.5 pt-3 pb-3 ${collapsed ? "" : ""}`}>
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className={`relative flex items-center rounded-lg border border-border bg-secondary/60 transition-colors hover:bg-secondary ${collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2 px-2 py-2"
              }`}
          >
            <span className="relative h-6 w-6 shrink-0 rounded-md bg-gradient-to-br from-primary to-teal-500 shadow-[0_0_14px_hsl(var(--primary)/0.35)] after:absolute after:inset-[5px] after:rounded-[3px] after:border-[1.5px] after:border-primary-foreground/90 after:content-['']" />
            {!collapsed ? (
              <>
                {/* Free / devnet tag floating top-left */}
                <span className="absolute -left-1 -top-2 rounded-sm bg-amber-500/20 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-500 shadow-[0_0_0_1px_hsl(var(--amber)/0.35)]">
                  Devnet
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold leading-tight tracking-[-0.01em]">
                    Guardrails
                  </div>
                  <div className="truncate font-mono text-[10px] leading-tight text-muted-foreground">
                    {connected ? walletAddress : "solana · devnet"}
                  </div>
                </div>
                <NavIcon d={navIconPaths.chevronUpDown} size={14} />
              </>
            ) : null}
          </Link>
        </div>

        {/* ── Nav groups ── */}
        <nav className="flex-1 overflow-y-auto px-2.5">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {idx > 0 ? <div className="my-2 border-t border-border/70" /> : null}
              <div className="flex flex-col gap-0.5">{group.map(renderNavItem)}</div>
            </div>
          ))}
        </nav>

        {/* Footer system-status badge */}
        <div className="border-t border-border px-3 py-3">
          {collapsed ? (
            <div className="flex justify-center">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Online
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  System Status &middot; Build 2026.04
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-6">
          {/* Sidebar toggle (desktop = collapse, mobile = open) */}
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex"
            onClick={toggleSidebarCollapsed}
          >
            <NavIcon d={navIconPaths.panelToggle} size={18} />
          </button>
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            onClick={toggleSidebar}
          >
            <NavIcon d={navIconPaths.panelToggle} size={18} />
          </button>

          <div className="text-[13px] text-foreground">
            <span className="text-muted-foreground">Dashboard</span>
            <span className="px-2 text-muted-foreground/60">/</span>
            <span className="text-foreground">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <WalletControls />
            <button
              type="button"
              aria-label="Notifications"
              className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex"
            >
              <NavIcon d={navIconPaths.bell} size={16} />
            </button>
          </div>
        </header>

        <div className="px-5 py-7 md:px-8 md:py-8">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
              {subtitle ? <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </header>
          <div className="animate-[fade-in-up_220ms_ease-out]">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function StatusChip({ tone, children }: { tone: "green" | "amber" | "red"; children: ReactNode }) {
  const toneClasses = {
    green: "bg-teal-500/15 text-teal-500 border border-teal-500/30 shadow-teal-500/10",
    amber: "bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-amber-500/10",
    red: "bg-crimson-500/15 text-crimson-500 border border-crimson-500/30 shadow-crimson-500/10",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${toneClasses[tone]}`}>{children}</span>;
}

export function PolicyCard({ policy }: { policy: PolicySummary }) {
  const spent = lamportsToSol(policy.dailySpentLamports ?? "0");
  const budget = lamportsToSol(policy.dailyBudgetLamports);
  const displayBudget = budget > 0 && budget < 1 ? budget.toFixed(2) : budget.toFixed(0);
  const spendPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const progressTone = spendPct >= 90 ? "bg-crimson-500" : spendPct >= 66 ? "bg-amber-500" : "bg-teal-500";
  const sessionExpired = new Date(policy.sessionExpiry).getTime() < Date.now();

  return (
    <Link
      href={`/agents/${policy.pubkey}`}
      className="block rounded-xl border border-card-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_0_24px_hsl(var(--primary)/0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[15px] font-semibold tracking-tight ${policy.label ? "" : "italic text-muted-foreground"}`}>
            {policy.label ?? "Unlabeled agent"}
          </div>
          <div className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
            {shortAddress(policy.pubkey, 6, 6)}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {!policy.isActive ? (
            <span className="rounded border border-crimson-500/30 bg-crimson-500/10 px-2 py-0.5 font-mono text-[11px] text-crimson-500">
              PAUSED
            </span>
          ) : sessionExpired ? (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-500">
              SESSION EXPIRED
            </span>
          ) : (
            <span className="rounded border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[11px] text-teal-500">
              ACTIVE
            </span>
          )}
          {policy.squadsMultisig ? (
            <span className="rounded border border-primary/35 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
              SQUADS
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Daily spend</span>
          <span className="font-mono text-foreground">
            {spent.toFixed(2)} <span className="text-muted-foreground">/ {displayBudget} SOL</span>
          </span>
        </div>
        <div className="h-1.5 rounded bg-muted">
          <div className={`h-full rounded ${progressTone}`} style={{ width: `${spendPct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-border pt-3">
        <div>
          <div className="mb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Session</div>
          <div className="font-mono text-xs text-foreground">{formatRelativeTime(policy.sessionExpiry)}</div>
        </div>
        <div>
          <div className="mb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Per tx cap</div>
          <div className="font-mono text-xs text-foreground">{lamportsToSol(policy.maxTxLamports)} SOL</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Programs: {policy.allowedPrograms.slice(0, 3).map(programLabel).join(", ")}
        {policy.allowedPrograms.length > 3 ? ` +${policy.allowedPrograms.length - 3}` : ""}
      </div>
    </Link>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export function SpendGauge({ spentLamports, budgetLamports }: { spentLamports: string; budgetLamports: string }) {
  const spent = lamportsToSol(spentLamports);
  const budget = lamportsToSol(budgetLamports);
  const ratio = budget === 0 ? 0 : (spent / budget) * 100;
  const clampedRatio = Math.min(ratio, 100);
  const tone = ratio >= 90 ? "hsl(var(--crimson))" : ratio >= 66 ? "hsl(var(--amber))" : "hsl(var(--teal))";

  if (budget <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 py-8 px-4 text-center text-sm text-muted-foreground transition-colors duration-200" style={{ marginTop: 12 }}>
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
            <div className="text-2xl font-bold text-crimson-500">
              OVER BUDGET
            </div>
            <div className="text-sm text-muted-foreground">
              {spent.toFixed(1)} / {budget.toFixed(1)} SOL
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">{spent.toFixed(1)} SOL</div>
            <div className="text-sm text-muted-foreground">of {budget.toFixed(1)} SOL budget</div>
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
    <div className="cursor-pointer rounded-xl border border-border/70 bg-card/60 p-5 transition-all duration-200 hover:border-input hover:bg-card">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <StatusChip tone={tone === "slate" ? "green" : tone}>{verdict.toUpperCase()}</StatusChip>
            <strong>{programLabel(transaction.targetProgram)}</strong>
            {showAgent ? <span className="text-sm text-muted-foreground">{policyLabel(transaction.policyPubkey)}</span> : null}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {transaction.verdict?.reasoning ?? "No anomaly reasoning stored for this transaction."}
          </div>
        </div>
        <div className="min-w-0 shrink-0 text-left sm:text-right">
          <div className="text-base font-bold text-foreground">
            {transaction.amountLamports ? `${lamportsToSol(transaction.amountLamports).toFixed(2)} SOL` : "—"}
          </div>
          <div className="text-sm text-muted-foreground">{formatRelativeTime(transaction.blockTime)}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 text-sm text-muted-foreground">
        <span className="min-w-0 break-all font-mono text-xs text-muted-foreground sm:text-sm">{shortAddress(transaction.txnSig, 10, 8)}</span>
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
  const toneClasses: Record<"green" | "amber" | "red" | "blue", string> = {
    green: "bg-teal-500 shadow-[0_0_0_1px_hsl(var(--teal)),0_0_12px_hsl(var(--teal)/0.45)]",
    amber: "bg-amber-500 shadow-[0_0_0_1px_hsl(var(--amber)),0_0_12px_hsl(var(--amber)/0.45)]",
    red: "bg-crimson-500 shadow-[0_0_0_1px_hsl(var(--crimson)),0_0_12px_hsl(var(--crimson)/0.45)]",
    blue: "bg-primary shadow-[0_0_0_1px_hsl(var(--primary)),0_0_12px_hsl(var(--primary)/0.45)]",
  };

  return (
    <div className="relative pl-8 before:absolute before:bottom-1.5 before:left-[7px] before:top-1.5 before:w-px before:bg-border before:content-['']">
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className="relative pb-4 last:pb-0">
          <span className={`absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${toneClasses[item.tone]}`} />
          <div className="font-mono text-[11.5px] tracking-[0.04em] text-muted-foreground">{item.time}</div>
          <div className="mt-0.5 text-[13px] font-medium text-foreground">{item.title}</div>
          <div className="mt-1 font-mono text-[12.5px] text-muted-foreground">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function IncidentTable({ incidents }: { incidents: IncidentSummary[] }) {
  if (!incidents.length) {
    return <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 py-8 px-4 text-center text-sm text-muted-foreground transition-colors duration-200">No incidents yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Agent</th>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Reason</th>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Paused at</th>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id} className="cursor-pointer transition-colors hover:bg-secondary">
                <td className="max-w-[10rem] truncate border-b border-border px-4 py-3.5 text-foreground sm:max-w-none sm:whitespace-normal">
                  <Link href={`/incidents/${incident.id}`} className="hover:text-primary">
                    {policyLabel(incident.policyPubkey)}
                  </Link>
                </td>
                <td className="max-w-[12rem] truncate border-b border-border px-4 py-3.5 text-muted-foreground sm:max-w-none sm:whitespace-normal">{incident.reason}</td>
                <td className="whitespace-nowrap border-b border-border px-4 py-3.5 font-mono text-muted-foreground">{formatDateTime(incident.pausedAt)}</td>
                <td className="border-b border-border px-4 py-3.5 text-muted-foreground">
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

