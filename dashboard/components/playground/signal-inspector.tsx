"use client";

import { useMemo } from "react";
import { SIGNAL_WEIGHTS } from "@/lib/playground/constants";
import {
  computeDangerScore,
  determineVerdict,
  generateReasoning,
  simulateLatency,
} from "@/lib/playground/engine";
import type { PrefilterSignal, SimulationResult } from "@/lib/playground/types";
import { usePlaygroundStore, inspectorSignalsToList } from "@/lib/stores/playground";
import { VerdictPanel } from "./verdict-panel";

const ORDER: PrefilterSignal[] = [
  "burst_detected",
  "elevated_frequency",
  "high_amount",
  "budget_nearly_exhausted",
  "new_or_uncommon_program",
  "outside_active_hours",
  "session_expiring_soon",
];

export function SignalInspector() {
  const inspectorSignals = usePlaygroundStore((s) => s.inspectorSignals);
  const toggleInspectorSignal = usePlaygroundStore((s) => s.toggleInspectorSignal);
  const resetInspector = usePlaygroundStore((s) => s.resetInspector);

  const result: SimulationResult | null = useMemo(() => {
    const signals = inspectorSignalsToList(inspectorSignals);
    const dangerScore = computeDangerScore(signals);
    const sessionRemaining = "gt24h";
    const { verdict, confidence } = determineVerdict(signals, dangerScore, sessionRemaining);
    const prefilterSkipped = signals.length === 0;
    const reasoning = prefilterSkipped
      ? "Prefilter skipped the LLM judge — no anomaly signals matched configured thresholds."
      : generateReasoning(signals, verdict);

    return {
      signals,
      dangerScore,
      verdict,
      confidence,
      reasoning,
      prefilterSkipped,
      latencyMs: simulateLatency(),
      model: "guardian",
    };
  }, [inspectorSignals]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      <div className="panel-glow rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Signal inspector</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Toggle synthetic signals — weights sum into the danger score (session assumed healthy).
            </p>
          </div>
          <button type="button" className="button button-secondary px-3 py-1 text-xs" onClick={resetInspector}>
            Reset
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {ORDER.map((sig) => (
            <li
              key={sig}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
            >
              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-zinc-900"
                  checked={inspectorSignals[sig]}
                  onChange={() => toggleInspectorSignal(sig)}
                />
                <span className="font-mono text-xs">{sig}</span>
              </label>
              <span className="shrink-0 font-mono text-xs text-zinc-500">w{SIGNAL_WEIGHTS[sig]}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-zinc-600">
          Override rules still apply when combining burst + high amount (forced pause). Danger bands: 0–30 allow bias,
          31–50 flag, 51+ pause unless refined by overrides.
        </p>
      </div>

      <VerdictPanel result={result} latencyDisplay={null} />
    </div>
  );
}
