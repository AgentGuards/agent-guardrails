"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Compass,
  Home,
  LayoutPanelLeft,
  LogOut,
  Plus,
  TriangleAlert,
  Users,
} from "lucide-react";
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
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { ShellNavbarActions } from "./shell-navbar-actions";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  nested?: boolean;
};

const navGroups: NavLink[][] = [
  [{ href: "/", label: "Home", icon: Home, nested: false }],
  [
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/incidents", label: "Incidents", icon: TriangleAlert },
  ],
  [{ href: "/agents/new", label: "New agent", icon: Plus, nested: false }],
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

  const currentPath = pathname ?? "";
  const isLinkActive = (href: string, nested: boolean | undefined) => {
    if (href === "/") {
      return currentPath === "/";
    }
    if (href === "/agents") {
      return (
        currentPath === "/agents" ||
        (currentPath.startsWith("/agents/") && !currentPath.startsWith("/agents/new"))
      );
    }
    return currentPath === href || (nested !== false && currentPath.startsWith(`${href}/`));
  };

  const collapsed = sidebarCollapsed;
  const sidebarWidth = collapsed ? "w-[60px]" : "w-60";

  const renderNavItem = (link: NavLink) => {
    const active = isLinkActive(link.href, link.nested);
    const Icon = link.icon;
    const iconSize = collapsed ? 18 : 16;
    return (
      <Link
        key={link.href}
        href={link.href}
        title={collapsed ? link.label : undefined}
        aria-label={link.label}
        aria-current={active ? "page" : undefined}
        onClick={() => setSidebarOpen(false)}
        className={`group relative flex items-center rounded-md text-sm transition-[background,color] duration-150 ${collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-3 py-2"
          } ${active
            ? "bg-white/[0.1] text-zinc-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
            : "text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100"
          }`}
      >
        <Icon size={iconSize} className="shrink-0" strokeWidth={1.7} />
        {!collapsed ? <span className="truncate">{link.label}</span> : null}
      </Link>
    );
  };

  const mainCanvasClass = "flex min-h-0 flex-1 flex-col bg-[#111114] text-foreground";
  const onSignOut = () => {
    useSiwsAuthStore.getState().clearSignedIn();
    void walletAdapter.disconnect().catch(() => {
      /* wallet may already be disconnected */
    });
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-black text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* ── Sidebar (rails-style: deep black, separated from main canvas) ── */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full ${sidebarWidth} flex-col border-r border-white/[0.06] bg-black shadow-2xl transition-[width,transform] duration-300 ease-out md:sticky md:top-0 md:z-0 md:h-screen md:shrink-0 md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand */}
        <div className="px-2.5 pb-3 pt-[1.875rem] md:pt-[2.125rem]">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className={`relative flex items-center transition-colors hover:opacity-90 ${collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-1.5 py-1.5"}`}
          >
            <Image
              src="/logo.png"
              alt="Guardrails logo"
              width={28}
              height={28}
              className={collapsed ? "h-7 w-7" : "h-7 w-7"}
              priority
            />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="font-brand truncate text-[17px] leading-tight tracking-[0.04em] text-zinc-100">
                  Guardrails
                </div>
              </div>
            ) : null}
          </Link>
        </div>

        {/* ── Nav groups ── */}
        <nav className="flex-1 overflow-y-auto px-2.5">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {idx > 0 ? <div className="my-2 border-t border-white/[0.06]" /> : null}
              <div className="flex flex-col gap-0.5">{group.map(renderNavItem)}</div>
            </div>
          ))}
        </nav>

        {/* Footer system-status badge */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className={`${collapsed ? "mb-2 flex flex-col items-center gap-1.5" : "mb-2.5 flex flex-col gap-1.5"}`}>
            <button
              type="button"
              title={collapsed ? "Take a tour" : undefined}
              aria-label="Take a tour"
              onClick={() => {
                setSidebarOpen(false);
                router.push("/");
              }}
              className={`flex items-center rounded-md text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 ${collapsed ? "h-9 w-9 justify-center" : "gap-2.5 px-2.5 py-2 text-sm"
                }`}
            >
              <Compass size={16} className="shrink-0" strokeWidth={1.8} />
              {!collapsed ? <span>Take a tour</span> : null}
            </button>
            <button
              type="button"
              title={collapsed ? "Sign out" : undefined}
              aria-label="Sign out"
              onClick={onSignOut}
              className={`flex items-center rounded-md text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 ${collapsed ? "h-9 w-9 justify-center" : "gap-2.5 px-2.5 py-2 text-sm"
                }`}
            >
              <LogOut size={16} className="shrink-0" strokeWidth={1.8} />
              {!collapsed ? <span>Sign out</span> : null}
            </button>
          </div>
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />
          </div>
        </div>
      </aside>

      {/* ── Main: black top inset (sidebar chroma), then canvas for header + body ── */}
      <main className="flex min-w-0 flex-1 flex-col bg-black">
        <div className="h-4 w-full shrink-0 bg-black md:h-5" aria-hidden />
        <div className={mainCanvasClass}>
          <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#111114] px-5 pb-4 pt-3.5 md:gap-4 md:px-7 md:pb-5 md:pt-4">
            {/* Sidebar toggle (desktop = collapse, mobile = open) */}
            <button
              type="button"
              aria-label="Toggle sidebar"
              className="-ml-2 hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:inline-flex"
              onClick={toggleSidebarCollapsed}
            >
              <LayoutPanelLeft size={18} className="shrink-0" strokeWidth={1.7} />
            </button>
            <button
              type="button"
              aria-label="Open menu"
              className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:hidden"
              onClick={toggleSidebar}
            >
              <LayoutPanelLeft size={18} className="shrink-0" strokeWidth={1.7} />
            </button>

            <div className="min-w-0 flex-1">
              {/* <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Agent Guardrails</p> */}
              <h1 className=" truncate text-[1rem] font-semibold leading-tight tracking-[-0.02em] text-zinc-50 md:text-[1.5rem]">
                {title}
              </h1>
            </div>

            <div className="flex shrink-0 items-center md:ml-auto">
              <ShellNavbarActions />
            </div>
          </header>

          <div className="flex-1 px-5 pb-8 md:px-7 md:pb-10">
            {subtitle || actions ? (
              <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                {subtitle ? (
                  <p className="max-w-2xl text-[13px] leading-relaxed text-zinc-400">{subtitle}</p>
                ) : (
                  <span />
                )}
                <div className="flex shrink-0 items-center gap-2">{actions}</div>
              </header>
            ) : null}
            <div className="animate-[fade-in-up_220ms_ease-out]">{children}</div>
          </div>
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

