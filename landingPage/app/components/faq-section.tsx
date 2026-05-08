'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
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
  const [openIndex, setOpenIndex] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const baseId = useId()

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    const section = sectionRef.current
    if (!section) return

    const accordionItems = section.querySelectorAll<HTMLElement>(
      '[data-faq-item]',
    )
    if (accordionItems.length === 0) return

    gsap.set(accordionItems, { autoAlpha: 0, y: 18 })

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to(accordionItems, {
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
      gsap.killTweensOf(accordionItems)
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

      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-background-mid">
        {items.map((item, i) => (
          <article
            key={i}
            data-faq-item
            className="border-b border-white/8 last:border-b-0"
          >
            <h4>
              <button
                type="button"
                aria-expanded={openIndex === i}
                aria-controls={`${baseId}-faq-panel-${i}`}
                id={`${baseId}-faq-trigger-${i}`}
                onClick={() =>
                  setOpenIndex((current) => (current === i ? -1 : i))
                }
                className="group flex w-full items-center justify-between gap-5 px-6 py-5 text-left transition-colors duration-200 hover:bg-[#121820] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-soft sm:px-7"
              >
                <span className="text-[15px] font-semibold text-white">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="relative grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-primary-soft transition-colors duration-200 group-hover:border-primary-soft/40 group-hover:bg-primary-soft/8"
                >
                  <span className="absolute h-px w-3 bg-current" />
                  <span
                    className={`absolute h-3 w-px bg-current transition-transform duration-200 ${
                      openIndex === i ? 'scale-y-0' : 'scale-y-100'
                    }`}
                  />
                </span>
              </button>
            </h4>
            <div
              id={`${baseId}-faq-panel-${i}`}
              role="region"
              aria-labelledby={`${baseId}-faq-trigger-${i}`}
              className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                openIndex === i
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-6 pr-16 text-sm leading-7 text-foreground-dim sm:px-7 sm:pr-20">
                  {item.answer}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
