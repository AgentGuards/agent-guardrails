"use client";

import { Shield } from "lucide-react";
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
  { id: "inspect", label: "Signal Inspector" },
  { id: "learn", label: "Kill Switch" },
];

function SandboxBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-teal-500/20 bg-teal-500/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
      <Shield size={12} strokeWidth={2} />
      Sandbox Mode
    </span>
  );
}

export function PlaygroundView() {
  const activeTab = usePlaygroundStore((s) => s.activeTab);
  const setActiveTab = usePlaygroundStore((s) => s.setActiveTab);

  return (
    <AppShell
      title="Playground"
      subtitle="Frontend-only Guardian simulation — no RPC spend, no server writes."
      actions={<SandboxBadge />}
    >
      {/* Tab bar */}
      <div className="mb-6 flex gap-0 border-b border-white/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px border-b-2 px-5 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === t.id
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "simulate" ? (
        <div className="space-y-6">
          <TransactionCrafter />
          <AttackSimulator />
        </div>
      ) : null}
      {activeTab === "inspect" ? <SignalInspector /> : null}
      {activeTab === "learn" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <KillSwitchDemo />
          <PolicySandbox />
        </div>
      ) : null}
    </AppShell>
  );
}
