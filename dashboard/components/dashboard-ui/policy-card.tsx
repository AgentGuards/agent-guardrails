import Link from "next/link";
import {
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  lamportsToSol,
  programLabel,
  shortAddress,
} from "@/lib/utils";
import type { PolicySummary } from "@/lib/types/dashboard";

export function PolicyCard({ policy }: { policy: PolicySummary }) {
  const MAX_VISIBLE = 3;
  const visiblePrograms = policy.allowedPrograms.slice(0, MAX_VISIBLE);
  const overflow = policy.allowedPrograms.length - MAX_VISIBLE;
  const spent = lamportsToSol(policy.dailySpentLamports ?? "0");
  const budget = lamportsToSol(policy.dailyBudgetLamports);
  const spendPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const progressTone = spendPct >= 90 ? "bg-crimson-500" : spendPct >= 66 ? "bg-amber-500" : "bg-teal-500";
  const sessionExpired = new Date(policy.sessionExpiry).getTime() < Date.now();

  return (
    <Link
      href={`/agents/${policy.pubkey}`}
      className="cursor-pointer rounded-lg border border-zinc-800 p-4 transition-all duration-100 hover:border-zinc-600 hover:bg-zinc-800/30"
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
            <span className="rounded border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] text-amber-400">
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
            {formatSol(policy.dailySpentLamports ?? "0")}{" "}
            <span className="text-muted-foreground">/ {formatSol(policy.dailyBudgetLamports)}</span>
          </span>
        </div>
        <div className="h-1.5 rounded bg-muted">
          <div className={`h-full rounded ${progressTone}`} style={{ width: `${spendPct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-border pt-3">
        <div>
          <div className="mb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Session</div>
          <div className="font-mono text-xs text-foreground" title={formatRelativeTooltip(policy.sessionExpiry)}>
            {formatRelativeTime(policy.sessionExpiry)}
          </div>
        </div>
        <div>
          <div className="mb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Per tx cap</div>
          <div className="font-mono text-xs text-foreground">{formatSol(policy.maxTxLamports)}</div>
        </div>
      </div>

      <p className="mt-3 truncate text-xs text-zinc-500">
        Programs: {visiblePrograms.map((p) => programLabel(p)).join(", ")}
        {overflow > 0 && <span className="text-zinc-600"> +{overflow} more</span>}
      </p>
    </Link>
  );
}
