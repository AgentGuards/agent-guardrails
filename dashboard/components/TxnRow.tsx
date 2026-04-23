"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, AlertTriangle, OctagonX, Clock } from "lucide-react"
import type { GuardedTxnWithVerdict } from "@/lib/types/anomaly"
import { lamportsToSol, formatTimeAgo, shortenPubkey } from "@/lib/utils"
import { cn } from "@/lib/utils"

// Program address → human label map (from lib/mock/policies.ts PROGRAM_LABELS + DezX)
const PROGRAM_LABELS: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  MrNEdFKsp4MSGPoQwnZqSxUYEbBYaxQGTdCSg1vmDVJ: "Marinade Finance",
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "Unknown (DezX...B263)",
}

function verdictVariant(verdict: string | undefined): "success" | "warning" | "danger" | "muted" {
  if (!verdict) return "muted"
  if (verdict === "allow") return "success"
  if (verdict === "flag") return "warning"
  if (verdict === "pause") return "danger"
  return "muted"
}

function verdictLabel(verdict: string | undefined): string {
  if (!verdict) return "PENDING"
  return verdict.toUpperCase()
}

function VerdictIcon({ verdict }: { verdict: string | undefined }) {
  const cls = "h-3 w-3 mr-1 shrink-0"
  if (!verdict) return <Clock className={cls} />
  if (verdict === "allow") return <CheckCircle2 className={cls} />
  if (verdict === "flag") return <AlertTriangle className={cls} />
  if (verdict === "pause") return <OctagonX className={cls} />
  return <Clock className={cls} />
}

export function TxnRow({ txn }: { txn: GuardedTxnWithVerdict }) {
  const [expanded, setExpanded] = useState(false)
  const programName = PROGRAM_LABELS[txn.targetProgram] ?? shortenPubkey(txn.targetProgram)
  const amountSol = txn.amountLamports ? lamportsToSol(txn.amountLamports).toFixed(3) : null

  return (
    <div
      className="txn-row-enter cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid var(--border-col)' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Badge variant={verdictVariant(txn.verdict?.verdict)} className="w-24 justify-center shrink-0 text-xs flex items-center">
          <VerdictIcon verdict={txn.verdict?.verdict} />
          {verdictLabel(txn.verdict?.verdict)}
        </Badge>
        <span className="flex-1 text-sm truncate">{programName}</span>
        {amountSol && (
          <span className="text-sm text-muted-foreground shrink-0 font-mono">{amountSol} SOL</span>
        )}
        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
          {formatTimeAgo(txn.blockTime)}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-3 space-y-1.5 text-sm" style={{ background: 'var(--bg-2)' }}>
              {txn.verdict ? (
                <>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Verdict:</span>
                    <span className="font-medium">{txn.verdict.verdict.toUpperCase()} (confidence: {txn.verdict.confidence}%)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">Reasoning:</span>
                    <div className="bg-muted/40 border-l-2 border-border rounded-r px-3 py-2 italic text-sm flex-1">
                      "{txn.verdict.reasoning}"
                    </div>
                  </div>
                  {txn.verdict.prefilterSkipped ? (
                    <div><span className="text-muted-foreground">Prefilter:</span> Routine (skipped LLM)</div>
                  ) : (
                    <div className="flex gap-4">
                      <span><span className="text-muted-foreground">Model:</span> {txn.verdict.model}</span>
                      {txn.verdict.latencyMs && (
                        <span><span className="text-muted-foreground">Latency:</span> {txn.verdict.latencyMs.toLocaleString()}ms</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Verdict pending...</span>
              )}
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Txn:</span>
                <span className="font-mono text-xs">{shortenPubkey(txn.txnSig)}</span>
                <a
                  href={`https://explorer.solana.com/tx/${txn.txnSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
              {txn.rejectReason && (
                <div className="text-red-400 text-xs">Reject reason: {txn.rejectReason}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
