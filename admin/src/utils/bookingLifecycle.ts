import { supabase } from '../lib/supabase';
import { recordAuditLog } from './auditLogger';
import { AdminTicket } from '../types/admin';

export interface TimeSlotConfig {
  id: string;
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  graceMinutes: number;
}

export const TIME_SLOTS: TimeSlotConfig[] = [
  { id: '08:00 AM - 10:00 AM', label: 'Morning Slot', startHour: 8, startMinute: 0, endHour: 10, endMinute: 0, graceMinutes: 30 },
  { id: '10:00 AM - 01:00 PM', label: 'Midday Slot', startHour: 10, startMinute: 0, endHour: 13, endMinute: 0, graceMinutes: 30 },
  { id: '01:00 PM - 04:00 PM', label: 'Afternoon Slot', startHour: 13, startMinute: 0, endHour: 16, endMinute: 0, graceMinutes: 30 },
];

export function parseTimeSlotFromNotes(notes?: string): TimeSlotConfig | null {
  if (!notes) return null;
  for (const slot of TIME_SLOTS) {
    if (notes.includes(slot.id)) return slot;
    if (notes.toLowerCase().includes(slot.label.toLowerCase())) return slot;
  }
  return null;
}

export function isBookingExpiredOrMissed(ticket: {
  dropoff_date?: string;
  notes?: string;
  stage: number;
  status: string;
}): boolean {
  if (ticket.status === 'MISSED' || ticket.status === 'NO_SHOW') return true;
  if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') return false;
  if (ticket.stage > 1) return false;
  if (!ticket.dropoff_date) return false;

  const now = new Date();
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

  if (scheduledDate < today) return true;

  if (scheduledDate.getTime() === today.getTime()) {
    const slot = parseTimeSlotFromNotes(ticket.notes);
    if (slot) {
      const cutoffTime = new Date(bookYear, bookMonth, bookDay, slot.endHour, slot.endMinute + slot.graceMinutes, 0);
      if (now > cutoffTime) return true;
    } else {
      const defaultCutoff = new Date(bookYear, bookMonth, bookDay, 16, 30, 0);
      if (now > defaultCutoff) return true;
    }
  }

  return false;
}

/**
 * Admin Evaluator: Auto-expires missed bookings and logs audit entries
 */
export async function adminEvaluateAndExpireMissedBookings(): Promise<number> {
  try {
    const { data: tickets, error } = await supabase
      .from('service_tickets')
      .select('id, ticket_code, user_id, dropoff_date, notes, stage, status, service_type, motorcycles(model, plate_number)')
      .eq('stage', 1)
      .eq('status', 'IN_PROGRESS');

    if (error || !tickets || tickets.length === 0) return 0;

    const expiredToUpdate = tickets.filter(isBookingExpiredOrMissed);
    if (expiredToUpdate.length === 0) return 0;

    let updatedCount = 0;

    for (const ticket of expiredToUpdate) {
      const currentNotes = ticket.notes || '';
      const updatedNotes = currentNotes.includes('[MISSED_EXPIRATION]')
        ? currentNotes
        : `${currentNotes} | [MISSED_EXPIRATION: Drop-off window ended without check-in. Slot released.]`.trim();

      const { error: updateError } = await supabase
        .from('service_tickets')
        .update({
          status: 'MISSED',
          notes: updatedNotes,
        })
        .eq('id', ticket.id);

      if (!updateError) {
        updatedCount++;
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'BOOKING_EXPIRED_MISSED',
          actor: 'System Auto-Scheduler',
          details: 'Drop-off window ended without intake. Status changed to MISSED and inventory slot freed.',
          previousValue: 'IN_PROGRESS',
          newValue: 'MISSED',
        });
      }
    }

    return updatedCount;
  } catch (err) {
    console.error('adminEvaluateAndExpireMissedBookings error:', err);
    return 0;
  }
}

/**
 * Admin Manual Override: Late Check-in for customer who arrived past window
 */
