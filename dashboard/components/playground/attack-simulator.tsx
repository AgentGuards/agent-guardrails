"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { POLICIES } from "@/lib/mock/policies";
import { mergeScenarioStep, SCENARIOS } from "@/lib/playground/scenarios";
import { runSimulation } from "@/lib/playground/engine";
import type { CrafterParams, PlaygroundPolicySlice, SimulationResult } from "@/lib/playground/types";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { PolicySummary } from "@/lib/types/dashboard";
import { usePlaygroundStore } from "@/lib/stores/playground";
import { StatusChip } from "@/components/dashboard-ui";
import { programLabel } from "@/lib/utils";

function resolvePolicies(remote: PolicySummary[] | undefined): PlaygroundPolicySlice[] {
  const list = remote?.length ? remote : POLICIES;
  return list.map((p) => ({
    pubkey: p.pubkey,
    maxTxLamports: p.maxTxLamports,
    dailyBudgetLamports: p.dailyBudgetLamports,
    allowedPrograms: p.allowedPrograms,
  }));
}

const STEP_DELAY_MS = 1600;

export function AttackSimulator() {
  const policiesQuery = usePoliciesQuery();
  const policies = useMemo(() => resolvePolicies(policiesQuery.data), [policiesQuery.data]);
  const crafterPolicyPubkey = usePlaygroundStore((s) => s.crafterParams.policyPubkey);
  const playback = usePlaygroundStore((s) => s.playback);
  const setPlayback = usePlaygroundStore((s) => s.setPlayback);

  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;

  const effectivePolicy =
    policies.find((p) => p.pubkey === crafterPolicyPubkey) ?? policies[0] ?? POLICIES[0];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stopPlayback = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlayback(null);
  };

  const runScenario = () => {
    stopPlayback();

    const base: CrafterParams = {
      ...mergeScenarioStep({}),
      policyPubkey: crafterPolicyPubkey ?? effectivePolicy.pubkey,
    };

    const runStep = (idx: number, acc: SimulationResult[], prev: CrafterParams) => {
      const stepPartial = scenario.steps[idx];
      if (stepPartial === undefined) {
        setPlayback({
          scenarioId: scenario.id,
          stepIndex: idx,
          stepResults: acc,
          isPlaying: false,
        });
        return;
      }

      const merged: CrafterParams = {
        ...prev,
        ...stepPartial,
        policyPubkey: prev.policyPubkey ?? effectivePolicy.pubkey,
      };

      const policy =
        policies.find((p) => p.pubkey === (merged.policyPubkey ?? effectivePolicy.pubkey)) ??
        effectivePolicy;

      const result = runSimulation(merged, policy);
      const nextAcc = [...acc, result];

      const done = idx + 1 >= scenario.steps.length;

      setPlayback({
        scenarioId: scenario.id,
        stepIndex: idx,
        stepResults: nextAcc,
        isPlaying: !done,
      });

      if (done) return;

      timerRef.current = setTimeout(() => runStep(idx + 1, nextAcc, merged), STEP_DELAY_MS);
    };

    runStep(0, [], base);
  };

  const replay = () => {
    stopPlayback();
    runScenario();
  };

  const results = playback?.scenarioId === scenario.id ? playback.stepResults : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="panel-glow rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold text-zinc-200">Attack simulator</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Scripted sequences stepped over ~{STEP_DELAY_MS / 1000}s. Uses the crafter policy selection when set.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="min-w-[200px] rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            value={scenarioId}
            onChange={(e) => {
              stopPlayback();
              setScenarioId(e.target.value);
            }}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" className="button button-primary px-4 py-2 text-xs" onClick={runScenario}>
            Play
          </button>
          <button type="button" className="button button-secondary px-4 py-2 text-xs" onClick={replay}>
            Replay
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-600">{scenario.description}</p>
      </div>

      <div className="flex flex-col gap-3">
        {results.map((r, i) => {
          const stepMerge = mergeScenarioStep(scenario.steps[i] ?? {});
          return (
            <div
              key={`${scenario.id}-${i}-${r.latencyMs}`}
              className="animate-[fade-in-up_220ms_ease-out] panel-glow rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">
                  Step {i + 1} / {scenario.steps.length}
                </span>
                <StatusChip tone={r.verdict === "allow" ? "green" : r.verdict === "flag" ? "amber" : "red"}>
                  {r.verdict.toUpperCase()}
                </StatusChip>
              </div>
              <h3 className="mt-2 text-sm font-medium text-zinc-200">
                {programLabel(stepMerge.targetProgram)}
                <span className="ml-2 font-normal text-zinc-500">
                  · {stepMerge.amountSol.toFixed(1)} SOL · {stepMerge.velocityPerMin} tx/min
                </span>
                <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                  score {Math.round(r.dangerScore)}
                </span>
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{r.reasoning}</p>
              {r.verdict === "pause" ? (
                <div className="mt-3 rounded-lg border border-red-900/40 bg-red-950/25 px-3 py-2 text-xs text-red-300">
                  Incident card (mock): autonomous pause engaged — synthetic report snippet would render here.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
