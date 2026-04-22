"use client"

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts"
import { lamportsToSol, spendPercent } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface SpendGaugeProps {
  dailySpentLamports: string
  dailyBudgetLamports: string
}

export function SpendGauge({ dailySpentLamports, dailyBudgetLamports }: SpendGaugeProps) {
  const spent = lamportsToSol(dailySpentLamports)
  const budget = lamportsToSol(dailyBudgetLamports)

  if (budget === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No budget set
      </div>
    )
  }

  const pct = spendPercent(dailySpentLamports, dailyBudgetLamports)
  const fill = pct >= 90 ? "#ef4444" : pct >= 66 ? "#f59e0b" : "#10b981"
  const overBudget = pct > 100
  const displayPct = Math.min(pct, 100)

  const pctTextClass = pct >= 90 ? "text-red-400" : pct >= 66 ? "text-amber-400" : "text-emerald-400"

  const data = [{ name: "spend", value: displayPct }]

  return (
    <div className="relative">
      <div className={cn(
        "relative",
        overBudget && "ring-2 ring-red-500/50 ring-offset-2 ring-offset-background rounded-full animate-pulse"
      )}>
        <ResponsiveContainer width="100%" height={180}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            barSize={14}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: "hsl(217.2, 32.6%, 25%)" }}
              dataKey="value"
              angleAxisId={0}
              fill={fill}
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold", pctTextClass)}>{pct.toFixed(0)}%</span>
          <span className="text-sm text-muted-foreground font-mono mt-0.5">
            {spent.toFixed(2)} / {budget.toFixed(0)} SOL
          </span>
          {overBudget && <span className="text-xs text-red-400 font-semibold mt-1">OVER BUDGET</span>}
        </div>
      </div>
    </div>
  )
}
