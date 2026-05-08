import Link from "next/link";
import {
  effectiveVerdict,
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  policyLabel,
  programLabel,
  shortAddress,
  verdictTone,
} from "@/lib/utils";
import type { TransactionSummary } from "@/lib/types/dashboard";

function verdictBadgeClass(tone: "green" | "amber" | "red" | "slate"): string {
  if (tone === "red") return "bg-red-500/15 text-red-400 border border-red-500/30";
  if (tone === "amber") return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  return "bg-teal-500/15 text-teal-400 border border-teal-500/30";
}

function severityStripClass(tone: "green" | "amber" | "red" | "slate"): string {
  if (tone === "red") return "bg-red-500";
  if (tone === "amber") return "bg-amber-500";
  if (tone === "green") return "bg-teal-500";
  return "bg-zinc-700";
}

const MAX_VISIBLE_SIGNALS = 2;

export function TransactionRow({
  transaction,
  showAgent = false,
}: {
  transaction: TransactionSummary;
  showAgent?: boolean;
}) {
  const verdict = effectiveVerdict(transaction.verdict?.verdict);
  const tone = verdictTone(verdict);
  const signals = transaction.verdict?.signals ?? [];
  const visibleSignals = signals.slice(0, MAX_VISIBLE_SIGNALS);
  const overflowCount = signals.length - MAX_VISIBLE_SIGNALS;

  return (
    <Link
      href={`/transactions/${encodeURIComponent(transaction.txnSig)}`}
      className="flex items-stretch rounded-md border border-[#1e1e22] bg-transparent transition-all duration-150 hover:border-zinc-600 hover:bg-white/[0.03]"
    >
      {/* Left-edge severity strip */}
      <div className={`w-[3px] flex-shrink-0 rounded-l-md ${severityStripClass(tone)}`} />

      <div className="flex min-w-0 flex-1 items-center gap-3 p-3.5">
        {/* Verdict badge */}
        <span className={`inline-flex w-14 flex-shrink-0 items-center justify-center rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider ${verdictBadgeClass(tone)}`}>
          {verdict.toUpperCase()}
        </span>

        {/* Confidence pill */}
        {transaction.verdict?.confidence != null && (
          <span className="flex-shrink-0 font-mono text-[10px] text-zinc-500">
            {transaction.verdict.confidence}%
          </span>
        )}

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-zinc-200">
              {programLabel(transaction.targetProgram)}
            </span>
            <span className="font-mono text-[12px] font-semibold text-zinc-100">
              {transaction.amountLamports ? `${formatSol(transaction.amountLamports)} SOL` : "—"}
            </span>
          </div>
          {transaction.verdict?.reasoning && (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">
              {transaction.verdict.reasoning}
            </p>
          )}
          {visibleSignals.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {visibleSignals.map((sig) => (
                <span
                  key={sig}
                  className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 border border-zinc-700/30"
                >
                  {sig}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-[9px] text-zinc-600">+{overflowCount}</span>
              )}
            </div>
          )}
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-[10px] text-zinc-600">
              {shortAddress(transaction.txnSig, 8, 4)}
            </span>
            {showAgent && (
              <span className="text-[10px] text-zinc-500">{policyLabel(transaction.policyPubkey)}</span>
            )}
            <span
              className="ml-auto font-mono text-[10px] text-zinc-600"
              title={formatRelativeTooltip(transaction.blockTime)}
            >
              {formatRelativeTime(transaction.blockTime)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
