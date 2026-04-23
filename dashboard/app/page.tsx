import { Shield, Gauge, Zap } from "lucide-react"
import { LandingCTA } from "@/components/LandingCTA"

const FEATURES = [
  {
    icon: Shield,
    title: "Allow-lists",
    desc: "Restrict which programs an agent can interact with",
  },
  {
    icon: Gauge,
    title: "Spend limits",
    desc: "Daily budget caps with automatic enforcement",
  },
  {
    icon: Zap,
    title: "Kill switches",
    desc: "Real-time pause any agent with one click",
  },
]

const HERO_STATS = [
  { value: "3", label: "Active Agents" },
  { value: "1", label: "Incident Caught" },
  { value: "$0", label: "Lost" },
]

export default function LandingPage() {
  return (
    <div className="hero-grid-bg relative min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
      <div className="relative z-10 max-w-2xl text-center space-y-8">
        {/* Eyebrow pill */}
        <div className="flex justify-center animate-fade-up" style={{ animationDelay: "0ms" }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '5px 14px', borderRadius: '999px',
            background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)',
            fontSize: '12px', color: 'var(--badge-blue-text)',
            fontFamily: 'ui-monospace, monospace',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            On-chain AI Safety
          </span>
        </div>

        {/* Logo + title */}
        <div className="flex items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            boxShadow: '0 0 28px rgba(59,130,246,0.4)',
            position: 'relative', flexShrink: 0, display: 'inline-flex',
          }}>
            <div style={{
              position: 'absolute', inset: '10px',
              border: '2px solid rgba(255,255,255,0.9)',
              borderRadius: '4px',
            }} />
          </div>
          <h1 style={{ fontSize: '54px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' }}>
            Agent{' '}
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Guardrails
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="text-xl animate-fade-up"
          style={{ animationDelay: "120ms", color: 'var(--text-dim)' }}
        >
          On-chain policy layer for AI agents on Solana. Enforce allow-lists, spending budgets, and real-time kill switches.
        </p>

        {/* Hero stats */}
        <div
          className="grid grid-cols-3 gap-4 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          {HERO_STATS.map(({ value, label }) => (
            <div key={label} style={{
              background: 'var(--bg-1)', border: '1px solid var(--border-col)',
              borderRadius: '10px', padding: '16px',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-mute)', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-4 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <LandingCTA />
        </div>

        {/* Feature cards */}
        <div
          className="grid grid-cols-3 gap-4 mt-8 text-left animate-fade-up"
          style={{ animationDelay: "260ms" }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: 'var(--bg-1)', border: '1px solid var(--border-col)',
                borderRadius: '10px', padding: '18px',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              className="hover:border-blue-500/30 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_0_20px_rgba(59,130,246,0.06)] cursor-default"
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px',
              }}>
                <Icon style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '6px' }}>{title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
