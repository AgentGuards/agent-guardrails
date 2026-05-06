'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!sectionRef.current || !cardRef.current) {
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    gsap.registerPlugin(ScrollTrigger)

    const cardElement = cardRef.current
    if (!cardElement) {
      return
    }

    const ctx = gsap.context(() => {
      if (!cardRef.current) {
        return
      }

      gsap.fromTo(
        cardRef.current,
        {
          y: 96,
          scale: 0.92,
          opacity: 0.58,
          transformOrigin: '50% 50%',
        },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom-=6%',
            end: 'center center+=6%',
            scrub: 1.2,
          },
        }
      )
    }, cardElement)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="problem"
      className="relative mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-6 py-10 sm:px-10 lg:px-12"
    >
      <div
        ref={cardRef}
        className="group relative mx-auto w-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgb(255_255_255/0.06),rgb(255_255_255/0.02)_55%,rgb(var(--secondary-rgb)/0.08))] p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] will-change-transform xl:p-12"
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgb(var(--secondary-rgb) / 0.12), transparent 40%), radial-gradient(circle at 100% 100%, rgb(var(--primary-rgb) / 0.10), transparent 45%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-secondary/20 blur-[120px]"
        />

        <div className="relative grid gap-10 xl:grid-cols-[0.9fr_1.1fr] xl:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.32em] text-secondary-soft">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
              </span>
              The problem
            </div>
            <h2 className="mt-6 max-w-md font-sans text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Web3 agents move fast.{` `}
              <span className="bg-linear-to-r from-secondary-soft to-secondary bg-clip-text text-transparent">
                Their failure modes move faster.
              </span>
            </h2>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                  Avg drain time
                </p>
                <p className="mt-2 font-sans text-2xl font-semibold text-white">
                  &lt; 12<span className="text-base text-white/50">s</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                  Recovery rate
                </p>
                <p className="mt-2 font-sans text-2xl font-semibold text-white">
                  ~3<span className="text-base text-white/50">%</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 text-base leading-8 text-slate-300">
            <div className="relative rounded-2xl border border-white/8 bg-white/3 p-6">
              <span className="absolute left-0 top-6 h-8 w-0.75 rounded-r-full bg-linear-to-b from-secondary to-secondary-soft/0" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-secondary-soft/80">
                Today
              </p>
              <p className="mt-3 text-slate-200">
                An agent compromise usually means the treasury and permissions
                are compromised too. <span className="text-white">If the key can sign, it can drain.</span>
              </p>
            </div>

            <div className="relative rounded-2xl border border-primary-soft/20 bg-[linear-gradient(135deg,rgb(var(--primary-rgb)/0.08),transparent_70%)] p-6">
              <span className="absolute left-0 top-6 h-8 w-0.75 rounded-r-full bg-linear-to-b from-primary-soft to-primary-soft/0" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary-soft/80">
                With Guardrails
              </p>
              <p className="mt-3 text-slate-200">
                Agent Guardrails Protocol{' '}
                <span className="text-white">separates intent from execution.</span>{' '}
                The agent can request an action, but the policy layer decides
                whether it&apos;s legal, affordable, and safe enough to reach
                Solana.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
