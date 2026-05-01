import type { ReactNode } from "react";

export function StatusChip({ tone, children }: { tone: "green" | "amber" | "red"; children: ReactNode }) {
  const toneClasses = {
    green: "bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-teal-500/10",
    amber: "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-amber-500/10",
    red: "bg-red-500/15 text-red-400 border border-red-500/30 shadow-red-500/10",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${toneClasses[tone]}`}>{children}</span>;
}
