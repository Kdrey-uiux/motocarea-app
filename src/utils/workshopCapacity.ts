/**
 * MotoCare daily booking capacity.
 *
 * Business rules:
 * 1. One service bay = one online booking per day. The owner sets the number of bays
 *    (utils/workshopBays.ts); the database enforces the same limit (migration 15).
 * 2. Open Monday to Saturday; Sunday is closed (0 slots, booking blocked).
 */
import { getBayCount } from './workshopBays';

/** Online bookings allowed per open day (= number of bays) */
export function getWorkshopCapacity(): number {
  return getBayCount();
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
 * Booking capacity for a date: 0 on Sundays (closed), otherwise the number of bays.
 */
export function getDailyCapacityLimit(dateStr: string): number {
  return isSundayDate(dateStr) ? 0 : getWorkshopCapacity();
}

/**
 * "Almost full" when about a third of the day's slots (at least 1) are left:
 * 2 left of 6, 1 left of 3.
 */
export function isAlmostFull(remainingSlots: number, totalSlots: number): boolean {
  return remainingSlots > 0 && remainingSlots <= Math.max(1, Math.round(totalSlots / 3));
}
