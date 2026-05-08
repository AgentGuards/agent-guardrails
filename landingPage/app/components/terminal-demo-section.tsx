'use client'

import { useEffect, useRef, useState } from 'react'

type TerminalLine = {
  time: string
  type: 'ok' | 'warn' | 'err' | 'dim'
  text: string
}

const terminalLines: TerminalLine[] = [
  { time: '14:31:42', type: 'ok', text: 'yield_bot    Jupiter swap         1.2 SOL   ALLOW' },
  { time: '14:31:48', type: 'ok', text: 'staking_bot  Marinade stake       3.0 SOL   ALLOW' },
  { time: '14:31:55', type: 'ok', text: 'yield_bot    Jupiter swap         0.8 SOL   ALLOW' },
  { time: '14:32:01', type: 'ok', text: 'yield_bot    Jupiter swap         1.5 SOL   ALLOW' },
  { time: '14:32:07', type: 'dim', text: '... normal operations ...' },
  { time: '14:32:14', type: 'warn', text: 'alpha_scan   Unknown program      4.8 SOL   FLAG  (68% conf)' },
  { time: '14:32:15', type: 'warn', text: 'alpha_scan   Burst: 3 tx / 4s     2.1 SOL   FLAG  (76% conf)' },
  { time: '14:32:16', type: 'err', text: 'alpha_scan   Drain sequence       8.2 SOL   PAUSE (94% conf)' },
  { time: '14:32:16', type: 'err', text: '──────────── AGENT FROZEN ON-CHAIN ────────────' },
  { time: '14:32:18', type: 'dim', text: 'Generating incident report via Guardian Agent...' },
  { time: '14:32:24', type: 'ok', text: 'Report ready: timeline, root cause, policy recommendations' },
]

const typeColors: Record<TerminalLine['type'], string> = {
  ok: 'text-[#27c93f]',
  warn: 'text-accent',
  err: 'text-danger',
  dim: 'text-foreground-dim',
}

export default function TerminalDemoSection() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const hasPlayed = useRef(false)
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPlayed.current) {
            hasPlayed.current = true
            observer.disconnect()
            runAnimation()
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(terminal)
    return () => observer.disconnect()
  }, [])

  function runAnimation() {
    terminalLines.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, line])
      }, i * 600)
    })
  }

  useEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = body.scrollHeight
  }, [visibleLines])

  return (
    <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          Live Demo
        </p>
        <h2 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Watch an attack get stopped.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Three agents running on devnet. One goes rogue. Guardrails catches and
          freezes it in seconds.
        </p>
      </div>

      <div
        ref={terminalRef}
        className="mx-auto max-w-[720px] overflow-hidden rounded-3xl border border-border bg-[#0a0e14]"
      >
        <div className="flex items-center gap-2 border-b border-border bg-white/2 px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          <span className="ml-3 font-mono text-xs text-white/30">
            guardrails-monitor — devnet
          </span>
        </div>
        <div
          ref={bodyRef}
          className="min-h-[300px] overflow-y-auto p-6 font-mono text-[13px] leading-[2] text-foreground-dim"
        >
          {visibleLines.map((line, i) => (
            <div
              key={i}
              className="animate-[fadeUp_0.4s_ease_forwards]"
            >
              <span className="text-xs text-white/30">[{line.time}]</span>{' '}
              <span className={typeColors[line.type]}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
