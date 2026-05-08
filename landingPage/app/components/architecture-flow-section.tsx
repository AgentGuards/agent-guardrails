'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const nodes = [
  {
    title: 'AI Agent',
    description: 'Requests a transaction via SDK',
    iconBg: 'bg-[rgb(var(--primary-rgb)/0.15)]',
    iconColor: 'text-primary',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" className="h-[22px] w-[22px]">
        <rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8h6M8 11h4M8 14h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Guardrails Program',
    description: 'On-chain policy check + CPI',
    iconBg: 'bg-[rgb(var(--violet-rgb)/0.12)]',
    iconColor: 'text-violet',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" className="h-[22px] w-[22px]">
        <path d="M11 2l7 4v6c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-4z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Helius Webhook',
    description: 'Streams events to monitor',
    iconBg: 'bg-[rgb(var(--accent-rgb)/0.12)]',
    iconColor: 'text-accent',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" className="h-[22px] w-[22px]">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 7v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'AI Judge',
    description: 'Guardian Agent analyzes + pauses',
    iconBg: 'bg-[rgb(var(--danger-rgb)/0.12)]',
    iconColor: 'text-danger',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" className="h-[22px] w-[22px]">
        <path d="M12 2L3 13h8l-1 7 9-11h-8l1-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Dashboard',
    description: 'Real-time feed + controls',
    iconBg: 'bg-[rgb(var(--primary-rgb)/0.08)]',
    iconColor: 'text-primary',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" className="h-[22px] w-[22px]">
        <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 9h8M7 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function ArchitectureFlowSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    const section = sectionRef.current
    if (!section) return

    const items = section.querySelectorAll<HTMLElement>('[data-arch-node]')
    if (items.length === 0) return

    gsap.set(items, { autoAlpha: 0, y: 24 })

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.1,
        })
      },
    })

    return () => {
      trigger.kill()
      gsap.killTweensOf(items)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="architecture"
      className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12"
    >
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          Architecture
        </p>
        <h2 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          End-to-end defense flow
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          From agent request to on-chain execution — every step is validated,
          monitored, and auditable.
        </p>
      </div>

      <div className="flex flex-col gap-0.5 overflow-hidden rounded-3xl bg-border lg:flex-row">
        {nodes.map((node, i) => (
          <div
            key={node.title}
            data-arch-node
            className="relative flex-1 bg-background-mid p-8 text-center transition-colors hover:bg-[#121820]"
          >
            <div
              className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] ${node.iconBg} ${node.iconColor}`}
            >
              {node.icon}
            </div>
            <h4 className="text-sm font-semibold text-white">{node.title}</h4>
            <p className="mt-1.5 text-[13px] leading-5 text-foreground-dim">
              {node.description}
            </p>

            {/* Arrow connector */}
            {i < nodes.length - 1 && (
              <div className="absolute -bottom-3.5 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background lg:-right-3.5 lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0">
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  className="h-3.5 w-3.5 rotate-90 text-primary lg:rotate-0"
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
