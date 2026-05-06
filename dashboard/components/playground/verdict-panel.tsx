"use client";

import { StatusChip } from "@/components/dashboard-ui";
import type { SimulationResult } from "@/lib/playground/types";
import { Play } from "lucide-react";
import { DangerGauge } from "./danger-gauge";

function verdictTone(v: SimulationResult["verdict"]): "green" | "amber" | "red" {
  if (v === "allow") return "green";
  if (v === "flag") return "amber";
  return "red";
}

export function VerdictPanel({
  result,
  latencyDisplay,
}: {
  result: SimulationResult | null;
  latencyDisplay?: number | null;
}) {
  if (!result) {
    return (
      <div className="relative">
        <div className="panel-glow absolute inset-0 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
              <Play className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500">Run a simulation to see verdict output</p>
            <p className="max-w-[180px] text-xs text-zinc-600">
              Configure parameters on the left and click Run Judge
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="panel-glow absolute inset-0 flex flex-col gap-5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Verdict</span>
          <StatusChip tone={verdictTone(result.verdict)}>{result.verdict.toUpperCase()}</StatusChip>
          <span className="text-xs text-zinc-500">
            Model · <span className="font-mono text-zinc-400">{result.model}</span>
          </span>
        </div>
        <DangerGauge score={result.dangerScore} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>Confidence</span>
          <span className="font-mono text-zinc-300">{result.confidence}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-teal-500/80 transition-all duration-300"
            style={{ width: `${result.confidence}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm leading-relaxed text-zinc-300">
        {result.reasoning}
      </div>

      <div className="text-xs text-zinc-500">
        Prefilter:{" "}
        {result.prefilterSkipped ? (
          <span className="text-emerald-400/90">skipped LLM — safe path</span>
        ) : (
          <span className="text-amber-400/90">judge invoked</span>
        )}
        {latencyDisplay != null ? (
          <>
            {" "}
            · Simulated latency{" "}
            <span className="font-mono text-zinc-400">{latencyDisplay}ms</span>
          </>
        ) : null}
      </div>

      {result.signals.length > 0 ? (
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active signals</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.signals.map((s) => (
              <li
                key={s}
                className="rounded-md bg-zinc-800/80 px-2 py-1 font-mono text-[11px] text-zinc-300"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-zinc-600">No anomaly signals for this run.</p>
      )}
      </div>
    </div>
  );
}
