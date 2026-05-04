"use client";

import { AppShell } from "@/components/dashboard-ui";
import { TransactionCrafter } from "@/components/playground/transaction-crafter";
import { AttackSimulator } from "@/components/playground/attack-simulator";
import { SignalInspector } from "@/components/playground/signal-inspector";
import { KillSwitchDemo } from "@/components/playground/kill-switch-demo";
import { PolicySandbox } from "@/components/playground/policy-sandbox";
import type { PlaygroundTab } from "@/lib/playground/types";
import { usePlaygroundStore } from "@/lib/stores/playground";

const tabs: { id: PlaygroundTab; label: string }[] = [
  { id: "simulate", label: "Simulate" },
  { id: "inspect", label: "Signal inspector" },
  { id: "learn", label: "Reference" },
];

export function PlaygroundView() {
  const activeTab = usePlaygroundStore((s) => s.activeTab);
  const setActiveTab = usePlaygroundStore((s) => s.setActiveTab);

  return (
    <AppShell
      title="Playground"
      subtitle="Frontend-only Guardian simulation — no RPC spend, no server writes."
    >
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? "bg-white/[0.12] text-zinc-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "simulate" ? (
        <div className="space-y-6">
          <TransactionCrafter />
          <div className="border-t border-zinc-800/70 pt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Attack sequences
            </h3>
            <AttackSimulator />
          </div>
        </div>
      ) : null}
      {activeTab === "inspect" ? <SignalInspector /> : null}
      {activeTab === "learn" ? (
        <div className="space-y-6">
          <KillSwitchDemo />
          <div className="border-t border-zinc-800/70 pt-6">
            <PolicySandbox />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
