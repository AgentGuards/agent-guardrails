import { SkeletonBlock } from "./skeleton-block";

export function IncidentsViewSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {Array.from({ length: 4 }).map((_, idx) => (
                <th key={idx} className="border-b border-border bg-secondary px-4 py-3">
                  <SkeletonBlock className="h-2.5 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, idx) => (
              <tr key={idx}>
                <td className="border-b border-border px-4 py-3.5"><SkeletonBlock className="h-3 w-24" /></td>
                <td className="border-b border-border px-4 py-3.5"><SkeletonBlock className="h-3 w-44" /></td>
                <td className="border-b border-border px-4 py-3.5"><SkeletonBlock className="h-3 w-28" /></td>
                <td className="border-b border-border px-4 py-3.5"><SkeletonBlock className="h-5 w-16 rounded-full" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
