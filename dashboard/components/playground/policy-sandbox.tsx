"use client";

import { useMemo } from "react";
import { POLICIES } from "@/lib/mock/policies";
import { runSimulation } from "@/lib/playground/engine";
import type { CrafterParams, PlaygroundPolicySlice } from "@/lib/playground/types";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { PolicySummary } from "@/lib/types/dashboard";
import { usePlaygroundStore } from "@/lib/stores/playground";
import { formatSol } from "@/lib/utils";

function resolvePolicies(remote: PolicySummary[] | undefined): PlaygroundPolicySlice[] {
  const list = remote?.length ? remote : POLICIES;
  return list.map((p) => ({ pubkey: p.pubkey, maxTxLamports: p.maxTxLamports, dailyBudgetLamports: p.dailyBudgetLamports, allowedPrograms: p.allowedPrograms }));
}

function verdictColor(v: string): string {
  if (v === "allow") return "text-teal-400";
  if (v === "flag") return "text-amber-400";
  return "text-red-400";
}

export function PolicySandbox() {
  const policiesQuery = usePoliciesQuery();
  const policies = useMemo(() => resolvePolicies(policiesQuery.data), [policiesQuery.data]);
  const crafterParams = usePlaygroundStore((s) => s.crafterParams);
  const sandboxOverrides = usePlaygroundStore((s) => s.sandboxOverrides);
  const setSandboxOverrides = usePlaygroundStore((s) => s.setSandboxOverrides);

  const basePolicy = policies.find((p) => p.pubkey === crafterParams.policyPubkey) ?? policies[0] ?? POLICIES[0];
  const tweakedPolicy: PlaygroundPolicySlice = {
    ...basePolicy,
    maxTxLamports: String(Math.round(sandboxOverrides.maxTxSol * 1e9)),
    dailyBudgetLamports: String(Math.round(sandboxOverrides.dailyBudgetSol * 1e9)),
  };
  const txnParams: CrafterParams = { ...crafterParams, policyPubkey: basePolicy.pubkey };

  const baselineResult = useMemo(
    () => runSimulation(txnParams, basePolicy),
    [basePolicy.pubkey, basePolicy.maxTxLamports, basePolicy.dailyBudgetLamports, basePolicy.allowedPrograms.join(","), crafterParams.amountSol, crafterParams.velocityPerMin, crafterParams.budgetConsumedPercent, crafterParams.sessionRemaining, crafterParams.targetProgram, crafterParams.isProgramNew, crafterParams.outsideActiveHours],
  );
  const tweakedResult = useMemo(
    () => runSimulation(txnParams, tweakedPolicy),
    [tweakedPolicy.pubkey, tweakedPolicy.maxTxLamports, tweakedPolicy.dailyBudgetLamports, tweakedPolicy.allowedPrograms.join(","), crafterParams.amountSol, crafterParams.velocityPerMin, crafterParams.budgetConsumedPercent, crafterParams.sessionRemaining, crafterParams.targetProgram, crafterParams.isProgramNew, crafterParams.outsideActiveHours],
  );

  const verdictChanged = baselineResult.verdict !== tweakedResult.verdict;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Policy Sandbox</span>
        <span className="text-[10px] text-zinc-600">What-if analysis</span>
      </div>
      <div className="flex-1 p-5">
        <p className="mb-4 text-[12px] text-zinc-500">Adjust policy limits and compare how the same transaction would be judged.</p>

        {/* Sliders */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Per-Tx Cap (SOL)</span>
              <span className="font-mono text-teal-400">{sandboxOverrides.maxTxSol}</span>
            </div>
            <input type="range" min={1} max={80} step={1} value={sandboxOverrides.maxTxSol} onChange={(e) => setSandboxOverrides({ maxTxSol: Number(e.target.value) })} className="w-full accent-teal-500" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Daily Budget (SOL)</span>
              <span className="font-mono text-teal-400">{sandboxOverrides.dailyBudgetSol}</span>
            </div>
            <input type="range" min={5} max={600} step={5} value={sandboxOverrides.dailyBudgetSol} onChange={(e) => setSandboxOverrides({ dailyBudgetSol: Number(e.target.value) })} className="w-full accent-teal-500" />
          </div>
        </div>

        {/* Baseline info */}
        <div className="mb-4 rounded-md border border-white/[0.04] bg-black/25 px-3 py-2 text-[11px] text-zinc-500">
          Chain mirror: <span className="font-mono text-zinc-400">{formatSol(basePolicy.maxTxLamports)} SOL tx / {formatSol(basePolicy.dailyBudgetLamports)} SOL day</span>
          {verdictChanged && (
            <span className="mt-1 block text-amber-400">Verdict differs: {baselineResult.verdict} → {tweakedResult.verdict}</span>
          )}
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg border p-4 text-center ${verdictChanged ? "border-white/[0.06]" : "border-white/[0.06]"}`}>
            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Current Policy</div>
            <div className={`text-[16px] font-bold uppercase ${verdictColor(baselineResult.verdict)}`}>{baselineResult.verdict}</div>
            <div className="mt-1 font-mono text-[10px] text-zinc-500">score: {Math.round(baselineResult.dangerScore)}</div>
          </div>
          <div className={`rounded-lg border p-4 text-center ${verdictChanged ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-white/[0.06]"}`}>
            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Sandbox Override</div>
            <div className={`text-[16px] font-bold uppercase ${verdictColor(tweakedResult.verdict)}`}>{tweakedResult.verdict}</div>
            <div className="mt-1 font-mono text-[10px] text-zinc-500">score: {Math.round(tweakedResult.dangerScore)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
