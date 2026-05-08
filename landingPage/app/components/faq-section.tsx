'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export type FaqItem = {
  question: string
  answer: React.ReactNode
}

type FaqSectionProps = {
  items: FaqItem[]
}

export default function FaqSection({ items }: FaqSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll<HTMLElement>('[data-faq-card]')
    if (cards.length === 0) return

    gsap.set(cards, { autoAlpha: 0, y: 20 })

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to(cards, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.08,
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
      id="faq"
      className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12"
    >
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          FAQ
        </p>
        <h2 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Common questions
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {items.map((item, i) => (
          <div
            key={i}
            data-faq-card
            className="rounded-3xl border border-border bg-background-mid p-7 transition-all duration-250 hover:border-white/14 hover:bg-[#121820]"
          >
            <h4 className="text-[15px] font-semibold text-white">
              {item.question}
            </h4>
            <p className="mt-2.5 text-sm leading-7 text-foreground-dim">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
