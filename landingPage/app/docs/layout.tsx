'use client'

import { useState } from 'react'
import Sidebar from '../components/docs/sidebar'
import TableOfContents from '../components/docs/table-of-contents'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Fixed left sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Fixed right sidebar */}
      <TableOfContents />

      {/* Main content — offset from both fixed sidebars */}
      <div className="lg:ml-64 xl:mr-56">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-dim transition hover:bg-white/5"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path
                d="M2 4h12M2 8h12M2 12h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="font-mono text-xs text-foreground-dim">
            Agent Guardrails Docs
          </span>
        </div>

        <main className="px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          {children}
        </main>
      </div>
    </div>
  )
}
