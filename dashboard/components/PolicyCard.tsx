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

function progressColor(pct: number): string {
  if (pct >= 90) return 'var(--red)'
  if (pct >= 66) return 'var(--amber)'
  return 'var(--green)'
}

function cardBorderStyle(policy: Policy): React.CSSProperties {
  if (!policy.isActive) return { borderColor: 'rgba(239,68,68,0.2)' }
  if (policy.anomalyScore >= 50) return { borderColor: 'rgba(245,158,11,0.2)' }
  return {}
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
    <Link href={`/agents/${policy.pubkey}`} style={{ textDecoration: 'none' }}>
      <div
        className="group"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-col)',
          borderRadius: '10px',
          padding: '18px',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
          ...cardBorderStyle(policy),
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.25), 0 0 24px rgba(59,130,246,0.08)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
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
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {policy.label ?? shortenPubkey(policy.pubkey)}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-mute)', fontFamily: 'ui-monospace, monospace' }}>
              {shortenPubkey(policy.pubkey)}
            </p>
          </div>
          <ChevronRight style={{ width: '16px', height: '16px', color: 'var(--text-mute)', flexShrink: 0, marginTop: '2px', transition: 'transform 0.2s' }}
            className="group-hover:translate-x-1"
          />
        </div>

        {pct !== null && (
          <div className="mb-3">
            <div className="flex justify-between mb-1" style={{ fontSize: '11.5px', color: 'var(--text-mute)' }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily spend</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{pct.toFixed(0)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  width: `${Math.min(pct, 100)}%`,
                  background: progressColor(pct),
                  transition: 'width 0.7s ease-out',
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <dt style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: '2px' }}>Max tx</dt>
            <dd style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'ui-monospace, monospace', color: 'var(--text)' }}>{lamportsToSol(policy.maxTxLamports).toFixed(1)} SOL</dd>
          </div>
          <div>
            <dt style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: '2px' }}>Budget</dt>
            <dd style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'ui-monospace, monospace', color: 'var(--text)' }}>{lamportsToSol(policy.dailyBudgetLamports).toFixed(0)} SOL/day</dd>
          </div>
          <div>
            <dt style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: '2px' }}>Session</dt>
            <dd style={{ fontSize: '13px', fontWeight: 500, color: isExpired ? 'var(--red)' : 'var(--text)' }}>
              {isExpired ? "EXPIRED" : expiryDate.toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: '2px' }}>Anomaly</dt>
            <dd style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'ui-monospace, monospace', color: 'var(--text)' }}>{policy.anomalyScore}/100</dd>
          </div>
        </div>
      </div>
    </Link>
  )
}
