'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type GuardrailLayer = {
  id: string
  title: string
  copy: string
}

type DefenseLayersSectionProps = {
  guardrailLayers: GuardrailLayer[]
}

const layerAccents: Record<
  string,
  { glow: string; label: string; icon: React.ReactNode }
> = {
  '01': {
    glow: 'rgb(var(--primary-rgb) / 0.18)',
    label: 'text-primary-soft',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  '02': {
    glow: 'rgb(var(--primary-rgb) / 0.18)',
    label: 'text-primary-soft',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  '03': {
    glow: 'rgb(var(--primary-rgb) / 0.18)',
    label: 'text-primary-soft',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
}

export default function DefenseLayersSection({
  guardrailLayers,
}: DefenseLayersSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!sectionRef.current || !stageRef.current) {
      return
    }

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-defense-card]')

      if (cards.length === 0) {
        return
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=220%',
          pin: stageRef.current,
          anticipatePin: 1,
          scrub: 1,
        },
      })

      cards.forEach((card, index) => {
        timeline.fromTo(
          card,
          {
            y: 120,
            autoAlpha: 0,
            scale: 0.92,
            rotateX: -14,
            clipPath: 'inset(0 0 100% 0 round 28px)',
            transformOrigin: '50% 100%',
          },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            rotateX: 0,
            clipPath: 'inset(0 0 0% 0 round 28px)',
            ease: 'power3.out',
            duration: 1,
          },
          index === 0 ? 0 : '>'
        )
      })
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="defense-layers"
      className="relative mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12"
    >
      <div ref={stageRef} className="min-h-screen pb-10 pt-8">
        <div
          data-defense-heading
          className="z-20 w-full border-b border-white/8 bg-[linear-gradient(180deg,rgb(3_7_13/0.98),rgb(3_7_13/0.82),rgb(3_7_13/0.45),transparent)] pb-6 backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
                Defense in depth
              </p>
              <h1 className="mt-3 font-sans text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                Three layers of defense
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                A policy firewall between any autonomous agent and{' '}
                <span className="text-primary-soft">the chain.</span>
              </p>
            </div>
            
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 perspective-distant">
          {guardrailLayers.map((layer, index) => {
            const accent = layerAccents[layer.id] ?? layerAccents['01']
            return (
              <div
                key={layer.id}
                className="group relative z-0 h-full transition-transform duration-500 ease-out will-change-transform hover:z-10 hover:-translate-y-2 hover:scale-[1.03]"
              >
              <article
                data-defense-card
                className="relative h-full overflow-hidden rounded-3xl p-7 will-change-transform transition-shadow duration-500"
                style={{
                  boxShadow: `0 30px 70px -40px ${accent.glow}`,
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin opacity-90 [animation-duration:4s] group-hover:opacity-100"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, rgb(var(--primary-soft-rgb) / 1) 60deg, rgb(var(--primary-rgb) / 0.6) 90deg, transparent 150deg)',
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0.5 rounded-[22px]"
                  style={{
                    background:
                      'linear-gradient(155deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.02)), var(--background-mid)',
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ backgroundColor: accent.glow }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    backgroundImage:
                      'radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgb(255 255 255 / 0.04), transparent 40%)',
                  }}
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${accent.label}`}
                    >
                      {accent.icon}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-white/35">
                      <span>Layer</span>
                      <span className="text-white/65">{layer.id}</span>
                    </div>
                  </div>

                  <h3
                    className={`mt-8 font-sans text-2xl font-semibold ${accent.label}`}
                  >
                    {layer.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-slate-300">
                    {layer.copy}
                  </p>

                  <div className="mt-auto pt-8">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className={`h-px flex-1 transition-all duration-500 ${
                              i <= index
                                ? 'bg-primary-soft/50'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </article>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
