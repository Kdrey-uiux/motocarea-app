/**
 * MotoCare Workshop & Bay Capacity Engine
 *
 * Business Rules:
 * 1. Fixed Workshop Capacity: Exactly 10 hydraulic bays / 10 slots per working day.
 * 2. Operating Schedule: Monday to Saturday (8:00 AM – 6:00 PM).
 * 3. Sunday Policy: Strictly CLOSED (Shop rest day, 0 slots, booking blocked).
 * 4. Standard Lock: Locked to 10 bays to guarantee 1:1 synchronization between
 *    customer online reservations and physical workshop floor lifts.
 */

export const FIXED_WORKSHOP_CAPACITY = 10;
export const BASE_MIN_CAPACITY = 10;
export const ABSOLUTE_MAX_CAPACITY = 10;
export const CAPACITY_OVERRIDE_KEY = 'motocare_daily_capacity_overrides';

export interface DayCapacityInfo {
  date: string;
  totalSlots: number;
  occupiedCount: number;
  remainingSlots: number;
  status: 'AVAILABLE' | 'LIMITED' | 'FULL' | 'CLOSED';
  percentage: number;
  isExpanded: boolean;
  baseCapacity: number;
  isSunday?: boolean;
}

/**
 * Checks whether a given YYYY-MM-DD or ISO date string falls on a Sunday.
 */
export function isSundayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  // Parse date safely handling both 'YYYY-MM-DD' and full ISO timestamps
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.getDay() === 0;
  }
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getDay() === 0;
}

/**
 * Calculates the capacity limit for a specific date:
 * - Sunday: 0 slots (Closed)
 * - Monday to Saturday: Fixed 10 slots
 */
export function getDailyCapacityLimit(dateStr: string, _activeTechCount?: number): number {
  if (isSundayDate(dateStr)) {
    return 0;
  }
  return FIXED_WORKSHOP_CAPACITY;
}

/**
 * Enforces the locked standard of 10 slots per workday.
 * Non-destructive fallback for existing callers.
 */
export function setDailyCapacityLimit(dateStr: string, _capacity: number): number {
  const finalCap = isSundayDate(dateStr) ? 0 : FIXED_WORKSHOP_CAPACITY;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('motocare_capacity_updated', {
        detail: { date: dateStr, capacity: finalCap },
      })
    );
  }
  return finalCap;
}

/**
 * Evaluates the full capacity status given occupied bookings and fixed capacity limit
 */
export function evaluateCapacityStatus(
  dateStr: string,
  occupiedCount: number,
  _activeTechCount?: number
): DayCapacityInfo {
  const isSun = isSundayDate(dateStr);

  if (isSun) {
    return {
      date: dateStr,
      totalSlots: 0,
      occupiedCount: 0,
      remainingSlots: 0,
      status: 'CLOSED',
      percentage: 100,
      isExpanded: false,
      baseCapacity: 0,
      isSunday: true,
    };
  }

  const totalSlots = FIXED_WORKSHOP_CAPACITY;
  const clampedOccupied = Math.min(totalSlots, Math.max(0, occupiedCount));
  const remainingSlots = Math.max(0, totalSlots - clampedOccupied);
  const percentage = Math.round((clampedOccupied / totalSlots) * 100);

  const status: 'AVAILABLE' | 'LIMITED' | 'FULL' =
    remainingSlots === 0 ? 'FULL' : remainingSlots <= 2 ? 'LIMITED' : 'AVAILABLE';

  return {
    date: dateStr,
    totalSlots,
    occupiedCount: clampedOccupied,
    remainingSlots,
    status,
    percentage,
    isExpanded: false,
    baseCapacity: FIXED_WORKSHOP_CAPACITY,
    isSunday: false,
  };
}
