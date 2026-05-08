"use client";

import type { SimulationResult } from "@/lib/playground/types";
import { Play, Check, AlertTriangle, ShieldOff } from "lucide-react";
import { DangerGauge } from "./danger-gauge";

function verdictConfig(v: SimulationResult["verdict"]) {
  if (v === "allow") return { label: "Allowed", color: "teal", icon: Check, bannerClass: "border-teal-500/20 bg-teal-500/[0.06]", iconBg: "bg-teal-500/15 text-teal-400", labelClass: "text-teal-400", barColor: "bg-teal-500" };
  if (v === "flag") return { label: "Flagged", color: "amber", icon: AlertTriangle, bannerClass: "border-amber-500/20 bg-amber-500/[0.06]", iconBg: "bg-amber-500/15 text-amber-400", labelClass: "text-amber-400", barColor: "bg-amber-500" };
  return { label: "Paused", color: "red", icon: ShieldOff, bannerClass: "border-red-500/20 bg-red-500/[0.06]", iconBg: "bg-red-500/15 text-red-400", labelClass: "text-red-400", barColor: "bg-red-500" };
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
      <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
          <Play size={18} className="text-zinc-500" />
        </div>
        <p className="text-[13px] font-medium text-zinc-500">Run a simulation to see verdict output</p>
        <p className="max-w-[200px] text-[11px] text-zinc-600">Configure parameters and click Run Guardian Judge</p>
      </div>
    );
  }

  const vc = verdictConfig(result.verdict);
  const Icon = vc.icon;

  return (
    <div className="flex flex-col gap-4" style={{ animation: "fade-in-up 0.3s ease-out" }}>
      {/* Verdict banner */}
      <div className={`flex items-center gap-3 rounded-lg border p-4 ${vc.bannerClass}`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${vc.iconBg}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div>
          <div className={`text-[16px] font-bold uppercase tracking-wider ${vc.labelClass}`}>{vc.label}</div>
          <div className="font-mono text-[10px] text-zinc-500">Confidence: {result.confidence}%</div>
        </div>
      </div>

      {/* Danger gauge */}
      <DangerGauge score={result.dangerScore} />

      {/* Confidence bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Confidence</span>
          <span className="font-mono">{result.confidence}%</span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-zinc-800">
          <div className={`h-full rounded-full transition-all duration-500 ${vc.barColor}`} style={{ width: `${result.confidence}%` }} />
        </div>
      </div>

      {/* Reasoning */}
      <div className="rounded-md border border-white/[0.04] bg-black/30 px-3.5 py-3">
        <p className="text-[12px] leading-relaxed text-zinc-300">{result.reasoning}</p>
      </div>

      {/* Active signals */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Active Signals</div>
        {result.signals.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {result.signals.map((s) => (
              <span key={s} className="rounded bg-zinc-800/80 border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-zinc-400">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] italic text-zinc-600">No signals triggered</p>
        )}
      </div>

      {/* Prefilter status */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${result.prefilterSkipped ? "bg-teal-500 shadow-[0_0_6px_rgba(0,255,209,0.4)]" : "bg-amber-500 shadow-[0_0_6px_rgba(240,160,48,0.4)]"}`} />
        {result.prefilterSkipped ? (
          <span>Prefilter skipped <span className="font-semibold text-teal-400">Guardian</span> — safe path</span>
        ) : (
          <span><span className="font-semibold text-teal-400">Guardian</span> judge invoked</span>
        )}
        {latencyDisplay != null && <span className="ml-auto font-mono text-[10px] text-zinc-600">~{latencyDisplay}ms</span>}
      </div>
    </div>
  );
}
