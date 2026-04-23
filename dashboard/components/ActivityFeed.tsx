"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { TxnRow } from "./TxnRow"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useActivityStore } from "@/lib/stores/activity"
import { Activity } from "lucide-react"
import { EmptyState } from "./EmptyState"

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

function filterActiveStyle(opt: FilterValue): React.CSSProperties {
  if (opt === "allow") return { background: 'var(--green-dim)', color: 'var(--badge-green-text)' }
  if (opt === "flag") return { background: 'var(--amber-dim)', color: 'var(--badge-amber-text)' }
  if (opt === "pause") return { background: 'var(--red-dim)', color: 'var(--badge-red-text)' }
  return { background: 'var(--accent-dim)', color: 'var(--badge-blue-text)' }
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
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: '10px', alignItems: 'center',
        padding: '10px 14px', background: 'var(--bg-1)',
        border: '1px solid var(--border-col)', borderRadius: '8px',
        marginBottom: '14px',
      }}>
        <span style={{ fontSize: '11.5px', color: 'var(--text-mute)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Filter</span>

        <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border-2-col)', borderRadius: '6px', overflow: 'hidden' }}>
          {FILTER_OPTIONS.map((opt, i) => {
            const isActive = verdictFilter === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setVerdictFilter(opt.value)}
                style={{
                  padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
                  color: isActive ? undefined : 'var(--text-dim)',
                  background: 'transparent',
                  borderRight: i < FILTER_OPTIONS.length - 1 ? '1px solid var(--border-2-col)' : 'none',
                  border: 'none',
                  borderRightStyle: i < FILTER_OPTIONS.length - 1 ? 'solid' : undefined,
                  borderRightWidth: i < FILTER_OPTIONS.length - 1 ? '1px' : undefined,
                  borderRightColor: i < FILTER_OPTIONS.length - 1 ? 'var(--border-2-col)' : undefined,
                  fontFamily: 'ui-monospace, monospace',
                  transition: 'background 0.15s, color 0.15s',
                  ...(isActive ? filterActiveStyle(opt.value) : {}),
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {USE_MOCK ? (
            <span style={{ fontSize: '11.5px', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
              Mock
            </span>
          ) : (
            <span style={{ fontSize: '11.5px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="live-dot" />
              Live
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-mute)', fontFamily: 'ui-monospace, monospace' }}>
            {filtered.length} txns
          </span>
        </div>
      </div>

      {/* Feed content */}
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-col)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{ padding: '0' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-col)' }}>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
        {isError && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-mute)', fontSize: '14px' }}>
            Failed to load transactions.
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{ padding: '32px 16px' }}>
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
      </div>
    </div>
  )
}
