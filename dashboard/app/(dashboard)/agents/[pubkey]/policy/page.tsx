"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { usePolicy } from "@/lib/hooks/usePolicy"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { shortenPubkey, lamportsToSol } from "@/lib/utils"

export default function EditPolicyPage({ params }: { params: { pubkey: string } }) {
  const { pubkey } = params
  const { data: policy, isLoading } = usePolicy(pubkey)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/agents/${pubkey}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Agent
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Policy</h1>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : policy ? (
        <Card>
          <CardHeader>
            <CardTitle>{policy.label ?? shortenPubkey(policy.pubkey)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Policy editing wizard coming soon. Current values:
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Max tx</dt>
                <dd>{lamportsToSol(policy.maxTxLamports).toFixed(2)} SOL</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Daily budget</dt>
                <dd>{lamportsToSol(policy.dailyBudgetLamports).toFixed(2)} SOL</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Allowed programs</dt>
                <dd>{policy.allowedPrograms.length} programs</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Session expiry</dt>
                <dd>{new Date(policy.sessionExpiry).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground">Policy not found.</p>
      )}
    </div>
  )
}
