'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  {
    label: 'Overview',
    items: [{ title: 'Introduction', href: '/docs' }],
  },
  {
    label: 'Guides',
    items: [
      { title: 'Quick Start', href: '/docs/quick-start' },
      { title: 'Dashboard Guide', href: '/docs/dashboard-guide' },
      { title: 'Demo Walkthrough', href: '/docs/demo-walkthrough' },
      { title: 'Deployment', href: '/docs/deployment' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { title: 'SDK Reference', href: '/docs/sdk-reference' },
      { title: 'Program Reference', href: '/docs/program-reference' },
      { title: 'API Reference', href: '/docs/api-reference' },
    ],
  },
  {
    label: 'Concepts',
    items: [
      { title: 'Architecture', href: '/docs/architecture' },
      { title: 'Monitoring Pipeline', href: '/docs/monitoring-pipeline' },
    ],
  },
]

export default function Sidebar({
  open,
  onClose,
}: {
  open?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-foreground-dim transition hover:text-white"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path
              d="M10 4L6 8l4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Home
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`mb-0.5 flex items-center rounded-lg px-2 py-1.5 text-sm transition ${
                    active
                      ? 'border-l-2 border-primary bg-primary/5 pl-3 font-medium text-primary'
                      : 'text-foreground-dim hover:bg-white/3 hover:text-white'
                  }`}
                >
                  {item.title}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-background-deep">
        {nav}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background-deep shadow-xl lg:hidden">
            {nav}
          </aside>
        </>
      )}
    </>
  )
}
