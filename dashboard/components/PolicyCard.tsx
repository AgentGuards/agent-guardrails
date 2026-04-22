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

function getStatusLabel(policy: Policy): string {
  if (!policy.isActive) return "PAUSED"
  if (policy.anomalyScore >= 50) return "WARNING"
  return "ACTIVE"
}

function cardBorderClass(policy: Policy): string {
  if (!policy.isActive) return "border-red-500/20"
  if (policy.anomalyScore >= 50) return "border-amber-500/20"
  return ""
}

export function PolicyCard({ policy, dailySpentLamports }: PolicyCardProps) {
  const pct = dailySpentLamports
    ? spendPercent(dailySpentLamports, policy.dailyBudgetLamports)
    : null
  const expiryDate = new Date(policy.sessionExpiry)
  const isExpired = expiryDate < new Date()
  const label = getStatusLabel(policy)
  const variant = statusVariant(policy)

  return (
    <Link href={`/agents/${policy.pubkey}`}>
      <Card className={cn(
        "group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 hover:border-primary/40 cursor-pointer",
        cardBorderClass(policy)
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={variant}>
                  {label === "ACTIVE" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="live-dot" />
                      {label}
                    </span>
                  ) : label}
                </Badge>
                <span className="text-sm font-medium truncate">
                  {policy.label ?? shortenPubkey(policy.pubkey)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{shortenPubkey(policy.pubkey)}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-1 transition-transform duration-200" />
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
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    pct >= 90 ? "bg-red-500" : pct >= 66 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <dt className="uppercase tracking-wider text-[10px] mb-0.5">Max tx</dt>
              <dd className="text-sm font-medium font-mono">{lamportsToSol(policy.maxTxLamports).toFixed(1)} SOL</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-[10px] mb-0.5">Budget</dt>
              <dd className="text-sm font-medium font-mono">{lamportsToSol(policy.dailyBudgetLamports).toFixed(0)} SOL/day</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-[10px] mb-0.5">Session</dt>
              <dd className={cn("text-sm font-medium", isExpired && "text-red-400")}>
                {isExpired ? "EXPIRED" : expiryDate.toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-[10px] mb-0.5">Anomaly</dt>
              <dd className="text-sm font-medium font-mono">{policy.anomalyScore}/100</dd>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
