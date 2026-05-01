"use client";

import { useMemo } from "react";
import { POLICIES } from "@/lib/mock/policies";
import { runSimulation } from "@/lib/playground/engine";
import type { CrafterParams, PlaygroundPolicySlice } from "@/lib/playground/types";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { PolicySummary } from "@/lib/types/dashboard";
import { usePlaygroundStore } from "@/lib/stores/playground";
import { formatSol } from "@/lib/utils";
import { VerdictPanel } from "./verdict-panel";

function resolvePolicies(remote: PolicySummary[] | undefined): PlaygroundPolicySlice[] {
  const list = remote?.length ? remote : POLICIES;
  return list.map((p) => ({
    pubkey: p.pubkey,
    maxTxLamports: p.maxTxLamports,
    dailyBudgetLamports: p.dailyBudgetLamports,
    allowedPrograms: p.allowedPrograms,
  }));
}

export function PolicySandbox() {
  const policiesQuery = usePoliciesQuery();
  const policies = useMemo(() => resolvePolicies(policiesQuery.data), [policiesQuery.data]);
  const crafterParams = usePlaygroundStore((s) => s.crafterParams);
  const sandboxOverrides = usePlaygroundStore((s) => s.sandboxOverrides);
  const setSandboxOverrides = usePlaygroundStore((s) => s.setSandboxOverrides);

  const basePolicy =
    policies.find((p) => p.pubkey === crafterParams.policyPubkey) ?? policies[0] ?? POLICIES[0];

  const baselinePolicy: PlaygroundPolicySlice = basePolicy;

  const tweakedPolicy: PlaygroundPolicySlice = {
    ...baselinePolicy,
    maxTxLamports: String(Math.round(sandboxOverrides.maxTxSol * 1e9)),
    dailyBudgetLamports: String(Math.round(sandboxOverrides.dailyBudgetSol * 1e9)),
  };

  const txnParams: CrafterParams = {
    ...crafterParams,
    policyPubkey: baselinePolicy.pubkey,
  };

  const baselineResult = useMemo(
    () => runSimulation(txnParams, baselinePolicy),
    [
      baselinePolicy.pubkey,
      baselinePolicy.maxTxLamports,
      baselinePolicy.dailyBudgetLamports,
      baselinePolicy.allowedPrograms.join(","),
      crafterParams.amountSol,
      crafterParams.velocityPerMin,
      crafterParams.budgetConsumedPercent,
      crafterParams.sessionRemaining,
      crafterParams.targetProgram,
      crafterParams.isProgramNew,
      crafterParams.outsideActiveHours,
    ],
  );

  const tweakedResult = useMemo(
    () => runSimulation(txnParams, tweakedPolicy),
    [
      tweakedPolicy.pubkey,
      tweakedPolicy.maxTxLamports,
      tweakedPolicy.dailyBudgetLamports,
      tweakedPolicy.allowedPrograms.join(","),
      crafterParams.amountSol,
      crafterParams.velocityPerMin,
      crafterParams.budgetConsumedPercent,
      crafterParams.sessionRemaining,
      crafterParams.targetProgram,
      crafterParams.isProgramNew,
      crafterParams.outsideActiveHours,
    ],
  );

  const verdictChanged = baselineResult.verdict !== tweakedResult.verdict;

  return (
    <div className="flex flex-col gap-6">
      <div className="panel-glow rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold text-zinc-200">Policy sandbox</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Same simulated transaction as the crafter tab against live policy caps vs adjusted caps — purely hypothetical.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs text-zinc-400">
            Per-tx cap (SOL)
            <input
              type="range"
              min={1}
              max={80}
              step={1}
              value={sandboxOverrides.maxTxSol}
              onChange={(e) => setSandboxOverrides({ maxTxSol: Number(e.target.value) })}
              className="accent-teal-500"
            />
            <span className="font-mono text-zinc-300">{sandboxOverrides.maxTxSol} SOL</span>
          </label>
          <label className="flex flex-col gap-2 text-xs text-zinc-400">
            Daily budget (SOL)
            <input
              type="range"
              min={5}
              max={600}
              step={5}
              value={sandboxOverrides.dailyBudgetSol}
              onChange={(e) => setSandboxOverrides({ dailyBudgetSol: Number(e.target.value) })}
              className="accent-teal-500"
            />
            <span className="font-mono text-zinc-300">{sandboxOverrides.dailyBudgetSol} SOL</span>
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-xs text-zinc-500">
          Baseline caps from chain/API mirror:{" "}
          <span className="font-mono text-zinc-400">
            {formatSol(baselinePolicy.maxTxLamports)} tx / {formatSol(baselinePolicy.dailyBudgetLamports)} day
          </span>
          {verdictChanged ? (
            <span className="mt-2 block text-amber-400/90">
              Verdict differs under tweaked caps ({baselineResult.verdict} → {tweakedResult.verdict}).
            </span>
          ) : (
            <span className="mt-2 block text-zinc-600">Verdict unchanged for this hypothetical tweak.</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
            Current policy mirror
          </p>
          <VerdictPanel result={baselineResult} latencyDisplay={null} />
        </div>
        <div>
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
            Sandbox caps
          </p>
          <VerdictPanel result={tweakedResult} latencyDisplay={null} />
        </div>
      </div>
    </div>
  );
}
