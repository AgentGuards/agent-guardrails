'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type TocItem = {
  id: string
  text: string
  level: number
}

const DOT_COL = 12 // px width of the dot column
const DOT_CENTER = DOT_COL / 2 // center axis for track line + dots
const ROW_H = 36 // px height per row

export default function TableOfContents() {
  const pathname = usePathname()
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  const extractHeadings = useCallback(() => {
    const timer = setTimeout(() => {
      const headings = Array.from(
        document.querySelectorAll('main h2, main h3')
      ) as HTMLElement[]

      const tocItems: TocItem[] = headings.map((heading) => {
        if (!heading.id) {
          heading.id =
            heading.textContent
              ?.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '') ?? ''
        }
        return {
          id: heading.id,
          text: heading.textContent ?? '',
          level: heading.tagName === 'H2' ? 2 : 3,
        }
      })

      setItems(tocItems)
      setActiveId(tocItems[0]?.id ?? '')
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const cleanup = extractHeadings()
    return cleanup
  }, [pathname, extractHeadings])

  useEffect(() => {
    if (items.length === 0) return

    observerRef.current?.disconnect()

    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[]

    if (headingElements.length === 0) return

    const visibleSet = new Set<string>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSet.add(entry.target.id)
          } else {
            visibleSet.delete(entry.target.id)
          }
        })

        const firstVisible = items.find((item) => visibleSet.has(item.id))
        if (firstVisible) {
          setActiveId(firstVisible.id)
        }
      },
      {
        rootMargin: '-60px 0px -70% 0px',
        threshold: 0,
      }
    )

    headingElements.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [items])

  const activeIndex = items.findIndex((item) => item.id === activeId)

  if (items.length === 0) return null

  return (
    <aside className="hidden xl:block">
      <div className="fixed right-0 top-0 h-screen w-56 overflow-y-auto border-l border-white/5 bg-background py-10 pl-4 pr-4">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
          On this page
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Track line — centered in the dot column */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/8"
            style={{ left: `${DOT_CENTER}px`, transform: 'translateX(-50%)' }}
          />

          {/* Progress line — grows down to active item */}
          {activeIndex >= 0 && (
            <div
              className="absolute w-px transition-all duration-500 ease-out"
              style={{
                left: `${DOT_CENTER}px`,
                transform: 'translateX(-50%)',
                top: 0,
                height: `${activeIndex * ROW_H + ROW_H / 2}px`,
                background:
                  'linear-gradient(180deg, rgb(var(--primary-rgb) / 0.05) 0%, rgb(var(--primary-rgb) / 0.6) 100%)',
              }}
            />
          )}

          <nav className="relative flex flex-col">
            {items.map((item, i) => {
              const isActive = activeId === item.id
              const isPast = i <= activeIndex

              return (
                <a
                  key={`${pathname}-${item.id}`}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(item.id)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                    window.history.replaceState(null, '', `#${item.id}`)
                    setActiveId(item.id)
                  }}
                  className="group flex items-center"
                  style={{ height: `${ROW_H}px` }}
                >
                  {/* Fixed-width dot column — all dots centered on the same axis */}
                  <span
                    className="flex shrink-0 items-center justify-center"
                    style={{ width: `${DOT_COL}px` }}
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${
                        isActive
                          ? 'h-[10px] w-[10px] bg-primary ring-[3px] ring-background shadow-[0_0_8px_rgb(var(--primary-rgb)/0.6),0_0_20px_rgb(var(--primary-rgb)/0.3)]'
                          : isPast
                            ? 'h-[6px] w-[6px] bg-primary ring-[3px] ring-background'
                            : 'h-[6px] w-[6px] bg-[#2a3040] ring-[3px] ring-background group-hover:bg-white/30'
                      }`}
                    />
                  </span>

                  {/* Label */}
                  <span
                    className={`truncate transition-all duration-300 ${
                      item.level === 3 ? 'pl-4 text-[12px]' : 'pl-2 text-[13px]'
                    } ${
                      isActive
                        ? 'font-medium text-primary'
                        : isPast
                          ? 'text-white/50'
                          : 'text-white/30 group-hover:text-white/60'
                    }`}
                  >
                    {item.text}
                  </span>
                </a>
              )
            })}
          </nav>
        </div>

        {/* Edit on GitHub */}
        <div className="mt-8 border-t border-white/6 pt-4">
          <a
            href="https://github.com/AgentGuards/agent-guardrails"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-xs text-white/25 transition hover:text-white/50"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M8 1C4.13 1 1 4.13 1 8c0 3.1 2.01 5.73 4.79 6.66.35.06.48-.15.48-.34 0-.17-.01-.71-.01-1.29-1.76.33-2.2-.43-2.34-.82-.08-.2-.42-.82-.71-.98-.24-.13-.59-.46-.01-.47.55-.01.94.5 1.07.71.63 1.05 1.63.76 2.03.57.06-.45.24-.76.44-.93-1.55-.18-3.18-.78-3.18-3.46 0-.76.27-1.39.71-1.88-.07-.18-.31-.89.07-1.85 0 0 .58-.19 1.9.71a6.5 6.5 0 011.74-.24c.59 0 1.18.08 1.74.24 1.32-.9 1.9-.71 1.9-.71.38.96.14 1.67.07 1.85.44.49.71 1.11.71 1.88 0 2.69-1.63 3.28-3.19 3.45.25.22.47.64.47 1.29 0 .93-.01 1.68-.01 1.91 0 .19.13.41.48.34A7.01 7.01 0 0015 8c0-3.87-3.13-7-7-7z"
                fill="currentColor"
              />
            </svg>
            Edit on GitHub
          </a>
        </div>
      </div>
    </aside>
  )
}
