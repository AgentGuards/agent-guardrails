export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-zinc-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3.5 rounded-full bg-zinc-800"
            style={{ width: `${60 + (i % 3) * 20}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-32 rounded-full bg-zinc-800" />
        <div className="h-5 w-16 rounded-full bg-zinc-800" />
      </div>
      <div className="h-3 w-24 rounded-full bg-zinc-800/60" />
      <div className="h-3 w-48 rounded-full bg-zinc-800/60" />
      <div className="h-3 w-36 rounded-full bg-zinc-800/60" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-zinc-800 p-5 animate-pulse">
      <div className="mb-3 h-3 w-24 rounded-full bg-zinc-800/60" />
      <div className="h-7 w-16 rounded-full bg-zinc-800" />
    </div>
  );
}
