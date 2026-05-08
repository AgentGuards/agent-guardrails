export default function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden py-32">
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, rgb(var(--primary-rgb) / 0.08), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[880px] px-6 text-center sm:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary-soft">
          Get Started
        </p>
        <h2 className="mt-4 font-sans text-4xl font-semibold tracking-tighter text-white sm:text-5xl lg:text-6xl">
          Protect your agents.
          <br />
          <span className="bg-linear-to-r from-primary  via-[#dee5e7] to-[#bead68] bg-clip-text text-transparent">
            Ship with confidence.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-lg leading-7 text-foreground-dim">
          Deploy on-chain guardrails in minutes. Open source, composable, and
          built for the Solana ecosystem.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
            href="#"
            className="inline-flex h-13 items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Read the Docs
          </a>
        </div>

        <p className="mt-5 text-sm text-white/40">
          Free and open source. Deploy in under 5 minutes.
        </p>
      </div>
    </section>
  )
}
