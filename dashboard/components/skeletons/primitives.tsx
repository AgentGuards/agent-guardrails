export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-white/[0.04]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3 rounded-full bg-white/[0.06]"
            style={{ width: `${55 + (i % 3) * 20}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-md bg-white/[0.06]" />
          <div className="h-3 w-20 rounded-md bg-white/[0.04]" />
        </div>
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-16 rounded-md bg-white/[0.04]" />
          <div className="h-2.5 w-24 rounded-md bg-white/[0.04]" />
        </div>
        <div className="h-[5px] w-full rounded-full bg-white/[0.04]" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-dashed border-white/[0.06] pt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 w-10 rounded bg-white/[0.04]" />
            <div className="h-3 w-14 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#1e1e22] bg-[#111113] px-5 py-[18px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mb-2.5 h-2.5 w-20 rounded-md bg-white/[0.04]" />
      <div className="h-7 w-14 rounded-md bg-white/[0.06]" />
      <div className="mt-2.5 h-2.5 w-24 rounded-md bg-white/[0.04]" />
    </div>
  );
}
