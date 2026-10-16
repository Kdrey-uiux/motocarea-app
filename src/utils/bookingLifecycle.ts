import { supabase } from '../lib/supabase';
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
 * Evaluates whether a booking has exceeded its drop-off window without technician intake
 */
export function isBookingExpiredOrMissed(ticket: {
  dropoff_date?: string;
  notes?: string;
  stage: number;
  status: string;
  created_at?: string;
}): boolean {
  // If already marked as MISSED or NO_SHOW
  if (ticket.status === 'MISSED' || ticket.status === 'NO_SHOW') return true;

  // Completed, cancelled, or stage > 1 (already inspected/serviced by mechanic) cannot be missed
  if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') return false;
  if (ticket.stage > 1) return false;
  if (!ticket.dropoff_date) return false;

  const now = new Date();

  // Parse YYYY-MM-DD
  const parts = ticket.dropoff_date.split('-');
  if (parts.length !== 3) return false;

  const bookYear = parseInt(parts[0], 10);
  const bookMonth = parseInt(parts[1], 10) - 1;
  const bookDay = parseInt(parts[2], 10);

  if (isNaN(bookYear) || isNaN(bookMonth) || isNaN(bookDay)) return false;

  const scheduledDate = new Date(bookYear, bookMonth, bookDay);
  scheduledDate.setHours(0, 0, 0, 0);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  // 1. Scheduled date is strictly before today -> Missed
  if (scheduledDate < today) {
    return true;
  }

  // 2. Scheduled date is today -> check slot cutoff + grace period
  if (scheduledDate.getTime() === today.getTime()) {
    const slot = parseTimeSlotFromNotes(ticket.notes);
    if (slot) {
      const cutoffTime = new Date(bookYear, bookMonth, bookDay, slot.endHour, slot.endMinute + slot.graceMinutes, 0);
      if (now > cutoffTime) {
        return true;
      }
    } else {
      // Default closing cutoff: 4:30 PM (16:30)
      const defaultCutoff = new Date(bookYear, bookMonth, bookDay, 16, 30, 0);
      if (now > defaultCutoff) {
        return true;
      }
    }
  }

  return false;
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
    const { data: tickets, error } = await supabase
      .from('service_tickets')
      .select('id, ticket_code, user_id, dropoff_date, notes, stage, status, service_type, is_walk_in, motorcycles(model, plate_number)')
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
      const updatedNotes = currentNotes.includes('[MISSED_EXPIRATION]')
        ? currentNotes
        : `${currentNotes} | [MISSED_EXPIRATION: Drop-off window ended without check-in. Slot released.]`.trim();

      const { error: updateError } = await supabase
        .from('service_tickets')
        .update({
          status: 'CANCELLED',
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
            await supabase.from('messages').insert({
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
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayBookings } = await supabase
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
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', userId)
        .like('message', `%${b.ticket_code}%`)
        .like('message', '%[BOOKING_REMINDER]%')
        .maybeSingle();

      if (!existingMsg) {
        const reminderPayload = {
          type: 'BOOKING_REMINDER',
          ticketCode: b.ticket_code,
          bikeModel,
          plateNumber: plateNum,
          date: todayStr,
          timeWindow: slotLabel,
          message: `Reminder from MotoCare: Your ${bikeModel} (${plateNum}) is scheduled for drop-off today during the ${slotLabel}. Please bring it to the MotoCare reception desk.`,
        };

        await supabase.from('messages').insert({
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
    const { data: currentTicket, error: fetchError } = await supabase
      .from('service_tickets')
      .select('notes, user_id')
      .eq('id', ticketId)
      .single();

    if (fetchError || !currentTicket) {
      return { success: false, error: 'Original booking record not found.' };
    }

    let updatedNotes = currentTicket.notes || '';
    if (updatedNotes.includes('Arrival Window:')) {
      updatedNotes = updatedNotes.replace(/Arrival Window: [^|]+/, `Arrival Window: ${newTimeWindow}`);
    } else {
      updatedNotes = `${updatedNotes} | Arrival Window: ${newTimeWindow}`.trim();
    }

    if (customNotes && customNotes.trim()) {
      updatedNotes = `${updatedNotes} | Reschedule Note: ${customNotes.trim()}`;
    }

    const timestampStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    updatedNotes = `${updatedNotes} | [Rescheduled to ${newDropoffDate} on ${timestampStr}]`;

    const { error: updateError } = await supabase
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
        await supabase.from('messages').insert({
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
    const { data: ticket, error: fetchErr } = await supabase
      .from('service_tickets')
      .select('id, ticket_code, notes, stage, status')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !ticket) return { success: false, error: 'Ticket not found.' };

    const updatedNotes = `${ticket.notes || ''} | [LATE_CHECKIN_OVERRIDE: Approved by ${actorName} at ${new Date().toLocaleTimeString()}]`.trim();

    const { error: updateErr } = await supabase
      .from('service_tickets')
      .update({
        stage: 1,
        status: 'IN_PROGRESS',
        notes: updatedNotes,
      })
      .eq('id', ticketId);

    if (updateErr) return { success: false, error: updateErr.message };

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
    const { data: ticket } = await supabase
      .from('service_tickets')
      .select('id, ticket_code, notes')
      .eq('id', ticketId)
      .single();

    if (!ticket) return false;

    const updatedNotes = `${ticket.notes || ''} | [GRACE_EXTENDED: +${extraHours}h by ${actorName}]`.trim();

    await supabase
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

