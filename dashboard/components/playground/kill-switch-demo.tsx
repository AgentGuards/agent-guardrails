"use client";

import { usePlaygroundStore } from "@/lib/stores/playground";

export function KillSwitchDemo() {
  const killSwitchState = usePlaygroundStore((s) => s.killSwitchState);
  const setKillSwitchState = usePlaygroundStore((s) => s.setKillSwitchState);

  const paused = killSwitchState === "paused";

  return (
    <div className="panel-glow rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="text-sm font-semibold text-zinc-200">Kill switch demo</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Lightweight state machine illustrating pause semantics — no chain transactions.
      </p>

      <div
        className={`mt-6 rounded-xl border px-5 py-8 transition-all duration-500 ${
          paused
            ? "border-red-500/40 bg-red-950/25 shadow-[0_0_24px_-8px_rgba(239,68,68,0.35)]"
            : "border-teal-500/25 bg-teal-950/15 shadow-[0_0_20px_-10px_rgba(45,212,191,0.25)]"
        }`}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
              paused ? "bg-red-500/20 text-red-300" : "bg-teal-500/20 text-teal-200"
            }`}
          >
            {paused ? "Paused" : "Active"}
          </span>

          <div className="font-mono text-sm text-zinc-400">
            [Active] —pause→ [Paused] —resume→ [Active]
          </div>

          {paused ? (
            <div className="max-w-md space-y-2 text-sm text-zinc-400">
              <p>Guarded executes return <span className="font-mono text-red-300">PolicyPaused</span>.</p>
              <p>An incident record is opened and an Opus-style report can be generated asynchronously.</p>
            </div>
          ) : (
            <p className="max-w-md text-sm text-zinc-400">
              Agent sessions within policy limits proceed through guarded execution as usual.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/[0.06]">
        <table className="w-full min-w-[280px] text-left text-xs text-zinc-400">
          <thead>
            <tr className="border-b border-white/[0.06] text-zinc-500">
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Pause</th>
              <th className="px-3 py-2 font-medium">Resume</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.04]">
              <td className="px-3 py-2 text-zinc-300">Owner</td>
              <td className="px-3 py-2 text-emerald-400">Yes</td>
              <td className="px-3 py-2 text-emerald-400">Yes</td>
            </tr>
            <tr className="border-b border-white/[0.04]">
              <td className="px-3 py-2 text-zinc-300">Monitor</td>
              <td className="px-3 py-2 text-emerald-400">Yes</td>
              <td className="px-3 py-2 text-zinc-500">No</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-zinc-300">Agent</td>
              <td className="px-3 py-2 text-zinc-500">No</td>
              <td className="px-3 py-2 text-zinc-500">No</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={paused}
          className="button button-primary px-4 py-2 text-xs disabled:opacity-40"
          onClick={() => setKillSwitchState("paused")}
        >
          Simulate Pause
        </button>
        <button
          type="button"
          disabled={!paused}
          className="button button-secondary px-4 py-2 text-xs disabled:opacity-40"
          onClick={() => setKillSwitchState("active")}
        >
          Simulate Resume
        </button>
      </div>
    </div>
  );
}
