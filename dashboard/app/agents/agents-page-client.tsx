"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AppShell } from "@/components/dashboard-ui";
import { CreatePolicyWizard } from "@/components/create-policy-wizard/CreatePolicyWizard";
import { AgentsOverview } from "@/app/agents/agents-overview";

export function AgentsPageClient({ startWithNewAgentOpen }: { startWithNewAgentOpen: boolean }) {
  const [isNewAgentOpen, setIsNewAgentOpen] = useState(startWithNewAgentOpen);

  useEffect(() => {
    if (startWithNewAgentOpen) {
      setIsNewAgentOpen(true);
    }
  }, [startWithNewAgentOpen]);

  return (
    <>
      <AppShell
        title="Agents"
        subtitle="Policies owned by your wallet."
        actions={
          <button
            type="button"
            onClick={() => setIsNewAgentOpen(true)}
            className="button button-primary px-3.5 py-2"
          >
            New Agent
          </button>
        }
      >
        <AgentsOverview onNewAgent={() => setIsNewAgentOpen(true)} />
      </AppShell>

      {isNewAgentOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="panel-glow relative max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6 md:p-7">
            <button
              type="button"
              onClick={() => setIsNewAgentOpen(false)}
              aria-label="Close new agent modal"
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
            >
              <X size={18} />
            </button>

            <div className="pr-10">
              <h2 className="text-xl font-semibold text-zinc-100 md:text-2xl">Create Policy</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Define program allow-lists, spend limits, and escalation controls.
              </p>
            </div>

            <div className="mt-5">
              <CreatePolicyWizard onCreated={() => setIsNewAgentOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

