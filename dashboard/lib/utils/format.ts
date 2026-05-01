export function formatSol(lamports: bigint | number | string): string {
  const raw =
    typeof lamports === "bigint"
      ? Number(lamports)
      : typeof lamports === "string"
        ? Number(lamports)
        : lamports;

  if (!Number.isFinite(raw)) return "◎0";

  const sol = raw / 1_000_000_000;

  if (sol === 0) return "◎0";
  if (sol < 0.001) return `◎${sol.toFixed(6)}`;
  if (sol < 1) return `◎${sol.toFixed(4)}`;
  if (sol < 100) return `◎${sol.toFixed(2)}`;
  return `◎${sol.toFixed(1)}`;
}
