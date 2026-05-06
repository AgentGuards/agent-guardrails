'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const SHOW_AFTER_PX = 200

export default function SiteHeader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[rgb(3_7_13/0.65)] backdrop-blur-xl transition-all duration-300 ease-out ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-full opacity-0'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 sm:px-10 lg:px-12">
        <a href="#" className="group flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Agent Guardrails logo"
            width={36}
            height={36}
            priority
            className="h-9 w-9 drop-shadow-[0_0_12px_rgb(var(--primary-rgb)/0.35)] transition group-hover:drop-shadow-[0_0_18px_rgb(var(--primary-rgb)/0.55)]"
          />
          <span className="font-sans text-sm font-semibold tracking-tight text-white">
            Agent Guardrails
          </span>
        </a>
      </nav>
    </header>
  )
}
