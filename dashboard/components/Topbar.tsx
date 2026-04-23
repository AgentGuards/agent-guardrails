"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

const ROUTE_LABELS: Record<string, string> = {
  agents: "Agents",
  activity: "Activity",
  incidents: "Incidents",
  new: "New Agent",
  policy: "Edit Policy",
  signin: "Sign In",
}

export function Topbar() {
  const pathname = usePathname()
  if (!pathname) return null

  const segments = pathname.split("/").filter(Boolean)

  return (
    <header style={{
      height: '56px', display: 'flex', alignItems: 'center',
      padding: '0 28px', borderBottom: '1px solid var(--border-col)',
      background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5,
      backdropFilter: 'blur(6px)',
    }}>
      {/* Breadcrumbs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>
        <Link href="/" style={{ color: 'var(--text-mute)', textDecoration: 'none' }}>Home</Link>
        {segments.map((seg, i) => {
          const href = '/' + segments.slice(0, i + 1).join('/')
          const isLast = i === segments.length - 1
          const label = ROUTE_LABELS[seg] ?? (seg.length > 12 ? seg.slice(0, 4) + '…' + seg.slice(-4) : seg)
          return (
            <span key={href} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-mute)' }}>/</span>
              {isLast ? (
                <span style={{ color: 'var(--text)' }}>{label}</span>
              ) : (
                <Link href={href} style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>{label}</Link>
              )}
            </span>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Network pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        padding: '5px 10px', borderRadius: '999px',
        background: 'var(--bg-2)', border: '1px solid var(--border-col)',
        fontSize: '11.5px', color: 'var(--text-dim)',
      }}>
        <div className="net-pulse" style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--green)',
        }} />
        Devnet
      </div>
    </header>
  )
}
