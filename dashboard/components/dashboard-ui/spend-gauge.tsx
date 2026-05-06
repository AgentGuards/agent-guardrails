import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { lamportsToSol } from "@/lib/utils";

export function SpendGauge({
  spentLamports,
  budgetLamports,
  size = 220,
}: {
  spentLamports: string;
  budgetLamports: string;
  size?: number;
}) {
  const spent = lamportsToSol(spentLamports);
  const budget = lamportsToSol(budgetLamports);
  const ratio = budget === 0 ? 0 : (spent / budget) * 100;
  const clampedRatio = Math.min(ratio, 100);
  const tone = ratio >= 90 ? "hsl(var(--crimson))" : ratio >= 66 ? "hsl(var(--amber))" : "hsl(var(--teal))";

  if (budget <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 py-8 px-4 text-center text-sm text-muted-foreground transition-colors duration-200" style={{ marginTop: 12 }}>
        No budget set.
      </div>
    );
  }

  const isCompact = size < 180;
  const valueClass = isCompact ? "text-base font-semibold" : "text-2xl font-bold";
  const labelClass = isCompact ? "text-[10px]" : "text-sm";

  return (
    <div className="relative max-w-full" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          barSize={isCompact ? 12 : 18}
          data={[{ value: clampedRatio, fill: tone }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background dataKey="value" cornerRadius={16} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center leading-tight">
        {ratio > 100 ? (
          <>
            <div className={`${valueClass} tabular-nums text-crimson-500`}>OVER</div>
            <div className={`${labelClass} text-muted-foreground tabular-nums`}>
              {spent.toFixed(1)} / {budget.toFixed(1)} SOL
            </div>
          </>
        ) : (
          <>
            <div className={`${valueClass} tabular-nums text-foreground`}>
              {spent.toFixed(1)}
              <span className={`ml-1 ${isCompact ? "text-[10px]" : "text-xs"} font-medium text-muted-foreground`}>
                SOL
              </span>
            </div>
            <div className={`${labelClass} tabular-nums text-muted-foreground`}>
              of {budget.toFixed(1)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
