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

function anomalyColor(score: number): string {
  if (score > 60) return "text-red-400";
  if (score > 30) return "text-amber-400";
  return "text-teal-400";
}

export function PolicyCard({ policy }: { policy: PolicySummary }) {
  const MAX_VISIBLE = 2;
  const visiblePrograms = policy.allowedPrograms.slice(0, MAX_VISIBLE);
  const overflow = policy.allowedPrograms.length - MAX_VISIBLE;
  const spent = lamportsToSol(policy.dailySpentLamports ?? "0");
  const budget = lamportsToSol(policy.dailyBudgetLamports);
  const spendPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const progressTone = spendPct >= 90 ? "bg-red-500" : spendPct >= 66 ? "bg-amber-500" : "bg-teal-500";
  const sessionExpired = new Date(policy.sessionExpiry).getTime() < Date.now();
  const isPaused = !policy.isActive;

  return (
    <Link
      href={`/agents/${policy.pubkey}`}
      className={`block rounded-xl border p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,255,209,0.06)] ${
        isPaused
          ? "border-amber-500/15 bg-[#111113] hover:border-amber-500/25"
          : "border-[#1e1e22] bg-[#111113] hover:border-zinc-600"
      }`}
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
    >
      {/* ── Header: Name + Badges ── */}
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[15px] font-semibold tracking-tight ${policy.label ? "text-zinc-100" : "italic text-zinc-500"}`}>
            {policy.label ?? "Unlabeled agent"}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
            {shortAddress(policy.pubkey, 6, 4)}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
          {policy.squadsMultisig && (
            <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
              Squads
            </span>
          )}
          {isPaused ? (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Paused
            </span>
          ) : sessionExpired ? (
            <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Expired
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
              {/* Pulsing dot */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              Active
            </span>
          )}
        </div>
      </div>

      {/* ── Spend Progress ── */}
      <div className="mb-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            Daily spend
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-200">{formatSol(policy.dailySpentLamports ?? "0")}</span>
            {" / "}
            {formatSol(policy.dailyBudgetLamports)} SOL
          </span>
        </div>
        <div className="h-[5px] rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressTone}`}
            style={{ width: `${spendPct}%` }}
          />
        </div>
      </div>

      {/* ── Metrics Grid (3-column) ── */}
      <div className="grid grid-cols-3 gap-3 border-t border-dashed border-white/[0.06] pt-3">
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Session</div>
          <div
            className={`font-mono text-[12px] ${sessionExpired ? "text-amber-400" : "text-zinc-300"}`}
            title={formatRelativeTooltip(policy.sessionExpiry)}
          >
            {sessionExpired ? "expired" : formatRelativeTime(policy.sessionExpiry)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Per-Tx Cap</div>
          <div className="font-mono text-[12px] text-zinc-300">{formatSol(policy.maxTxLamports)} SOL</div>
        </div>
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Anomaly</div>
          <div className={`font-mono text-[12px] ${anomalyColor(policy.anomalyScore)}`}>
            {policy.anomalyScore} / 100
          </div>
        </div>
      </div>

      {/* ── Program Tags ── */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-dashed border-white/[0.06] pt-3">
        {visiblePrograms.map((p) => (
          <span key={p} className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">
            {programLabel(p)}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-zinc-600">+{overflow} more</span>
        )}
      </div>
    </Link>
  );
}
