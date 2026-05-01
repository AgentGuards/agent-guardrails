export function anomalyTone(score: number): "teal" | "amber" | "red" {
  if (score <= 30) return "teal";
  if (score <= 60) return "amber";
  return "red";
}

export function anomalyBarClass(score: number): string {
  const tone = anomalyTone(score);
  if (tone === "teal") return "bg-teal-500";
  if (tone === "amber") return "bg-amber-500";
  return "bg-red-500";
}

export function AnomalyRiskLabel({ score }: { score: number }) {
  const tone = anomalyTone(score);
  if (tone === "teal") return <span className="text-xs text-teal-500">normal</span>;
  if (tone === "amber") return <span className="text-xs text-amber-500">elevated</span>;
  return <span className="text-xs font-medium text-red-400">critical</span>;
}
