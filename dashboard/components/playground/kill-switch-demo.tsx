"use client";

import { usePlaygroundStore } from "@/lib/stores/playground";

export function KillSwitchDemo() {
  const killSwitchState = usePlaygroundStore((s) => s.killSwitchState);
  const setKillSwitchState = usePlaygroundStore((s) => s.setKillSwitchState);
  const paused = killSwitchState === "paused";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Kill Switch Demo</span>
        <span className="text-[10px] text-zinc-600">Interactive state machine</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        {/* State card */}
        <div
          className={`w-full max-w-[300px] rounded-xl border-2 px-6 py-8 text-center transition-all duration-500 ${
            paused
              ? "border-red-500/30 bg-red-950/[0.08] shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]"
              : "border-teal-500/25 bg-teal-950/[0.06] shadow-[0_0_30px_-10px_rgba(0,255,209,0.15)]"
          }`}
        >
          <span className={`inline-flex rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
            paused ? "bg-red-500/15 text-red-300" : "bg-teal-500/15 text-teal-300"
          }`}>
            {paused ? "Paused" : "Active"}
          </span>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-400">
            {paused
              ? "Guarded executes return PolicyPaused. Incident record opened."
              : "Sessions within limits proceed through guarded execution."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {paused ? (
              <button
                type="button"
                onClick={() => setKillSwitchState("active")}
                className="rounded-md border border-teal-500/20 bg-teal-500/[0.06] px-5 py-2 text-[12px] font-semibold text-teal-400 transition-all hover:bg-teal-500/[0.12]"
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setKillSwitchState("paused")}
                className="rounded-md border border-red-500/20 bg-red-500/[0.06] px-5 py-2 text-[12px] font-semibold text-red-300 transition-all hover:bg-red-500/[0.12]"
              >
                Pause
              </button>
            )}
          </div>
        </div>

        {/* Permission table */}
        <div className="w-full max-w-[340px]">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Permissions</div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Role</th>
                <th className="py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Pause</th>
                <th className="py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Resume</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 text-zinc-300">Owner</td>
                <td className="py-2 font-semibold text-teal-400">Yes</td>
                <td className="py-2 font-semibold text-teal-400">Yes</td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 text-zinc-300">Monitor</td>
                <td className="py-2 font-semibold text-teal-400">Yes</td>
                <td className="py-2 text-zinc-600">No</td>
              </tr>
              <tr>
                <td className="py-2 text-zinc-300">Agent</td>
                <td className="py-2 text-zinc-600">No</td>
                <td className="py-2 text-zinc-600">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
