import Image from 'next/image'

const footerLinks = [
  { label: 'Problem', href: '#problem' },
  { label: 'Defense Layers', href: '#defense-layers' },
  { label: 'Architecture', href: '#architecture' },
]

const builtFor = [
  'Solana AI agents',
  'Protocol treasuries',
  'High-trust Web3 automation',
]

export default function SiteFooter() {
  return (
    <footer className="relative border-t border-border pb-10 pt-24">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-12">
        <FooterCallout />

        <div className="mt-8 flex flex-col gap-5 border-t border-border/60 pt-6 text-sm text-foreground-dim md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6"
            />
            Agent Guardrails Protocol
            <span className="mx-1 text-foreground/20">/</span>
            On-chain policy enforcement for Solana agents
          </p>
          <p className="text-foreground/55">Built for Solana Frontier hackathon.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCallout() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgb(var(--primary-soft-rgb)/0.14),var(--background-deep)_45%,rgb(var(--secondary-rgb)/0.1))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-12">
      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
            Final layer
          </p>
          <h2 className="mt-4 max-w-2xl font-sans text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            Autonomous agents should feel{' '}
            <span className="bg-linear-to-r from-primary-soft to-primary bg-clip-text text-transparent">
              powerful
            </span>
            , not impossible to control.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-foreground-dim">
            Agent Guardrails Protocol brings hard execution limits, realtime
            oversight, and on-chain pause controls to AI-native products
            building on Solana.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#defense-layers"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-slate-950 transition hover:bg-primary-strong"
            >
              Get started →
            </a>
            <a
              href="#architecture"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Read the docs
            </a>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-foreground/45">
              Navigate
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {footerLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2 text-sm font-medium text-foreground-dim transition hover:text-primary-soft"
                >
                  <span className="h-px w-3 bg-primary-soft/40 transition-all duration-300 group-hover:w-6 group-hover:bg-primary-soft" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-foreground/45">
              Built for
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-foreground-dim">
              {builtFor.map((item) => (
                <p key={item} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary-soft/60" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
