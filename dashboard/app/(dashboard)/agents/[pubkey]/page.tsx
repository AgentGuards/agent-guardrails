"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SpendGauge } from "@/components/SpendGauge"
import { KillSwitchButton } from "@/components/KillSwitchButton"
import { ActivityFeed } from "@/components/ActivityFeed"
import { PubkeyDisplay } from "@/components/PubkeyDisplay"
import { usePolicy } from "@/lib/hooks/usePolicy"
import { useSpendTracker } from "@/lib/hooks/useSpendTracker"
import { lamportsToSol, shortenPubkey } from "@/lib/utils"
import { Settings } from "lucide-react"

// Program address → human label map (covers all programs used in mock data)
const PROGRAM_LABELS: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  MrNEdFKsp4MSGPoQwnZqSxUYEbBYaxQGTdCSg1vmDVJ: "Marinade Finance",
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "Unknown (DezX...B263)",
}

export default function AgentDetailPage({ params }: { params: { pubkey: string } }) {
  const { pubkey } = params
  const { data: policy, isLoading: policyLoading } = usePolicy(pubkey)
  const { data: tracker } = useSpendTracker(pubkey)

  if (policyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="col-span-2 h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!policy) {
    return <div className="text-muted-foreground">Policy not found.</div>
  }

  const statusVariant = !policy.isActive ? "danger" : policy.anomalyScore >= 50 ? "warning" : "success"
  const statusLabel = !policy.isActive ? "PAUSED" : policy.anomalyScore >= 50 ? "WARNING" : "ACTIVE"
  const expiryDate = new Date(policy.sessionExpiry)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{policy.label ?? shortenPubkey(policy.pubkey)}</h1>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agents/${pubkey}/policy`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" /> Edit Policy
            </Button>
          </Link>
          <KillSwitchButton policy={policy} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SpendGauge */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Daily Spend</CardTitle></CardHeader>
          <CardContent>
            {tracker ? (
              <SpendGauge
                dailySpentLamports={tracker.lamportsSpent24h}
                dailyBudgetLamports={policy.dailyBudgetLamports}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>

        {/* Policy details */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Policy Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Max per transaction</p>
                <p className="font-medium">{lamportsToSol(policy.maxTxLamports).toFixed(2)} SOL</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Daily budget</p>
                <p className="font-medium">{lamportsToSol(policy.dailyBudgetLamports).toFixed(2)} SOL</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Session expires</p>
                <p className={`font-medium ${expiryDate < new Date() ? "text-red-400" : ""}`}>
                  {expiryDate.toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Anomaly score</p>
                <p className="font-medium">{policy.anomalyScore}/100</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Owner</p>
                <PubkeyDisplay pubkey={policy.owner} />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Agent wallet</p>
                <PubkeyDisplay pubkey={policy.agent} />
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs mb-2">Allowed programs ({policy.allowedPrograms.length})</p>
              <div className="flex flex-wrap gap-1">
                {policy.allowedPrograms.map((prog) => (
                  <span key={prog} className="text-xs bg-secondary px-2 py-0.5 rounded font-mono">
                    {PROGRAM_LABELS[prog] ?? shortenPubkey(prog)}
                  </span>
                ))}
              </div>
            </div>
            {policy.squadsMultisig && (
              <div>
                <p className="text-muted-foreground text-xs">Squads multisig</p>
                <PubkeyDisplay pubkey={policy.squadsMultisig} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed scoped to this agent */}
      <ActivityFeed policyPubkey={pubkey} />
    </div>
  )
}
