/**
 * Turns any stored bay label ("Bay 01", "bay-3", "Lift #7") into its bay number,
 * so occupancy checks agree across the Bays page, Dashboard, and Update Job.
 */
export function normalizeBayNumber(bayStr?: string | null): number | null {
  if (!bayStr) return null;
  const match = bayStr.match(/(?:bay|lift|#)?[\s-]*0?(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

// A job on these statuses is no longer on the floor
const OFF_FLOOR_STATUSES = ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW', 'READY_FOR_PICKUP'];

/**
 * Is this job taking up its bay right now? A motorcycle marked Ready (stage 5) waits in the
 * pickup area, so its bay is free for the next job. The ticket still keeps the bay it used.
 */
export function occupiesBay(t: { status: string; stage?: number | null; assigned_bay?: string | null }): boolean {
  if (!t.assigned_bay || OFF_FLOOR_STATUSES.includes(t.status)) return false;
  return (t.stage ?? 1) < 5;
}
