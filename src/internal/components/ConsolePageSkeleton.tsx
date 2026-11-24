import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton';

const CARD = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';

/**
 * Shown on the ticket pages (Dashboard, Queue, Bays, History) until the tickets
 * load for the first time: page header, a row of summary cards, and a list.
 */
export default function ConsolePageSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} className="space-y-4 sm:space-y-5">
      {/* Page header */}
      <div className={`${CARD} px-5 sm:px-7 py-5 space-y-2`}>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${CARD} p-5 space-y-3`}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      {/* List */}
      <div className={`${CARD} divide-y divide-slate-100`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden sm:block h-9 w-28 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
