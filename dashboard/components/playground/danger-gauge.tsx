"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

export function DangerGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const fill =
    clamped <= 30 ? "hsl(var(--teal))" : clamped <= 50 ? "hsl(var(--amber))" : "hsl(var(--crimson))";

  return (
    <div className="mx-auto w-full max-w-[240px]">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          innerRadius="68%"
          outerRadius="100%"
          barSize={14}
          data={[{ value: clamped, fill }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="-mt-[118px] text-center">
        <div className="text-3xl font-bold tabular-nums text-zinc-50">{Math.round(clamped)}</div>
        <div className="text-xs text-zinc-500">danger score</div>
      </div>
    </div>
  );
}
