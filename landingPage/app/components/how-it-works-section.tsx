'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const steps = [
  {
    id: '01',
    title: 'Define Policy',
    description:
      'Create an on-chain policy: whitelist programs, set per-tx and daily spending limits, configure AI monitoring thresholds.',
  },
  {
    id: '02',
    title: 'Execute Guarded',
    description:
      'Agent calls guarded_execute instead of raw transactions. The program validates allow-lists and budgets on-chain before CPI.',
  },
  {
    id: '03',
    title: 'AI Monitors',
    description:
      'Off-chain AI (Guardian Agent) analyzes behavioral patterns in real time. Anomalies trigger an instant on-chain pause — no committee votes needed.',
  },
]

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll<HTMLElement>('[data-step-card]')
    if (cards.length === 0) return

    gsap.set(cards, { autoAlpha: 0, y: 28, scale: 0.94 })

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to(cards, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          ease: 'back.out(1.6)',
          stagger: 0.18,
        })
      },
    })

    return () => {
      trigger.kill()
      gsap.killTweensOf(cards)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12"
    >
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          How It Works
        </p>
        <h2 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Three layers. One instruction.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Route agent transactions through{' '}
          <code className="rounded bg-white/5 px-2 py-0.5 font-mono text-sm text-foreground-dim">
            guarded_execute
          </code>
          . The protocol handles the rest.
        </p>
      </div>

      <div className="grid gap-0.5 overflow-hidden rounded-3xl bg-border lg:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            data-step-card
            className="relative bg-background-mid p-10 transition-colors hover:bg-[#121820]"
          >
            <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary-rgb)/0.15)] font-mono text-sm font-semibold text-primary">
              {step.id}
            </div>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2.5 text-sm leading-7 text-foreground-dim">
              {step.description}
            </p>

            {/* Connecting arrow between steps */}
            {i < steps.length - 1 && (
              <div className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background lg:flex">
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  className="h-3.5 w-3.5 text-foreground-dim"
                >
                  <path
                    d="M5 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
