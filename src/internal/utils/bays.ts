/** Number of physical service bays (lifts) on the workshop floor */
export const WORKSHOP_BAY_COUNT = 6;

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
