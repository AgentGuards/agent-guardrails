export default function HeroSection() {
  return (
    <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-20 sm:px-10 lg:px-12">
      <div className="max-w-5xl">
        <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          On-chain agent defense
          <span className="text-white/30">/</span>
          <span className="text-primary-soft">v0.1</span>
        </div>
        <h1 className="max-w-5xl font-sans text-5xl font-semibold leading-[0.92] tracking-tighter sm:text-6xl lg:text-8xl">
          Agent
          <span className="bg-linear-to-r from-primary-soft via-primary-strong to-primary bg-clip-text text-transparent"> Guardrails</span>{' '}
          Protocol
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
          An on-chain policy layer for Solana AI agents. Enforce what an agent
          can call, how much it can spend, and how fast it can be paused when
          behavior drifts.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <a
          href="#defense-layers"
          className="group relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-primary px-7 text-sm font-semibold text-slate-950 shadow-[0_10px_40px_-10px_rgb(var(--primary-rgb)/0.6)] transition hover:bg-primary-strong"
        >
          <span className="relative z-10 flex items-center gap-2">
            Explore the protocol
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </a>
        <a
          href="#architecture"
          className="group inline-flex h-13 items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/20 hover:bg-white/10"
        >
          See how it works
          <span className="ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
        </a>
      </div>

    </section>
  )
}
