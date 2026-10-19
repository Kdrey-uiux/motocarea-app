import { Motorcycle, ServiceTicket } from '../types/dashboard';
import { getTicketDisplayDate } from './ticketDates';

/**
 * Automatic preventive maintenance (PMS) schedule.
 * Nothing is typed in by the customer or staff: the next visit is worked out from the
 * date the motorcycle's last service was completed (released at the counter).
 */
export const PMS_INTERVAL_MONTHS = 6;
const DUE_SOON_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type NextServiceStatus = 'NO_RECORD' | 'ON_SCHEDULE' | 'DUE_SOON' | 'OVERDUE';

export interface NextServiceInfo {
  status: NextServiceStatus;
  lastServiceDate: Date | null;
  dueDate: Date | null;
  /** Whole days until the due date; negative when overdue, null without a record */
  daysLeft: number | null;
}

const cleanPlate = (plate?: string | null) => (plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** Tickets for this motorcycle (by id, or by plate for older tickets without one) */
function isForBike(ticket: ServiceTicket, bike: Motorcycle): boolean {
  if (ticket.motorcycle_id) return ticket.motorcycle_id === bike.id;
  const plate = cleanPlate(ticket.motorcycles?.plate_number);
  return Boolean(plate) && plate === cleanPlate(bike.plate_number);
}

export function getNextService(bike: Motorcycle, history: ServiceTicket[], now: Date = new Date()): NextServiceInfo {
  const lastServiceTime = history
    .filter((t) => t.status === 'COMPLETED' && isForBike(t, bike))
    .map((t) => getTicketDisplayDate(t).getTime())
    .filter((time) => !isNaN(time))
    .reduce<number | null>((latest, time) => (latest === null || time > latest ? time : latest), null);

  if (lastServiceTime === null) {
    return { status: 'NO_RECORD', lastServiceDate: null, dueDate: null, daysLeft: null };
  }

  const lastServiceDate = new Date(lastServiceTime);
  const dueDate = new Date(lastServiceDate.getFullYear(), lastServiceDate.getMonth() + PMS_INTERVAL_MONTHS, lastServiceDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);

  const status: NextServiceStatus = daysLeft < 0 ? 'OVERDUE' : daysLeft <= DUE_SOON_DAYS ? 'DUE_SOON' : 'ON_SCHEDULE';
  return { status, lastServiceDate, dueDate, daysLeft };
}

export function formatServiceDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** e.g. "in 45 days", "today", "12 days overdue" */
export function describeDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return 'today';
  if (daysLeft > 0) return `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  const late = Math.abs(daysLeft);
  return `${late} day${late === 1 ? '' : 's'} overdue`;
}

/** Short value for compact places such as the garage card */
export function nextServiceShort(info: NextServiceInfo): string {
  return info.dueDate ? formatServiceDate(info.dueDate) : 'After first service';
}

export const NEXT_SERVICE_BADGE: Record<NextServiceStatus, { label: string; className: string }> = {
  NO_RECORD: { label: 'No record yet', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  ON_SCHEDULE: { label: 'On Schedule', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DUE_SOON: { label: 'Due Soon', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  OVERDUE: { label: 'Overdue', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};
