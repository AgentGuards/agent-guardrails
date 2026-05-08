"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, Shield, Zap, Clock, TrendingUp, Activity, AlertTriangle } from "lucide-react";
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
  return list.map((p) => ({ pubkey: p.pubkey, maxTxLamports: p.maxTxLamports, dailyBudgetLamports: p.dailyBudgetLamports, allowedPrograms: p.allowedPrograms }));
}

const STEP_DELAY_MS = 1600;

const SCENARIO_ICONS: Record<string, { icon: typeof Shield; color: string }> = {
  "normal-trade": { icon: Shield, color: "text-teal-400" },
  "high-value-single": { icon: AlertTriangle, color: "text-amber-400" },
  "gradual-drain": { icon: TrendingUp, color: "text-red-400" },
  "burst-attack": { icon: Zap, color: "text-red-400" },
  "off-hours": { icon: Clock, color: "text-amber-400" },
  "budget-exhaustion": { icon: Activity, color: "text-amber-400" },
};

export function AttackSimulator() {
  const policiesQuery = usePoliciesQuery();
  const policies = useMemo(() => resolvePolicies(policiesQuery.data), [policiesQuery.data]);
  const crafterPolicyPubkey = usePlaygroundStore((s) => s.crafterParams.policyPubkey);
  const playback = usePlaygroundStore((s) => s.playback);
  const setPlayback = usePlaygroundStore((s) => s.setPlayback);

  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;
  const effectivePolicy = policies.find((p) => p.pubkey === crafterPolicyPubkey) ?? policies[0] ?? POLICIES[0];

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  const stopPlayback = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; setPlayback(null); };

  const runScenario = () => {
    stopPlayback();
    const base: CrafterParams = { ...mergeScenarioStep({}), policyPubkey: crafterPolicyPubkey ?? effectivePolicy.pubkey };
    const runStep = (idx: number, acc: SimulationResult[], prev: CrafterParams) => {
      const stepPartial = scenario.steps[idx];
      if (stepPartial === undefined) { setPlayback({ scenarioId: scenario.id, stepIndex: idx, stepResults: acc, isPlaying: false }); return; }
      const merged: CrafterParams = { ...prev, ...stepPartial, policyPubkey: prev.policyPubkey ?? effectivePolicy.pubkey };
      const policy = policies.find((p) => p.pubkey === (merged.policyPubkey ?? effectivePolicy.pubkey)) ?? effectivePolicy;
      const result = runSimulation(merged, policy);
      const nextAcc = [...acc, result];
      const done = idx + 1 >= scenario.steps.length;
      setPlayback({ scenarioId: scenario.id, stepIndex: idx, stepResults: nextAcc, isPlaying: !done });
      if (!done) timerRef.current = setTimeout(() => runStep(idx + 1, nextAcc, merged), STEP_DELAY_MS);
    };
    runStep(0, [], base);
  };

  const results = playback?.scenarioId === scenario.id ? playback.stepResults : [];

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Attack Scenarios</div>

      {/* Scenario cards grid */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
        {SCENARIOS.map((s) => {
          const active = scenarioId === s.id;
          const iconConf = SCENARIO_ICONS[s.id] ?? { icon: Shield, color: "text-zinc-500" };
          const Icon = iconConf.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => { stopPlayback(); setScenarioId(s.id); }}
              className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all ${
                active
                  ? "border-teal-500/20 bg-teal-500/[0.05]"
                  : "border-[#1e1e22] bg-transparent hover:border-zinc-600 hover:bg-white/[0.02]"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${active ? "bg-teal-500/10" : "bg-white/[0.04]"}`}>
                <Icon size={15} className={active ? "text-teal-400" : iconConf.color} />
              </div>
              <div className="min-w-0">
                <div className={`text-[12px] font-semibold ${active ? "text-zinc-100" : "text-zinc-400"}`}>{s.name}</div>
                <div className="text-[10px] text-zinc-600">{s.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Play buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={runScenario}
          className="flex items-center gap-1.5 rounded-md border border-teal-500/20 bg-teal-500/[0.06] px-4 py-2 text-[12px] font-semibold text-teal-400 transition-all hover:bg-teal-500/[0.12]"
        >
          <Play size={13} /> Play
        </button>
        <button
          type="button"
          onClick={() => { stopPlayback(); runScenario(); }}
          className="flex items-center gap-1.5 rounded-md border border-[#1e1e22] px-4 py-2 text-[12px] font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-white/[0.03]"
        >
          <RotateCcw size={13} /> Replay
        </button>
      </div>

      {/* Step results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {results.map((r, i) => {
            const stepMerge = mergeScenarioStep(scenario.steps[i] ?? {});
            return (
              <div
                key={`${scenario.id}-${i}-${r.latencyMs}`}
                className="rounded-lg border border-[#1e1e22] bg-[#111113] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                style={{ animation: "fade-in-up 0.3s ease-out" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-500">Step {i + 1} / {scenario.steps.length}</span>
                  <StatusChip tone={r.verdict === "allow" ? "green" : r.verdict === "flag" ? "amber" : "red"}>
                    {r.verdict.toUpperCase()}
                  </StatusChip>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px] font-medium text-zinc-200">
                  {programLabel(stepMerge.targetProgram)}
                  <span className="text-zinc-500">· {stepMerge.amountSol.toFixed(1)} SOL · {stepMerge.velocityPerMin} tx/min</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">score {Math.round(r.dangerScore)}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{r.reasoning}</p>
                {r.verdict === "pause" && (
                  <div className="mt-2.5 rounded-md border border-red-500/20 bg-red-500/[0.05] px-3 py-2 text-[11px] text-red-300">
                    Incident: autonomous pause engaged — synthetic report would render here.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
