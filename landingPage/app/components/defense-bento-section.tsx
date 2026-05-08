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

function ProgramAllowListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M12 3.25 19 6.5v5.15c0 4.58-2.86 8.4-7 9.6-4.14-1.2-7-5.02-7-9.6V6.5l7-3.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 10.25h5.5M9 13h3.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="m14.25 15.25 1.25 1.25 2.35-2.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SpendingBudgetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M5.5 8.25h13A2.5 2.5 0 0 1 21 10.75v6A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5V7.75A2.75 2.75 0 0 1 5.75 5h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.25 12.25h4.25v3h-4.25a1.5 1.5 0 0 1 0-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 10.5v4.25M11.25 9v5.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function KillSwitchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="m9 3.5 6 .01 4.25 4.24v6L15 18H9l-4.25-4.25v-6L9 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 9.25v3.5M14.75 9.25v3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 21h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MonitoringReportsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M5.75 4h9.5L19 7.75v11A2.25 2.25 0 0 1 16.75 21h-11A2.25 2.25 0 0 1 3.5 18.75V6.25A2.25 2.25 0 0 1 5.75 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15 4v4h4M7 15.25h2.15l1.25-3.5 1.7 5 1.2-2.5H17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 9.25h4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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
              <ProgramAllowListIcon />
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
              <SpendingBudgetIcon />
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
              <KillSwitchIcon />
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
              <MonitoringReportsIcon />
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
