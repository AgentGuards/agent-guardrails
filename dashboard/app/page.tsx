import Link from "next/link";
import { AppShell } from "@/components/dashboard-ui";

export default function Home() {
  return (
    <AppShell
      title="Agent Guardrails Protocol"
      subtitle="Solana policy controls for autonomous agents."
    >
      <section className="card relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.2),transparent_45%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-blue-800/70 bg-blue-950/45 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-200">
              Real-time AI Agent Safety
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Guard autonomous agents with policy controls and live incident response.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-zinc-300 sm:text-base">
              Monitor transactions, enforce spend limits, auto-pause suspicious behavior, and review full
              postmortems in one operator dashboard built for Solana-native teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signin" className="button button-primary">
                Sign in with wallet
              </Link>
              <Link href="/agents" className="button button-secondary">
                Explore agents
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-blue-900/50 bg-zinc-900/70 p-5 shadow-[0_18px_42px_-28px_rgba(59,130,246,0.7)]">
            <div className="card-title">Live posture snapshot</div>
            <div className="mt-4 space-y-3">
              <div className="spread rounded-lg border border-zinc-800/80 bg-zinc-950/55 px-3 py-2">
                <span className="text-sm text-zinc-400">Guarded transactions</span>
                <strong className="text-zinc-100">24h stream</strong>
              </div>
              <div className="spread rounded-lg border border-zinc-800/80 bg-zinc-950/55 px-3 py-2">
                <span className="text-sm text-zinc-400">Auto-pauses</span>
                <strong className="text-amber-300">On anomaly</strong>
              </div>
              <div className="spread rounded-lg border border-zinc-800/80 bg-zinc-950/55 px-3 py-2">
                <span className="text-sm text-zinc-400">Reports</span>
                <strong className="text-blue-200">Timeline + reasoning</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="layout-three mt-5">
        <article className="card">
          <div className="card-title">Policy enforcement</div>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">Program allow-lists and budget limits</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Define exactly where agents can transact and cap risk with per-transaction and daily limits.
          </p>
        </article>
        <article className="card">
          <div className="card-title">Live operations</div>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">Activity feed with model verdicts</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Track every guarded transaction in real time with ALLOW, FLAG, and PAUSE decisions.
          </p>
        </article>
        <article className="card">
          <div className="card-title">Incident response</div>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">Immediate pause and investigation</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Review incident timelines and generated reports to harden policy settings after each event.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
