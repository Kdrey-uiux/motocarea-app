export interface BaySlot {
  bayNumber: string;
  bayName: string;
  isOccupied: boolean;
  bikeModel?: string;
  serviceType?: string;
}

export interface DayCapacity {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon, Sep 28"
  status: 'AVAILABLE' | 'LIMITED' | 'FULL';
  occupiedCount: number;
  totalBays: number;
  bays: BaySlot[];
}

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
 * Generates dynamic reservation schedule relative to today
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

    // Custom scenario based on day offset:
    if (i === 1) {
      // Day + 1 (Bukas): FULLY BOOKED (4/4 Bays Occupied)
      schedule[dateKey] = {
        date: dateKey,
        dayLabel,
        status: 'FULL',
        occupiedCount: 4,
        totalBays: 4,
        bays: [
          {
            bayNumber: '01',
            bayName: 'Bay 01 - Quick Service',
            isOccupied: true,
            bikeModel: 'Yamaha Aerox 155',
            serviceType: 'CVT Cleaning & Regrease',
          },
          {
            bayNumber: '02',
            bayName: 'Bay 02 - FI Diagnostics',
            isOccupied: true,
            bikeModel: 'Honda Click 125 V2',
            serviceType: 'FI Diagnostic & Throttle Body',
          },
          {
            bayNumber: '03',
            bayName: 'Bay 03 - Precision Repair',
            isOccupied: true,
            bikeModel: 'Vespa Sprint 150',
            serviceType: 'Full PMS & Valve Clearance',
          },
          {
            bayNumber: '04',
            bayName: 'Bay 04 - Heavy Mechanical',
            isOccupied: true,
            bikeModel: 'Kawasaki Dominar 400',
            serviceType: 'Brake Caliper Overhaul',
          },
        ],
      };
    } else if (i === 2) {
      // Day + 2 (Samakalawa): LIMITED / 1 Slot Left (3/4 Bays Occupied)
      schedule[dateKey] = {
        date: dateKey,
        dayLabel,
        status: 'LIMITED',
        occupiedCount: 3,
        totalBays: 4,
        bays: [
          {
            bayNumber: '01',
            bayName: 'Bay 01 - Quick Service',
            isOccupied: true,
            bikeModel: 'Honda ADV 160',
            serviceType: 'Change Oil & Routine Inspection',
          },
          {
            bayNumber: '02',
            bayName: 'Bay 02 - FI Diagnostics',
            isOccupied: true,
            bikeModel: 'Yamaha NMAX 155 V2',
            serviceType: 'CVT Cleaning & Belt Check',
          },
          {
            bayNumber: '03',
            bayName: 'Bay 03 - Precision Repair',
            isOccupied: true,
            bikeModel: 'Suzuki Raider 150 Fi',
            serviceType: 'Full PMS & Valve Clearance',
          },
          {
            bayNumber: '04',
            bayName: 'Bay 04 - Open Bay',
            isOccupied: false,
          },
        ],
      };
    } else if (i === 4) {
      // Day + 4: FULLY BOOKED (4/4 Bays Occupied)
      schedule[dateKey] = {
        date: dateKey,
        dayLabel,
        status: 'FULL',
        occupiedCount: 4,
        totalBays: 4,
        bays: [
          {
            bayNumber: '01',
            bayName: 'Bay 01 - Quick Service',
            isOccupied: true,
            bikeModel: 'Honda Beat 110',
            serviceType: 'Change Oil & Routine Inspection',
          },
          {
            bayNumber: '02',
            bayName: 'Bay 02 - FI Diagnostics',
            isOccupied: true,
            bikeModel: 'Yamaha Sniper 155',
            serviceType: 'FI Diagnostic & Throttle Body',
          },
          {
            bayNumber: '03',
            bayName: 'Bay 03 - Precision Repair',
            isOccupied: true,
            bikeModel: 'Rusi Classic 250',
            serviceType: 'Electrical & Battery Diagnostics',
          },
          {
            bayNumber: '04',
            bayName: 'Bay 04 - Heavy Mechanical',
            isOccupied: true,
            bikeModel: 'KTM Duke 390',
            serviceType: 'Brake Caliper Overhaul',
          },
        ],
      };
    } else if (i === 0) {
      // Today: 2 slots occupied
      schedule[dateKey] = {
        date: dateKey,
        dayLabel: 'Today (' + dayLabel + ')',
        status: 'AVAILABLE',
        occupiedCount: 2,
        totalBays: 4,
        bays: [
          {
            bayNumber: '01',
            bayName: 'Bay 01 - Quick Service',
            isOccupied: true,
            bikeModel: 'Honda Wave 110',
            serviceType: 'Change Oil & Routine Inspection',
          },
          {
            bayNumber: '02',
            bayName: 'Bay 02 - FI Diagnostics',
            isOccupied: true,
            bikeModel: 'Yamaha Mio i125',
            serviceType: 'CVT Cleaning & Regrease',
          },
          {
            bayNumber: '03',
            bayName: 'Bay 03 - Open Bay',
            isOccupied: false,
          },
          {
            bayNumber: '04',
            bayName: 'Bay 04 - Open Bay',
            isOccupied: false,
          },
        ],
      };
    } else {
      // Default: AVAILABLE (1 bay occupied or all open)
      schedule[dateKey] = {
        date: dateKey,
        dayLabel,
        status: 'AVAILABLE',
        occupiedCount: 1,
        totalBays: 4,
        bays: [
          {
            bayNumber: '01',
            bayName: 'Bay 01 - Quick Service',
            isOccupied: true,
            bikeModel: 'Honda PCX 160',
            serviceType: 'Change Oil & Routine Inspection',
          },
          {
            bayNumber: '02',
            bayName: 'Bay 02 - Open Bay',
            isOccupied: false,
          },
          {
            bayNumber: '03',
            bayName: 'Bay 03 - Open Bay',
            isOccupied: false,
          },
          {
            bayNumber: '04',
            bayName: 'Bay 04 - Open Bay',
            isOccupied: false,
          },
        ],
      };
    }
  }

  return schedule;
}

/**
 * Get capacity status for a specific date
 */
export function getBayCapacity(dateString: string): DayCapacity {
  const schedule = getMockReservationsSchedule(20);
  if (schedule[dateString]) {
    return schedule[dateString];
  }

  // Fallback kung lampas 20 days
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
    occupiedCount: 0,
    totalBays: 4,
    bays: [
      { bayNumber: '01', bayName: 'Bay 01 - Open Bay', isOccupied: false },
      { bayNumber: '02', bayName: 'Bay 02 - Open Bay', isOccupied: false },
      { bayNumber: '03', bayName: 'Bay 03 - Open Bay', isOccupied: false },
      { bayNumber: '04', bayName: 'Bay 04 - Open Bay', isOccupied: false },
    ],
  };
}
