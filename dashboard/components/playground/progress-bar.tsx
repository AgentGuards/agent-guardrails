"use client";

export function PlaygroundProgressBar({
  progress,
  durationMs,
}: {
  progress: number;
  durationMs: number;
}) {
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full rounded-full bg-teal-500/90 transition-[width] ease-out"
        style={{
          width: `${pct}%`,
          transitionDuration: `${durationMs}ms`,
        }}
      />
    </div>
  );
}
