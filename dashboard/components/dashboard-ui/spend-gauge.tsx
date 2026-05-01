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

  return (
    <div className="max-w-full" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          barSize={18}
          data={[{ value: clampedRatio, fill: tone }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background dataKey="value" cornerRadius={16} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: Math.round(-(size * 0.58)), textAlign: "center" }}>
        {ratio > 100 ? (
          <>
            <div className="text-2xl font-bold text-crimson-500">
              OVER BUDGET
            </div>
            <div className="text-sm text-muted-foreground">
              {spent.toFixed(1)} / {budget.toFixed(1)} SOL
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">{spent.toFixed(1)} SOL</div>
            <div className="text-sm text-muted-foreground">of {budget.toFixed(1)} SOL budget</div>
          </>
        )}
      </div>
    </div>
  );
}
