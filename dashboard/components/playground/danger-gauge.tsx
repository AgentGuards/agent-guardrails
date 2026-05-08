"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

export function DangerGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const fill =
    clamped <= 30 ? "hsl(var(--teal))" : clamped <= 50 ? "hsl(var(--amber))" : "hsl(var(--crimson))";

  return (
    <div className="relative mx-auto w-full max-w-[200px]">
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart
          innerRadius="68%"
          outerRadius="100%"
          barSize={12}
          data={[{ value: clamped, fill }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tabular-nums text-zinc-50">{Math.round(clamped)}</div>
        <div className="text-[10px] text-zinc-500">danger</div>
      </div>
    </div>
  );
}
