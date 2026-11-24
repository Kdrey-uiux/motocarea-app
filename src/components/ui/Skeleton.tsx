import type { ReactNode } from 'react';

/**
 * Grey placeholder shape shown while content loads, with a soft shimmer.
 * Size and shape come from `className` (e.g. "h-4 w-32", "w-10 h-10 rounded-full").
 * Colors follow the light/dark theme (slate variables in theme.css).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />;
}

/**
 * Wraps a group of skeletons: screen readers hear one "Loading …" message
 * instead of a row of empty shapes.
 */
export function SkeletonGroup({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A list row: round avatar, two text lines, and a short tag on the right */
export function SkeletonRow({ avatar = true, trailing = true }: { avatar?: boolean; trailing?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      {avatar && <Skeleton className="w-10 h-10 rounded-full shrink-0" />}
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3.5 w-2/5" />
          {trailing && <Skeleton className="h-3 w-10" />}
        </div>
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/** A card with a title line and a few text lines */
export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-5/6', 'w-2/3', 'w-1/2'];
  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
