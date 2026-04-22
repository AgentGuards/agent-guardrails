"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import type { Policy } from "@/lib/types/anomaly"
import { shortenPubkey, lamportsToSol, spendPercent } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface PolicyCardProps {
  policy: Policy
  dailySpentLamports?: string
}

function statusVariant(policy: Policy): "success" | "warning" | "danger" {
  if (!policy.isActive) return "danger"
  if (policy.anomalyScore >= 50) return "warning"
  return "success"
}

function statusLabel(policy: Policy): string {
  if (!policy.isActive) return "PAUSED"
  if (policy.anomalyScore >= 50) return "WARNING"
  return "ACTIVE"
}

export function PolicyCard({ policy, dailySpentLamports }: PolicyCardProps) {
  const pct = dailySpentLamports
    ? spendPercent(dailySpentLamports, policy.dailyBudgetLamports)
    : null
  const expiryDate = new Date(policy.sessionExpiry)
  const isExpired = expiryDate < new Date()

  return (
    <Link href={`/agents/${policy.pubkey}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={statusVariant(policy)}>{statusLabel(policy)}</Badge>
                <span className="text-sm font-medium truncate">
                  {policy.label ?? shortenPubkey(policy.pubkey)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{shortenPubkey(policy.pubkey)}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </div>

          {pct !== null && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Daily spend</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct >= 90 ? "bg-red-500" : pct >= 66 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Max tx: {lamportsToSol(policy.maxTxLamports).toFixed(1)} SOL</span>
            <span>Budget: {lamportsToSol(policy.dailyBudgetLamports).toFixed(0)} SOL/day</span>
            <span className={cn(isExpired && "text-red-400")}>
              {isExpired ? "EXPIRED" : `Expires ${expiryDate.toLocaleDateString()}`}
            </span>
            <span>Anomaly: {policy.anomalyScore}/100</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
