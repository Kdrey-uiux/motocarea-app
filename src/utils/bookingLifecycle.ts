import { db } from '../lib/supabase';
import { broadcastTicketSync } from '../lib/realtimeSync';

export interface TimeSlotConfig {
  id: string;
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  graceMinutes: number; // default 30 mins grace period
}

export const TIME_SLOTS: TimeSlotConfig[] = [
  { id: '08:00 AM - 10:00 AM', label: 'Morning Slot', startHour: 8, startMinute: 0, endHour: 10, endMinute: 0, graceMinutes: 30 },
  { id: '10:00 AM - 01:00 PM', label: 'Midday Slot', startHour: 10, startMinute: 0, endHour: 13, endMinute: 0, graceMinutes: 30 },
  { id: '01:00 PM - 04:00 PM', label: 'Afternoon Slot', startHour: 13, startMinute: 0, endHour: 16, endMinute: 0, graceMinutes: 30 },
];

/**
 * Extracts the matching time slot from ticket notes if present
 */
export function parseTimeSlotFromNotes(notes?: string): TimeSlotConfig | null {
  if (!notes) return null;
  for (const slot of TIME_SLOTS) {
    if (notes.includes(slot.id)) return slot;
    if (notes.toLowerCase().includes(slot.label.toLowerCase())) return slot;
  }
  return null;
}

/**
 * True when the arrival window on the given YYYY-MM-DD date has already ended
 * (only possible for today), so it can no longer be booked.
 */
export function isArrivalWindowOver(dateKey: string, windowId: string, now: Date = new Date()): boolean {
  const slot = TIME_SLOTS.find((s) => s.id === windowId);
  const parts = dateKey.split('-').map((p) => parseInt(p, 10));
  if (!slot || parts.length !== 3 || parts.some(isNaN)) return false;
  const windowEnd = new Date(parts[0], parts[1] - 1, parts[2], slot.endHour, slot.endMinute, 0);
  return now >= windowEnd;
}

/**
 * Evaluates whether a booking has exceeded its drop-off window without technician intake
 */
export function isBookingExpiredOrMissed(ticket: {
  dropoff_date?: string;
  notes?: string;
  stage: number;
  status: string;
  created_at?: string;
  assigned_bay?: string | null;
}): boolean {
  // If already marked as MISSED or NO_SHOW
  if (ticket.status === 'MISSED' || ticket.status === 'NO_SHOW') return true;

  // Completed, cancelled, or stage > 1 (already inspected/serviced by mechanic) cannot be missed
  if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED' || ticket.status === 'CANCELLED_BY_ADMIN') return false;
  if (ticket.stage > 1) return false;
  if (!ticket.dropoff_date) return false;

  // Motorcycle is already physically at the shop (on a bay lift, checked in, or late check-in approved)
  if (ticket.assigned_bay && ticket.assigned_bay !== 'Bay Assignment Pending') return false;
  if (ticket.notes && (ticket.notes.includes('[CHECKED_IN') || ticket.notes.includes('[LATE_CHECKIN_OVERRIDE'))) {
    return false;
  }

  const now = new Date();

  // Parse YYYY-MM-DD
  const parts = ticket.dropoff_date.split('-');
  if (parts.length !== 3) return false;

  const bookYear = parseInt(parts[0], 10);
  const bookMonth = parseInt(parts[1], 10) - 1;
  const bookDay = parseInt(parts[2], 10);

  if (isNaN(bookYear) || isNaN(bookMonth) || isNaN(bookDay)) return false;

  // Cutoff = slot end + grace period (default closing cutoff: 4:30 PM), plus any admin grace extensions
  const slot = parseTimeSlotFromNotes(ticket.notes);
  const cutoffTime = slot
    ? new Date(bookYear, bookMonth, bookDay, slot.endHour, slot.endMinute + slot.graceMinutes, 0)
    : new Date(bookYear, bookMonth, bookDay, 16, 30, 0);
  const extraHours = parseGraceExtensionHours(ticket.notes);
  if (extraHours > 0) {
    cutoffTime.setTime(cutoffTime.getTime() + extraHours * 60 * 60 * 1000);
  }

  return now > cutoffTime;
}