export async function adminLateCheckInOverride(
  ticket: AdminTicket,
  actorName: string = 'Service Advisor (Admin)'
): Promise<boolean> {
  try {
    const currentNotes = ticket.notes || '';
    const updatedNotes = `${currentNotes} | [LATE_CHECKIN_OVERRIDE: Customer arrived late; manual check-in approved by ${actorName}]`.trim();

    const { error } = await supabase
      .from('service_tickets')
      .update({
        stage: 2, // Advance directly to Diagnostic Inspection
        status: 'IN_PROGRESS',
        notes: updatedNotes,
      })
      .eq('id', ticket.id);

    if (error) throw error;

    await recordAuditLog({
      ticketCode: ticket.ticket_code,
      action: 'LATE_CHECKIN_OVERRIDE',
      actor: actorName,
      details: 'Late check-in grace override approved. Re-activated and advanced to Stage 2: Diagnostic Check.',
      previousValue: ticket.status,
      newValue: 'IN_PROGRESS (Stage 2)',
    });

    if (typeof window !== 'undefined') {
      try {
        supabase.channel('motocare_dispatch_realtime').send({
          type: 'broadcast',
          event: 'TICKET_DISPATCH_SYNC',
          payload: { action: 'LATE_CHECKIN', ticket_code: ticket.ticket_code },
        });
      } catch {
        // ignore
      }
    }

    return true;
  } catch (err) {
    console.error('adminLateCheckInOverride error:', err);
    return false;
  }
}

/**
 * Admin Manual Override: Extend Grace Period by 1 Hour
 */
export async function adminExtendGracePeriod(
  ticket: AdminTicket,
  extraHours: number = 1,
  actorName: string = 'Service Advisor (Admin)'
): Promise<boolean> {
  try {
    const currentNotes = ticket.notes || '';
    const noteEntry = `[GRACE_EXTENDED: +${extraHours} hr grace period granted by ${actorName} at ${new Date().toLocaleTimeString()}]`;
    const updatedNotes = `${currentNotes} | ${noteEntry}`.trim();

    const { error } = await supabase
      .from('service_tickets')
      .update({
        status: 'IN_PROGRESS',
        stage: 1,
        notes: updatedNotes,
      })
      .eq('id', ticket.id);

    if (error) throw error;

    await recordAuditLog({
      ticketCode: ticket.ticket_code,
      action: 'GRACE_PERIOD_EXTENDED',
      actor: actorName,
      details: `Grace period extended by ${extraHours} hour(s) for customer arrival delay.`,
      previousValue: ticket.status,
      newValue: 'IN_PROGRESS (Grace Extended)',
    });

    return true;
  } catch (err) {
    console.error('adminExtendGracePeriod error:', err);
    return false;
  }
}

/**
 * Admin Assisted Reschedule: Move booking to a new date and time window
 */
export async function adminAssistedReschedule(
  ticket: AdminTicket,
  newDate: string,
  newTimeSlot: string,
  actorName: string = 'Service Advisor (Admin)'
): Promise<boolean> {
  try {
    let updatedNotes = ticket.notes || '';
    if (updatedNotes.includes('Arrival Window:')) {
      updatedNotes = updatedNotes.replace(/Arrival Window: [^|]+/, `Arrival Window: ${newTimeSlot}`);
    } else {
      updatedNotes = `${updatedNotes} | Arrival Window: ${newTimeSlot}`.trim();
    }

    updatedNotes = `${updatedNotes} | [ADMIN_RESCHEDULE: Assisted move to ${newDate} (${newTimeSlot}) by ${actorName}]`.trim();

    const { error } = await supabase
      .from('service_tickets')
      .update({
        dropoff_date: newDate,
        notes: updatedNotes,
        stage: 1,
        status: 'IN_PROGRESS',
      })
      .eq('id', ticket.id);

    if (error) throw error;

    await recordAuditLog({
      ticketCode: ticket.ticket_code,
      action: 'ADMIN_ASSISTED_RESCHEDULE',
      actor: actorName,
      details: `Rescheduled to ${newDate} (${newTimeSlot}) per customer call or front desk request.`,
      previousValue: `${ticket.dropoff_date || 'No Date'} (${ticket.status})`,
      newValue: `${newDate} (IN_PROGRESS)`,
    });

    // Notify customer in messages
    if (ticket.user_id) {
      try {
        await supabase.from('messages').insert({
          user_id: ticket.user_id,
          sender_role: 'admin',
          message: `[RESCHEDULE_CONFIRMED] ${JSON.stringify({
            type: 'RESCHEDULE_CONFIRMED',
            ticketCode: ticket.ticket_code,
            newDropoffDate: newDate,
            newTimeWindow: newTimeSlot,
            message: `Ang iyong appointment #${ticket.ticket_code} ay matagumpay na nai-reschedule ng Workshop Advisor sa ${newDate} (${newTimeSlot}).`,
          })}`,
        });
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      try {
        supabase.channel('motocare_dispatch_realtime').send({
          type: 'broadcast',
          event: 'TICKET_DISPATCH_SYNC',
          payload: { action: 'TICKET_RESCHEDULED', ticket_code: ticket.ticket_code },
        });
      } catch {
        // ignore
      }
    }

    return true;
  } catch (err) {
    console.error('adminAssistedReschedule error:', err);
    return false;
  }
}
