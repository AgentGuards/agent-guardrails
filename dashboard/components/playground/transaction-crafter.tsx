"use client";

import { useMemo } from "react";
import { Play } from "lucide-react";
import { POLICIES } from "@/lib/mock/policies";
import { PLAYGROUND_PROGRAM_OPTIONS } from "@/lib/playground/constants";
import { runSimulation } from "@/lib/playground/engine";
import type { CrafterParams, PlaygroundPolicySlice, SessionRemainingBucket } from "@/lib/playground/types";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { PolicySummary } from "@/lib/types/dashboard";
import { usePlaygroundStore } from "@/lib/stores/playground";
import { VerdictPanel } from "./verdict-panel";
import { PlaygroundProgressBar } from "./progress-bar";

function resolvePolicies(remote: PolicySummary[] | undefined): PlaygroundPolicySlice[] {
  const list = remote?.length ? remote : POLICIES;
  return list.map((p) => ({
    pubkey: p.pubkey,
    maxTxLamports: p.maxTxLamports,
    dailyBudgetLamports: p.dailyBudgetLamports,
    allowedPrograms: p.allowedPrograms,
  }));
}

function policyLabelText(p: PlaygroundPolicySlice): string {
  const full = POLICIES.find((x) => x.pubkey === p.pubkey);
  return full?.label ?? `${p.pubkey.slice(0, 4)}…${p.pubkey.slice(-4)}`;
}

const selectClass = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[12px] text-zinc-200 outline-none transition-colors focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20 appearance-none cursor-pointer";

export function TransactionCrafter() {
  const policiesQuery = usePoliciesQuery();
  const policies = useMemo(() => resolvePolicies(policiesQuery.data), [policiesQuery.data]);

  const crafterParams = usePlaygroundStore((s) => s.crafterParams);
  const crafterResult = usePlaygroundStore((s) => s.crafterResult);
  const crafterRunning = usePlaygroundStore((s) => s.crafterRunning);
  const crafterProgress = usePlaygroundStore((s) => s.crafterProgress);
  const setCrafterParams = usePlaygroundStore((s) => s.setCrafterParams);
  const setCrafterResult = usePlaygroundStore((s) => s.setCrafterResult);
  const setCrafterRunning = usePlaygroundStore((s) => s.setCrafterRunning);
  const setCrafterProgress = usePlaygroundStore((s) => s.setCrafterProgress);

  const selectedPolicy = policies.find((p) => p.pubkey === crafterParams.policyPubkey) ?? policies[0] ?? POLICIES[0];
  const effectivePubkey = crafterParams.policyPubkey ?? selectedPolicy?.pubkey ?? POLICIES[0]!.pubkey;

  const runJudge = async () => {
    const policy = policies.find((p) => p.pubkey === effectivePubkey) ?? policies[0];
    if (!policy) return;
    setCrafterRunning(true);
    setCrafterProgress(0);
    setCrafterResult(null);
    const params: CrafterParams = { ...crafterParams, policyPubkey: effectivePubkey };
    const duration = 900 + Math.floor(Math.random() * 400);
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, duration / steps));
      setCrafterProgress((i / steps) * 100);
    }
    const result = runSimulation(params, policy);
    setCrafterResult(result);
    setCrafterRunning(false);
    setCrafterProgress(100);
  };

  const sessionOpts: { value: SessionRemainingBucket; label: string }[] = [
    { value: "gt24h", label: "> 24 hours" },
    { value: "h1to6", label: "1–6 hours" },
    { value: "m30", label: "~30 minutes" },
    { value: "lt10min", label: "< 10 minutes" },
    { value: "expired", label: "Expired" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Input Pane */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Transaction Crafter</span>
          <span className="text-[10px] text-zinc-600">Configure parameters</span>
        </div>
        <div className="flex-1 space-y-4 p-5">
          {/* Policy */}
          <div>
            <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Agent Policy</div>
            <select className={selectClass} value={effectivePubkey} onChange={(e) => setCrafterParams({ policyPubkey: e.target.value })}>
              {policies.map((p) => <option key={p.pubkey} value={p.pubkey}>{policyLabelText(p)}</option>)}
            </select>
          </div>

          {/* Target Program */}
          <div>
            <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Target Program</div>
            <select className={selectClass} value={crafterParams.targetProgram} onChange={(e) => setCrafterParams({ targetProgram: e.target.value })}>
              {PLAYGROUND_PROGRAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Amount slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Amount (SOL)</span>
              <span className="font-mono text-teal-400">{crafterParams.amountSol.toFixed(1)}</span>
            </div>
            <input type="range" min={0} max={50} step={0.1} value={crafterParams.amountSol} onChange={(e) => setCrafterParams({ amountSol: Number(e.target.value) })} className="w-full accent-teal-500" />
          </div>

          {/* Velocity slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Velocity (tx/min)</span>
              <span className="font-mono text-teal-400">{crafterParams.velocityPerMin}</span>
            </div>
            <input type="range" min={1} max={10} step={1} value={crafterParams.velocityPerMin} onChange={(e) => setCrafterParams({ velocityPerMin: Number(e.target.value) })} className="w-full accent-teal-500" />
          </div>

          {/* Budget consumed slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Budget Consumed</span>
              <span className="font-mono text-teal-400">{crafterParams.budgetConsumedPercent}%</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={crafterParams.budgetConsumedPercent} onChange={(e) => setCrafterParams({ budgetConsumedPercent: Number(e.target.value) })} className="w-full accent-teal-500" />
          </div>

          {/* Session */}
          <div>
            <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Session Remaining</div>
            <select className={selectClass} value={crafterParams.sessionRemaining} onChange={(e) => setCrafterParams({ sessionRemaining: e.target.value as SessionRemainingBucket })}>
              {sessionOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/[0.1]">
              <input type="checkbox" className="accent-teal-500" checked={crafterParams.isProgramNew} onChange={(e) => setCrafterParams({ isProgramNew: e.target.checked })} />
              <span className="text-[12px] text-zinc-300">Treat target as new / uncommon</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/[0.1]">
              <input type="checkbox" className="accent-teal-500" checked={crafterParams.outsideActiveHours} onChange={(e) => setCrafterParams({ outsideActiveHours: e.target.checked })} />
              <span className="text-[12px] text-zinc-300">Outside active hours</span>
            </label>
          </div>

          {/* Run button */}
          <button
            type="button"
            disabled={crafterRunning}
            onClick={() => void runJudge()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/20 bg-teal-500/[0.06] py-2.5 text-[13px] font-semibold text-teal-400 transition-all hover:bg-teal-500/[0.12] disabled:opacity-50"
          >
            <Play size={14} />
            {crafterRunning ? "Running Guardian..." : "Run Guardian Judge"}
          </button>
          {crafterRunning && <PlaygroundProgressBar progress={crafterProgress} durationMs={150} />}
        </div>
      </div>

      {/* Output Pane */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Verdict Output</span>
          <span className="text-[10px] text-zinc-600"><span className="text-teal-500">Guardian</span> evaluation</span>
        </div>
        <div className="flex-1 p-5">
          <VerdictPanel result={crafterResult} latencyDisplay={crafterResult?.latencyMs ?? null} />
        </div>
      </div>
    </div>
  );
}
