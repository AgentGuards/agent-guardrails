import Link from "next/link";
import {
  effectiveVerdict,
  formatDateTime,
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  policyLabel,
  programLabel,
  shortAddress,
  verdictTone,
} from "@/lib/utils";
import type { TransactionSummary } from "@/lib/types/dashboard";
import { StatusChip } from "./status-chip";

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
    <Link
      href={`/transactions/${encodeURIComponent(transaction.txnSig)}`}
      className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-100 hover:border-zinc-600 hover:bg-zinc-800/30"
    >
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
            {transaction.amountLamports ? formatSol(transaction.amountLamports) : "—"}
          </div>
          <div className="text-sm text-muted-foreground" title={formatRelativeTooltip(transaction.blockTime)}>
            {formatRelativeTime(transaction.blockTime)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 text-sm text-muted-foreground">
        <span className="min-w-0 break-all font-mono text-xs text-muted-foreground sm:text-sm">{shortAddress(transaction.txnSig, 10, 8)}</span>
        <span className="shrink-0 whitespace-nowrap">{formatDateTime(transaction.blockTime)}</span>
      </div>
    </Link>
  );
}
