import type { ReactNode } from "react";

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 panel-glow">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-100 md:text-[1.35rem]">
        {value}
      </div>
    </div>
  );
}
