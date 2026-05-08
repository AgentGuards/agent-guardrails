"use client";

import { useMemo } from "react";
import { SIGNAL_WEIGHTS } from "@/lib/playground/constants";
import { computeDangerScore, determineVerdict, generateReasoning, simulateLatency } from "@/lib/playground/engine";
import type { PrefilterSignal, SimulationResult } from "@/lib/playground/types";
import { usePlaygroundStore, inspectorSignalsToList } from "@/lib/stores/playground";
import { VerdictPanel } from "./verdict-panel";

const ORDER: PrefilterSignal[] = [
  "burst_detected", "elevated_frequency", "high_amount", "budget_nearly_exhausted",
  "new_or_uncommon_program", "outside_active_hours", "session_expiring_soon",
];

export function SignalInspector() {
  const inspectorSignals = usePlaygroundStore((s) => s.inspectorSignals);
  const toggleInspectorSignal = usePlaygroundStore((s) => s.toggleInspectorSignal);
  const resetInspector = usePlaygroundStore((s) => s.resetInspector);

  const activeSignals = inspectorSignalsToList(inspectorSignals);

  const result: SimulationResult | null = useMemo(() => {
    const signals = inspectorSignalsToList(inspectorSignals);
    const dangerScore = computeDangerScore(signals);
    const { verdict, confidence } = determineVerdict(signals, dangerScore, "gt24h");
    const prefilterSkipped = signals.length === 0;
    const reasoning = prefilterSkipped
      ? "Prefilter skipped the Guardian judge — no anomaly signals matched configured thresholds."
      : generateReasoning(signals, verdict);
    return { signals, dangerScore, verdict, confidence, reasoning, prefilterSkipped, latencyMs: simulateLatency(), model: "guardian" };
  }, [inspectorSignals]);

  const activeWeightSum = activeSignals.reduce((sum, sig) => sum + SIGNAL_WEIGHTS[sig], 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Signal toggles pane */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Signal Toggles</span>
          <button
            type="button"
            onClick={resetInspector}
            className="rounded-md border border-white/[0.08] bg-transparent px-2.5 py-1 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
          >
            Reset All
          </button>
        </div>
        <div className="flex-1 space-y-1.5 p-5">
          {ORDER.map((sig) => {
            const active = inspectorSignals[sig];
            return (
              <label
                key={sig}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-3.5 py-2.5 transition-all ${
                  active
                    ? "border-teal-500/20 bg-teal-500/[0.05]"
                    : "border-white/[0.05] bg-black/20 hover:border-white/[0.1]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="h-[15px] w-[15px] accent-teal-500"
                    checked={active}
                    onChange={() => toggleInspectorSignal(sig)}
                  />
                  <span className={`font-mono text-[12px] ${active ? "text-zinc-200" : "text-zinc-400"}`}>{sig}</span>
                </div>
                <span className="rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                  w{SIGNAL_WEIGHTS[sig]}
                </span>
              </label>
            );
          })}

          {/* Formula display */}
          <div className="mt-3 rounded-md border border-white/[0.04] bg-black/25 px-3.5 py-3">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Danger Score Formula</div>
            <div className="font-mono text-[12px] text-zinc-400">
              score ={" "}
              {activeSignals.length === 0 ? (
                <span className="text-zinc-600">0 (no signals)</span>
              ) : (
                <>
                  {activeSignals.map((sig, i) => (
                    <span key={sig}>
                      {i > 0 && " + "}
                      <span className="text-teal-400">{SIGNAL_WEIGHTS[sig]}</span>
                    </span>
                  ))}
                  {" = "}
                  <span className={`font-bold ${activeWeightSum <= 30 ? "text-teal-400" : activeWeightSum <= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {activeWeightSum}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live verdict pane */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Live Verdict</span>
          <span className="text-[10px] text-zinc-600">Updates as signals toggle</span>
        </div>
        <div className="flex-1 p-5">
          <VerdictPanel result={result} latencyDisplay={null} />
        </div>
      </div>
    </div>
  );
}
