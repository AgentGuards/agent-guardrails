import Link from "next/link"
import { Shield } from "lucide-react"
import { LandingCTA } from "@/components/LandingCTA"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">Agent Guardrails</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          On-chain policy layer for AI agents on Solana. Enforce allow-lists, spending budgets, and real-time kill switches.
        </p>
        <div className="flex flex-col items-center gap-4">
          <LandingCTA />
        </div>
        <div className="grid grid-cols-3 gap-6 mt-12 text-left">
          {[
            { title: "Allow-lists", desc: "Restrict which programs an agent can interact with" },
            { title: "Spend limits", desc: "Daily budget caps with automatic enforcement" },
            { title: "Kill switches", desc: "Real-time pause any agent with one click" },
          ].map((f) => (
            <div key={f.title} className="border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
