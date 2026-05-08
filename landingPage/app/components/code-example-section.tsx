'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const features = [
  {
    title: 'Drop-in replacement',
    description: (
      <>
        Replace your raw transaction call with{' '}
        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">
          guard.execute()
        </code>
        . No architecture changes needed.
      </>
    ),
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path
          d="M5 10l3 3 7-7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: 'Framework agnostic',
    description:
      'Works with Solana Agent Kit, LangChain, AutoGPT, or any custom agent. Wraps the executor, not the agent logic.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path
          d="M10 2v16M2 10h16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'PDA-based custody',
    description:
      "Funds live in a policy-owned PDA, not in the agent's keypair. The agent signs, but never holds the keys to the treasury.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <rect
          x="3"
          y="3"
          width="14"
          height="14"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 7h6v6H7z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    title: 'Open source',
    description:
      'Fully auditable Anchor program. Inspect the on-chain logic yourself — no trust required.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path
          d="M10 2l2.5 5 5.5.8-4 3.9 1 5.3L10 14.5 4.5 17l1-5.3-4-3.9 5.5-.8L10 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function CodeExampleSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    const section = sectionRef.current
    if (!section) return

    const items = section.querySelectorAll<HTMLElement>('[data-code-reveal]')
    if (items.length === 0) return

    gsap.set(items, { autoAlpha: 0, y: 28 })

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.15,
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
      id="code"
      className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12"
    >
      <div className="mb-14">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          Integration
        </p>
        <h2 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Five lines to protect your agent.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Wrap your agent&apos;s executor with the Guardrails SDK. Works with
          Solana Agent Kit, LangChain, or any custom agent framework.
        </p>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-2">
        {/* Code block */}
        <div
          data-code-reveal
          className="overflow-hidden rounded-3xl border border-border bg-background"
        >
          <div className="flex items-center gap-2 border-b border-border bg-white/2 px-5 py-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
            <span className="ml-3 font-mono text-xs text-white/30">
              agent.ts
            </span>
          </div>
          <div className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.8] text-foreground-dim">
            <span className="text-[#c678dd]">import</span>
            {' { '}
            <span className="text-[#e5c07b]">GuardrailsClient</span>
            {' } '}
            <span className="text-[#c678dd]">from</span>{' '}
            <span className="text-[#98c379]">
              &apos;@agent-guardrails/sdk&apos;
            </span>
            ;
            <br />
            <br />
            <span className="italic text-white/30">
              {'//'} Initialize with your policy
            </span>
            <br />
            <span className="text-[#c678dd]">const</span>{' '}
            <span className="text-[#61afef]">guard</span> ={' '}
            <span className="text-[#c678dd]">new</span>{' '}
            <span className="text-[#e5c07b]">GuardrailsClient</span>
            {'({'}
            <br />
            {'  '}
            <span className="text-[#e06c75]">policyId</span>:{' '}
            <span className="text-[#98c379]">&apos;8xKZ...policy&apos;</span>,
            <br />
            {'  '}
            <span className="text-[#e06c75]">agentKeypair</span>:{' '}
            <span className="text-[#61afef]">loadKeypair</span>(),
            <br />
            {'});'}
            <br />
            <br />
            <span className="italic text-white/30">
              {'//'} Every transaction goes through guarded_execute
            </span>
            <br />
            <span className="text-[#c678dd]">const</span>{' '}
            <span className="text-[#61afef]">tx</span> ={' '}
            <span className="text-[#c678dd]">await</span>{' '}
            <span className="text-[#61afef]">guard</span>.
            <span className="text-[#61afef]">execute</span>
            {'({'}
            <br />
            {'  '}
            <span className="text-[#e06c75]">targetProgram</span>:{' '}
            <span className="text-[#d19a66]">JUPITER_PROGRAM_ID</span>,
            <br />
            {'  '}
            <span className="text-[#e06c75]">amount</span>:{' '}
            <span className="text-[#d19a66]">1.5</span> *{' '}
            <span className="text-[#d19a66]">LAMPORTS_PER_SOL</span>,
            <br />
            {'  '}
            <span className="text-[#e06c75]">instruction</span>:{' '}
            <span className="text-[#61afef]">swapIx</span>,
            <br />
            {'});'}
            <br />
            <br />
            <span className="italic text-white/30">
              {'//'} &#10003; Allow-list checked on-chain
            </span>
            <br />
            <span className="italic text-white/30">
              {'//'} &#10003; Budget validated on-chain
            </span>
            <br />
            <span className="italic text-white/30">
              {'//'} &#10003; AI monitoring triggered
            </span>
          </div>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              data-code-reveal
              className="flex gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary-rgb)/0.15)] text-primary">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">
                  {feature.title}
                </h4>
                <p className="mt-1 text-sm leading-6 text-foreground-dim">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
