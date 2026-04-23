"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, Activity, AlertTriangle } from "lucide-react"
import { useSiws } from "@/lib/providers/SiwsContext"
import { shortenPubkey } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
]

export function Sidebar() {
  const { walletPubkey, isAuthenticated, signOut } = useSiws()
  const pathname = usePathname()

  return (
    <aside style={{
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--border-col)',
      padding: '22px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 10px 22px' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          boxShadow: '0 0 14px rgba(59,130,246,0.35)',
          position: 'relative', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', inset: '5px',
            border: '1.5px solid rgba(255,255,255,0.9)',
            borderRadius: '3px',
          }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em', color: 'var(--text)' }}>Agent Guardrails</div>
          <div style={{ fontSize: '10px', color: 'var(--text-mute)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>GUARDRAILS</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <div style={{ fontSize: '10.5px', color: 'var(--text-mute)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px 6px', marginTop: '12px' }}>
          Navigation
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 10px', borderRadius: '6px',
              color: active ? 'var(--text)' : 'var(--text-dim)',
              fontSize: '13px', textDecoration: 'none',
              background: active ? 'var(--accent-dim)' : 'transparent',
              boxShadow: active ? 'inset 0 0 0 1px rgba(59,130,246,0.3)' : 'none',
              transition: 'background 0.15s, color 0.15s',
            }}>
              <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />}
            </Link>
          )
        })}
      </div>

      {/* Wallet footer */}
      {isAuthenticated && walletPubkey && (
        <div style={{ borderTop: '1px solid var(--border-col)', paddingTop: '12px' }}>
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '8px',
              background: 'var(--bg-2)', width: '100%',
              border: '1px solid var(--border-col)',
              cursor: 'pointer', color: 'var(--text-dim)',
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
              flexShrink: 0,
            }} />
            <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-mute)' }}>Connected</div>
              <div style={{ fontSize: '12px', fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shortenPubkey(walletPubkey)}
              </div>
            </div>
          </button>
        </div>
      )}
    </aside>
  )
}