/**
 * Sums all "[GRACE_EXTENDED: +Nh ...]" tags written by adminExtendGracePeriod
 */
function parseGraceExtensionHours(notes?: string): number {
  if (!notes) return 0;
  let total = 0;
  for (const match of notes.matchAll(/\[GRACE_EXTENDED: \+(\d+(?:\.\d+)?)h/g)) {
    total += parseFloat(match[1]);
  }
  return total;
}

/**
 * Automated Evaluator & Expiration Engine:
 * Queries tickets pending intake (stage 1, IN_PROGRESS) that missed their window,
 * updates status to 'MISSED', releases bay slot, and inserts automated notification.
 */
export async function evaluateAndExpireMissedBookings(): Promise<{
  expiredCount: number;
  expiredTickets: Array<{ id: string; ticket_code: string; user_id?: string }>;
}> {
  try {
    const { data: tickets, error } = await db()
      .from('service_tickets')
      .select('id, ticket_code, user_id, dropoff_date, notes, stage, status, service_type, is_walk_in, assigned_bay, motorcycles(model, plate_number)')
      .eq('stage', 1)
      .eq('status', 'IN_PROGRESS');

    if (error || !tickets || tickets.length === 0) {
      return { expiredCount: 0, expiredTickets: [] };
    }

    // Walk-in units are already at the shop, so they can never miss a drop-off window
    const expiredToUpdate = tickets.filter((t) => !t.is_walk_in && isBookingExpiredOrMissed(t));
    if (expiredToUpdate.length === 0) {
      return { expiredCount: 0, expiredTickets: [] };
    }

    const expiredTickets: Array<{ id: string; ticket_code: string; user_id?: string }> = [];

    for (const ticket of expiredToUpdate) {
      const currentNotes = ticket.notes || '';
      const updatedNotes = currentNotes.includes('[MISSED_EXPIRATION')
        ? currentNotes
        : `${currentNotes} | [MISSED_EXPIRATION: Drop-off window ended without check-in. Slot released.]`.trim();

      const { error: updateError } = await db()
        .from('service_tickets')
        .update({
          status: 'MISSED',
          notes: updatedNotes,
        })
        .eq('id', ticket.id);

      if (!updateError) {
        expiredTickets.push({
          id: ticket.id,
          ticket_code: ticket.ticket_code,
          user_id: ticket.user_id,
        });

        // Insert automated notification into messages table
        if (ticket.user_id) {
          const bikeRecord = Array.isArray(ticket.motorcycles) ? ticket.motorcycles[0] : ticket.motorcycles;
          const bikeModel = bikeRecord?.model || 'Motorcycle Unit';
          const plateNum = bikeRecord?.plate_number || 'N/A';
          const notificationPayload = {
            type: 'MISSED_BOOKING',
            ticketId: ticket.id,
            ticketCode: ticket.ticket_code,
            bikeModel,
            plateNumber: plateNum,
            serviceType: ticket.service_type,
            rescheduleUrl: `/dashboard?tab=book&reschedule=${ticket.ticket_code}`,
            message: `Your motorcycle (${bikeModel} - ${plateNum}) was not checked in for appointment #${ticket.ticket_code}. Your booking details are saved, and you can reschedule to a new date and time at any time.`,
          };

          try {
            await db().from('messages').insert({
              user_id: ticket.user_id,
              sender_role: 'admin',
              message: `[MISSED_BOOKING_NOTICE] ${JSON.stringify(notificationPayload)}`,
            });
          } catch {
            // non-fatal message insertion error
          }
        }
      }
    }

    // Broadcast realtime event so all active dashboards refresh immediately
    if (expiredTickets.length > 0) {
      broadcastTicketSync({ action: 'BOOKINGS_EXPIRED_MISSED', count: expiredTickets.length });
    }

    return { expiredCount: expiredTickets.length, expiredTickets };
  } catch (err) {
    console.error('evaluateAndExpireMissedBookings error:', err);
    return { expiredCount: 0, expiredTickets: [] };
  }
}

// Throttle state for the missed-booking scan (shared per browser tab)
const MISSED_SCAN_INTERVAL_MS = 5 * 60 * 1000;
let lastMissedScanAt = 0;
let missedScanInFlight: Promise<unknown> | null = null;

/**
 * Runs the missed-booking scan in the background at most once every 5 minutes.
 * Never blocks the caller and never runs two scans at the same time.
 */
export function runMissedBookingScanInBackground(force = false): void {
  const now = Date.now();
  if (missedScanInFlight) return;
  if (!force && now - lastMissedScanAt < MISSED_SCAN_INTERVAL_MS) return;
  lastMissedScanAt = now;
  missedScanInFlight = evaluateAndExpireMissedBookings()
    .catch(() => undefined)
    .finally(() => {
      missedScanInFlight = null;
    });
}

/**
 * Checks and sends Day-of-Dropoff reminders to customer
 */
export async function checkAndSendBookingReminders(userId: string): Promise<void> {
  try {
    // Local calendar date (toISOString is UTC, which is still "yesterday" before 8 AM in PH)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data: todayBookings } = await db()
      .from('service_tickets')
      .select('id, ticket_code, user_id, dropoff_date, notes, stage, status, service_type, motorcycles(model, plate_number)')
      .eq('user_id', userId)
      .eq('dropoff_date', todayStr)
      .eq('stage', 1)
      .eq('status', 'IN_PROGRESS');

    if (!todayBookings || todayBookings.length === 0) return;

    for (const b of todayBookings) {
      const slot = parseTimeSlotFromNotes(b.notes);
      const slotLabel = slot ? `${slot.label} (${slot.id})` : 'scheduled arrival window';
      const bikeRec = Array.isArray(b.motorcycles) ? b.motorcycles[0] : b.motorcycles;
      const bikeModel = bikeRec?.model || 'Motorcycle Unit';
      const plateNum = bikeRec?.plate_number || 'N/A';

      // Verify if reminder was already delivered today
      const { data: existingMsgs, error: lookupError } = await db()
        .from('messages')
        .select('id')
        .eq('user_id', userId)
        .like('message', `%${b.ticket_code}%`)
        .like('message', '%[BOOKING_REMINDER]%')
        .like('message', `%${todayStr}%`)
        .limit(1);

      if (!lookupError && (!existingMsgs || existingMsgs.length === 0)) {
        const reminderPayload = {
          type: 'BOOKING_REMINDER',
          ticketCode: b.ticket_code,
          bikeModel,
          plateNumber: plateNum,
          date: todayStr,
          timeWindow: slotLabel,
          message: `Reminder from MotoCare: Your ${bikeModel} (${plateNum}) is scheduled for drop-off today during the ${slotLabel}. Please bring it to the MotoCare reception desk.`,
        };

        await db().from('messages').insert({
          user_id: userId,
          sender_role: 'admin',
          message: `[BOOKING_REMINDER] ${JSON.stringify(reminderPayload)}`,
        });
      }
    }
  } catch (err) {
    console.error('checkAndSendBookingReminders error:', err);
  }
}

/**
 * Reschedules an existing service ticket to a new date and time window
 */
export async function rescheduleServiceTicket({
  ticketId,
  ticketCode,
  newDropoffDate,
  newTimeWindow,
  customNotes,
  userId,
}: {
  ticketId: string;
  ticketCode: string;
  newDropoffDate: string;
  newTimeWindow: string;
  customNotes?: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentTicket, error: fetchError } = await db()
      .from('service_tickets')
      .select('notes, user_id')
      .eq('id', ticketId)
      .single();

    if (fetchError || !currentTicket) {
      return { success: false, error: 'Original booking record not found.' };
    }

    // A rescheduled motorcycle is no longer at the shop, so drop arrival markers (lets the missed scan apply again)
    let updatedNotes = (currentTicket.notes || '')
      .replace(/\s*\|?\s*\[(?:CHECKED_IN|LATE_CHECKIN_OVERRIDE)[^\]]*\]/g, '')
      .trim();
    if (updatedNotes.includes('Arrival Window:')) {
      // Replace only the window value; stop before "|", a newline, or a "[BOOKING:...]" tag so tags are preserved
      updatedNotes = updatedNotes.replace(/Arrival Window: [^|\n[]*[^|\n[\s]/, `Arrival Window: ${newTimeWindow}`);
    } else {
      updatedNotes = `${updatedNotes} | Arrival Window: ${newTimeWindow}`.trim();
    }

    if (customNotes && customNotes.trim()) {
      updatedNotes = `${updatedNotes} | Reschedule Note: ${customNotes.trim()}`;
    }

    const timestampStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    updatedNotes = `${updatedNotes} | [Rescheduled to ${newDropoffDate} on ${timestampStr}]`;

    const { error: updateError } = await db()
      .from('service_tickets')
      .update({
        dropoff_date: newDropoffDate,
        notes: updatedNotes,
        stage: 1,
        status: 'IN_PROGRESS',
      })
      .eq('id', ticketId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const targetUserId = userId || currentTicket.user_id;
    if (targetUserId) {
      const confirmPayload = {
        type: 'RESCHEDULE_CONFIRMED',
        ticketCode,
        newDropoffDate,
        newTimeWindow,
        message: `Your appointment #${ticketCode} has been rescheduled to ${newDropoffDate} (${newTimeWindow}). The MotoCare reception desk is ready for your arrival.`,
      };
      try {
        await db().from('messages').insert({
          user_id: targetUserId,
          sender_role: 'admin',
          message: `[RESCHEDULE_CONFIRMED] ${JSON.stringify(confirmPayload)}`,
        });
      } catch {
        // ignore
      }
    }

    broadcastTicketSync({ action: 'TICKET_RESCHEDULED', ticket_code: ticketCode });

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error during reschedule.' };
  }
}

/**
 * Admin Late Check-in Override
 */
export async function adminLateCheckInOverride(
  ticketId: string,
  actorName: string = 'Service Advisor'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: ticket, error: fetchErr } = await db()
      .from('service_tickets')
      .select('id, ticket_code, notes, stage, status')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !ticket) return { success: false, error: 'Ticket not found.' };

    const updatedNotes = `${ticket.notes || ''} | [LATE_CHECKIN_OVERRIDE: Approved by ${actorName} at ${new Date().toLocaleTimeString()}]`.trim();

    const { data: updatedRows, error: updateErr } = await db()
      .from('service_tickets')
      .update({
        stage: 1,
        status: 'IN_PROGRESS',
        notes: updatedNotes,
      })
      .eq('id', ticketId)
      .select('id');

    if (updateErr) return { success: false, error: updateErr.message };
    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: 'Database write permission error. Please run migration 03_service_tickets.sql.' };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed late check-in override.' };
  }
}

/**
 * Admin Extend Grace Period
 */
export async function adminExtendGracePeriod(
  ticketId: string,
  extraHours: number = 1,
  actorName: string = 'Service Advisor'
): Promise<boolean> {
  try {
    const { data: ticket } = await db()
      .from('service_tickets')
      .select('id, ticket_code, notes')
      .eq('id', ticketId)
      .single();

    if (!ticket) return false;

    const updatedNotes = `${ticket.notes || ''} | [GRACE_EXTENDED: +${extraHours}h by ${actorName}]`.trim();

    await db()
      .from('service_tickets')
      .update({
        notes: updatedNotes,
        status: 'IN_PROGRESS',
      })
      .eq('id', ticketId);

    return true;
  } catch {
    return false;
  }
}

/**
 * Admin Assisted Reschedule
 */
export async function adminAssistedReschedule(
  ticketId: string,
  ticketCode: string,
  newDate: string,
  newSlot: string,
  actorName: string = 'Service Advisor'
): Promise<{ success: boolean; error?: string }> {
  return rescheduleServiceTicket({
    ticketId,
    ticketCode,
    newDropoffDate: newDate,
    newTimeWindow: newSlot,
    customNotes: `Assisted by ${actorName}`,
  });
}

