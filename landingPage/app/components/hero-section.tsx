export default function HeroSection() {
  return (
    <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10 lg:px-12">
      <div className="mx-auto max-w-[800px]">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          On-chain agent defense
          <span className="text-white/30">&middot;</span>
          <span className="text-primary-soft">Solana</span>
        </div>

        {/* Headline */}
        <h1 className="font-sans text-5xl font-semibold leading-[1.05] tracking-tighter sm:text-6xl lg:text-[72px]">
          Stop rogue agents.
          <br />
          <span className="bg-linear-to-r from-primary via-[#00b8ff] to-[#8b5cf6] bg-clip-text text-transparent">
            Protect every transaction.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-[580px] text-lg leading-[1.65] text-slate-300 sm:text-xl">
          The on-chain policy layer between autonomous AI agents and the Solana
          blockchain. Enforce allow-lists, spending budgets, and AI-powered kill
          switches&nbsp;&mdash; before damage is done.
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <a
          href="https://agentguards.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-primary px-7 text-sm font-semibold text-slate-950 shadow-[0_10px_40px_-10px_rgb(var(--primary-rgb)/0.6)] transition hover:bg-primary-strong"
        >
          <span className="relative z-10 flex items-center gap-2">
            Start Building
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path
                d="M3 8h10m0 0L9 4m4 4L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </a>
        <a
          href="#how-it-works"
          className="group inline-flex h-13 items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/20 hover:bg-white/10"
        >
          See How It Works
        </a>
      </div>

      {/* Micro-text */}
      <p className="mt-5 text-sm text-foreground-dim">
        One instruction:{' '}
        <code className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-foreground-dim">
          guarded_execute
        </code>{' '}
        &mdash; same security model as traditional finance.
      </p>
    </section>
  )
}
