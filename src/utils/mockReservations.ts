import {
  FIXED_WORKSHOP_CAPACITY,
  isSundayDate,
} from './workshopCapacity';

export interface DayCapacity {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon, Oct 5"
  status: 'AVAILABLE' | 'LIMITED' | 'FULL' | 'CLOSED';
  occupiedCount: number;
  totalSlots: number;
  remainingSlots: number;
  totalBays?: number; // legacy compatibility
  isSunday?: boolean;
}

export const DAILY_MAX_CAPACITY = FIXED_WORKSHOP_CAPACITY;
export const DAILY_BASE_CAPACITY = FIXED_WORKSHOP_CAPACITY;

/**
 * Helper to format Date to YYYY-MM-DD in local time
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates reservation schedule relative to today with fixed 10 capacity (Mon-Sat) and Sunday closed
 */
export function getMockReservationsSchedule(daysAhead = 14): Record<string, DayCapacity> {
  const schedule: Record<string, DayCapacity> = {};
  const today = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const curDate = new Date();
    curDate.setDate(today.getDate() + i);

    const dateKey = formatDateKey(curDate);
    const dayLabel = curDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const isSunday = isSundayDate(dateKey);

    if (isSunday) {
      schedule[dateKey] = {
        date: dateKey,
        dayLabel,
        status: 'CLOSED',
        occupiedCount: 0,
        totalSlots: 0,
        remainingSlots: 0,
        totalBays: 0,
        isSunday: true,
      };
      continue;
    }

    const totalSlots = FIXED_WORKSHOP_CAPACITY;
    // Moderate realistic baseline for demo/fallback
    const occupied = 0;
    const remaining = totalSlots;

    schedule[dateKey] = {
      date: dateKey,
      dayLabel,
      status: 'AVAILABLE',
      occupiedCount: occupied,
      totalSlots,
      remainingSlots: remaining,
      totalBays: totalSlots,
      isSunday: false,
    };
  }

  return schedule;
}

/**
 * Get fixed capacity status for a specific date (6 slots on Mon-Sat, Closed on Sunday)
 */
export function getBayCapacity(dateString: string): DayCapacity {
  const isSunday = isSundayDate(dateString);

  const parsed = new Date(dateString);
  const dayLabel = isNaN(parsed.getTime())
    ? dateString
    : parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  if (isSunday) {
    return {
      date: dateString,
      dayLabel,
      status: 'CLOSED',
      occupiedCount: 0,
      totalSlots: 0,
      remainingSlots: 0,
      totalBays: 0,
      isSunday: true,
    };
  }

  return {
    date: dateString,
    dayLabel,
    status: 'AVAILABLE',
    occupiedCount: 0,
    totalSlots: FIXED_WORKSHOP_CAPACITY,
    remainingSlots: FIXED_WORKSHOP_CAPACITY,
    totalBays: FIXED_WORKSHOP_CAPACITY,
    isSunday: false,
  };
}
