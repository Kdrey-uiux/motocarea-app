export interface DayCapacity {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon, Oct 5"
  status: 'AVAILABLE' | 'LIMITED' | 'FULL';
  occupiedCount: number;
  totalSlots: number;
  remainingSlots: number;
  totalBays?: number; // legacy compatibility
}

export const DAILY_MAX_CAPACITY = 10;

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
 * Generates dynamic reservation schedule relative to today based on 10 daily slots limit
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

    let occupied = 2; // default 2 slots occupied, 8 available

    if (i === 0) {
      occupied = 4; // Today: 4 booked, 6 slots available
    } else if (i === 1) {
      occupied = 10; // Tomorrow: Fully booked (10/10)
    } else if (i === 2) {
      occupied = 8; // Day + 2: 8 booked, 2 slots remaining (Limited)
    } else if (i === 4) {
      occupied = 9; // Day + 4: 9 booked, 1 slot left (Limited)
    } else if (i === 5) {
      occupied = 3; // Day + 5: 3 booked, 7 available
    }

    const remaining = Math.max(0, DAILY_MAX_CAPACITY - occupied);
    const status: 'AVAILABLE' | 'LIMITED' | 'FULL' =
      remaining === 0 ? 'FULL' : remaining <= 2 ? 'LIMITED' : 'AVAILABLE';

    schedule[dateKey] = {
      date: dateKey,
      dayLabel,
      status,
      occupiedCount: occupied,
      totalSlots: DAILY_MAX_CAPACITY,
      remainingSlots: remaining,
      totalBays: DAILY_MAX_CAPACITY,
    };
  }

  return schedule;
}

/**
 * Get capacity status for a specific date
 */
export function getBayCapacity(dateString: string): DayCapacity {
  const schedule = getMockReservationsSchedule(30);
  if (schedule[dateString]) {
    return schedule[dateString];
  }

  const parsed = new Date(dateString);
  const dayLabel = isNaN(parsed.getTime())
    ? dateString
    : parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  return {
    date: dateString,
    dayLabel,
    status: 'AVAILABLE',
    occupiedCount: 2,
    totalSlots: DAILY_MAX_CAPACITY,
    remainingSlots: DAILY_MAX_CAPACITY - 2,
    totalBays: DAILY_MAX_CAPACITY,
  };
}
