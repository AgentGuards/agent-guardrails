'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const navLinks = [
  { label: 'Problem', href: '#problem' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Defense Layers', href: '#defense' },
  { label: 'Integration', href: '#code' },
  { label: 'FAQ', href: '#faq' },
]

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 bg-[rgb(3_7_13/0.7)] backdrop-blur-xl transition-all duration-300 ease-out ${
        scrolled ? 'border-b border-white/5 py-3' : 'border-b border-transparent py-4'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12">
        {/* Logo */}
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

        {/* Center nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground-dim transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
          <a
            href="/docs"
            className="hidden rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-[13px] font-semibold text-white transition hover:border-white/20 hover:bg-white/10 sm:inline-flex"
          >
            Docs
          </a>
          <a
            href="https://agentguards.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-slate-950 transition hover:bg-primary-strong"
          >
            Get Started
          </a>
        </div>
      </nav>
    </header>
  )
}
