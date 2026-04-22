import { Shield, Gauge, Zap } from "lucide-react"
import { LandingCTA } from "@/components/LandingCTA"

const FEATURES = [
  {
    icon: Shield,
    title: "Allow-lists",
    desc: "Restrict which programs an agent can interact with",
  },
  {
    icon: Gauge,
    title: "Spend limits",
    desc: "Daily budget caps with automatic enforcement",
  },
  {
    icon: Zap,
    title: "Kill switches",
    desc: "Real-time pause any agent with one click",
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Radial gradient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(217.2_91.2%_59.8%_/_0.08),transparent_70%)] pointer-events-none" />

      <div className="relative max-w-2xl text-center space-y-8">
        {/* Logo + title */}
        <div className="flex items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0ms" }}>
          <div className="rounded-2xl bg-primary/15 p-4 shadow-lg shadow-primary/20 inline-flex">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Agent Guardrails
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="text-xl text-muted-foreground animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          On-chain policy layer for AI agents on Solana. Enforce allow-lists, spending budgets, and real-time kill switches.
        </p>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-4 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <LandingCTA />
        </div>

        {/* Feature cards */}
        <div
          className="grid grid-cols-3 gap-6 mt-12 text-left animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default"
            >
              <div className="rounded-lg bg-primary/10 p-2 inline-flex mb-3">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
