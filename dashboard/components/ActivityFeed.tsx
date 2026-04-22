"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { TxnRow } from "./TxnRow"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useActivityStore } from "@/lib/stores/activity"
import { Activity } from "lucide-react"
import { EmptyState } from "./EmptyState"
import { cn } from "@/lib/utils"

interface ActivityFeedProps {
  policyPubkey?: string
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "allow", label: "Allow" },
  { value: "flag", label: "Flag" },
  { value: "pause", label: "Pause" },
] as const

type FilterValue = typeof FILTER_OPTIONS[number]["value"]

function filterButtonClass(opt: FilterValue, active: FilterValue): string {
  const isActive = opt === active
  if (isActive) {
    if (opt === "all") return "bg-primary text-primary-foreground"
    if (opt === "allow") return "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
    if (opt === "flag") return "bg-amber-600/30 text-amber-300 border border-amber-500/40"
    if (opt === "pause") return "bg-red-600/30 text-red-300 border border-red-500/40"
  }
  // inactive
  if (opt === "allow") return "text-muted-foreground hover:text-emerald-400"
  if (opt === "flag") return "text-muted-foreground hover:text-amber-400"
  if (opt === "pause") return "text-muted-foreground hover:text-red-400"
  return "text-muted-foreground hover:bg-accent"
}

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
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Activity</h3>
            {filtered.length > 0 && (
              <span className="text-xs text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded">
                {filtered.length}
              </span>
            )}
            {USE_MOCK ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 ml-1">
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                Mock
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 ml-1">
                <span className="live-dot" />
                Live
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVerdictFilter(opt.value)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  filterButtonClass(opt.value, verdictFilter)
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <Separator />
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
