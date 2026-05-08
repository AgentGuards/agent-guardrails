'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

function Tag({
  color,
  children,
}: {
  color: 'green' | 'amber' | 'red'
  children: React.ReactNode
}) {
  const styles = {
    green: 'bg-[rgb(var(--primary-rgb)/0.1)] text-primary',
    amber: 'bg-[rgb(var(--accent-rgb)/0.12)] text-accent',
    red: 'bg-[rgb(var(--danger-rgb)/0.12)] text-danger',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-medium ${styles[color]}`}
    >
      {children}
    </span>
  )
}

export default function DefenseBentoSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    const section = sectionRef.current
    if (!section) return

    const tiles = section.querySelectorAll<HTMLElement>('[data-bento-tile]')
    if (tiles.length === 0) return

    gsap.set(tiles, { autoAlpha: 0, y: 32 })

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to(tiles, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.12,
        })
      },
    })

    return () => {
      trigger.kill()
      gsap.killTweensOf(tiles)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="defense"
      className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12"
    >
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          Defense Layers
        </p>
        <h2 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Hard limits on-chain.
          <br />
          AI judgment off-chain.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Four interlocking defense mechanisms ensure no single point of failure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Tile 1 — Program Allow-Listing (wide) */}
        <div
          data-bento-tile
          className="group relative overflow-hidden rounded-3xl border border-border bg-background-mid p-9 transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] lg:col-span-7"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(circle at 30% 70%, rgb(var(--primary-rgb) / 0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(var(--primary-rgb)/0.15)] text-primary">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">
              Program Allow-Listing
            </h3>
            <p className="mt-2 mb-5 text-[15px] leading-7 text-foreground-dim">
              Every CPI target is validated against an on-chain whitelist.
              Unknown or malicious programs are rejected before execution — not
              after.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-[1.8] text-foreground-dim">
              <span className="text-white/30">
                {'//'} On-chain validation
              </span>
              <br />
              <span className="text-primary">&#10003; Jupiter Aggregator</span>
              &ensp;
              <Tag color="green">whitelisted</Tag>
              <br />
              <span className="text-primary">&#10003; Marinade Finance</span>
              &ensp;
              <Tag color="green">whitelisted</Tag>
              <br />
              <span className="text-danger">
                &#10007; Unknown: 7xKX...mQ3d
              </span>
              &ensp;
              <Tag color="red">ProgramNotWhitelisted</Tag>
              <br />
              <span className="text-white/30">
                → Transaction rejected at instruction level
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2 — Spending Budgets */}
        <div
          data-bento-tile
          className="group relative overflow-hidden rounded-3xl border border-border bg-background-mid p-9 transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] lg:col-span-5"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(circle at 70% 30%, rgb(var(--accent-rgb) / 0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(var(--accent-rgb)/0.12)] text-accent">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 6v6l4 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Spending Budgets</h3>
            <p className="mt-2 mb-5 text-[15px] leading-7 text-foreground-dim">
              Two-tier caps enforced on-chain. Per-transaction limits catch
              single large drains. Rolling 24h budgets stop slow bleeds.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-[1.8] text-foreground-dim">
              <span className="text-white/30">
                {'//'} Policy limits
              </span>
              <br />
              per_tx_limit: <span className="text-accent">2.0 SOL</span>
              <br />
              daily_budget: <span className="text-accent">20.0 SOL</span>
              <br />
              <span className="text-white/30">---</span>
              <br />
              spent_today: <span className="text-primary">14.2 SOL</span>
              <br />
              remaining: <span className="text-primary">5.8 SOL</span>
            </div>
          </div>
        </div>

        {/* Tile 3 — AI Kill Switch (narrow) */}
        <div
          data-bento-tile
          className="group relative overflow-hidden rounded-3xl border border-border bg-background-mid p-9 transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] lg:col-span-4"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgb(var(--danger-rgb) / 0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(var(--danger-rgb)/0.12)] text-danger">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">AI Kill Switch</h3>
            <p className="mt-2 mb-5 text-[15px] leading-7 text-foreground-dim">
              Guardian Agent evaluates every flagged transaction. Suspicious
              patterns trigger a{' '}
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">
                pause_agent
              </code>{' '}
              instruction in under 3 seconds.
            </p>
            <div className="flex flex-col gap-2">
              <Tag color="green">ALLOW — 94% of txns</Tag>
              <Tag color="amber">FLAG — review needed</Tag>
              <Tag color="red">PAUSE — frozen on-chain</Tag>
            </div>
          </div>
        </div>

        {/* Tile 4 — Real-Time Monitoring (wide) */}
        <div
          data-bento-tile
          className="group relative overflow-hidden rounded-3xl border border-border bg-background-mid p-9 transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] lg:col-span-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(circle at 60% 40%, rgb(var(--violet-rgb) / 0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(var(--violet-rgb)/0.12)] text-violet">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 9h18M9 3v18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">
              Real-Time Monitoring &amp; Incident Reports
            </h3>
            <p className="mt-2 mb-5 text-[15px] leading-7 text-foreground-dim">
              Live dashboard with SSE streaming, spend gauges, and incident
              timelines. When an agent is paused, Guardian Agent generates a full
              postmortem with root cause analysis and policy recommendations.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-[1.8] text-foreground-dim">
              <span className="text-white/30">
                {'//'} Pipeline: Ingest → Prefilter → Judge → Execute → Report
              </span>
              <br />
              <span className="text-white/30 text-xs">[14:32:01]</span>{' '}
              <span className="text-[#27c93f]">ALLOW</span>&ensp;yield_bot&ensp;Jupiter
              swap&ensp;1.2 SOL
              <br />
              <span className="text-white/30 text-xs">[14:32:14]</span>{' '}
              <span className="text-accent">FLAG</span>&ensp;&ensp;alpha_scan&ensp;Unknown
              pgm&ensp;4.8 SOL
              <br />
              <span className="text-white/30 text-xs">[14:32:15]</span>{' '}
              <span className="text-accent">FLAG</span>&ensp;&ensp;alpha_scan&ensp;Burst
              detected
              <br />
              <span className="text-white/30 text-xs">[14:32:16]</span>{' '}
              <span className="text-danger">PAUSE</span>&ensp;alpha_scan&ensp;
              <span className="text-danger">Frozen on-chain (94% conf)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
