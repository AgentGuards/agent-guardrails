"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TxnRow } from "./TxnRow"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useActivityStore } from "@/lib/stores/activity"
import { Activity } from "lucide-react"
import { EmptyState } from "./EmptyState"

interface ActivityFeedProps {
  policyPubkey?: string
}

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "allow", label: "Allow" },
  { value: "flag", label: "Flag" },
  { value: "pause", label: "Pause" },
] as const

export function ActivityFeed({ policyPubkey }: ActivityFeedProps) {
  const { verdictFilter, setVerdictFilter } = useActivityStore()
  const { data: txns, isLoading, isError } = useTransactions(policyPubkey)

  const filtered = (txns ?? [])
    .filter((txn) => {
      if (verdictFilter === "all") return true
      return txn.verdict?.verdict === verdictFilter
    })
    .slice(0, 200)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Activity</h3>
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVerdictFilter(opt.value)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  verdictFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
        {isError && (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            Failed to load transactions.
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="px-4 py-8">
            <EmptyState
              icon={Activity}
              title="No transactions"
              description={verdictFilter !== "all" ? `No ${verdictFilter} transactions found.` : "No transactions yet."}
            />
          </div>
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div>
            {filtered.map((txn) => <TxnRow key={txn.id} txn={txn} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
