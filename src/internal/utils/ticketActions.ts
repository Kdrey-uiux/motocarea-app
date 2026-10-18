import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from './databaseAuditLogger';
import { InternalTicket } from '../types/internal';

/**
 * Workshop ticket actions shared by the Queue and the Action Center,
 * so both screens behave exactly the same.
 */

const RLS_WRITE_ERROR = 'Database write permission error. Please run migration 03_service_tickets.sql.';

export function isPendingOnlineBooking(t: { status: string; notes?: string | null }): boolean {
  return t.status === 'PENDING_CONFIRMATION' || Boolean(t.notes && t.notes.includes('[BOOKING:PENDING_CONFIRMATION]'));
}

/**
 * True when an online booking's motorcycle is not at the shop yet (pending approval,
 * scheduled for a later date, or confirmed but not checked in). Such units must be
 * checked in before they can be put on a bay.
 */
export function isAwaitingArrival(t: {
  status: string;
  notes?: string | null;
  dropoff_date?: string | null;
  is_walk_in?: boolean;
}): boolean {
  if (t.is_walk_in) return false;
  if (isPendingOnlineBooking(t)) return true;
  if (t.notes?.includes('[BOOKING:PENDING_DROPOFF]')) return true;
  return Boolean(t.dropoff_date && t.dropoff_date > todayDateString());
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Accepts an online booking. Future-dated bookings move to Scheduled (awaiting drop-off),
 * same-day bookings go straight to Stage 1 intake.
 */
export async function acceptOnlineBooking(
  ticket: InternalTicket,
  actor: string
): Promise<{ success: boolean; error?: string }> {
  let cleanedNotes = (ticket.notes || '').replace('[BOOKING:PENDING_CONFIRMATION]', '').trim();

  const isAdvanceDate = Boolean(ticket.dropoff_date && ticket.dropoff_date > todayDateString());
  if (isAdvanceDate && !cleanedNotes.includes('[BOOKING:PENDING_DROPOFF]')) {
    cleanedNotes = cleanedNotes ? `${cleanedNotes} [BOOKING:PENDING_DROPOFF]` : '[BOOKING:PENDING_DROPOFF]';
  }

  const updates = {
    status: 'IN_PROGRESS',
    stage: 1,
    notes: cleanedNotes,
  };

  const { data, error } = await db()
    .from('service_tickets')
    .update(updates)
    .eq('id', ticket.id)
    .select('id, ticket_code');

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: RLS_WRITE_ERROR };

  await recordAuditLog({
    ticketCode: ticket.ticket_code,
    action: 'BOOKING_CONFIRMED',
    actor,
    details: isAdvanceDate
      ? `Online booking accepted for scheduled drop-off date: ${ticket.dropoff_date}.`
      : 'Online booking accepted and placed into Stage 1 intake.',
    previousValue: ticket.status,
    newValue: 'IN_PROGRESS',
  });

  broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });
  return { success: true };
}

/**
 * Declines a pending online booking, or cancels/voids any other ticket, with a reason.
 */
export async function cancelOrDeclineTicket(
  ticket: InternalTicket,
  reason: string,
  actor: string
): Promise<{ success: boolean; error?: string }> {
  const cleanReason = reason.trim();
  if (!cleanReason) return { success: false, error: 'Please specify a cancellation reason.' };

  const isPending = isPendingOnlineBooking(ticket);
  const updates = {
    status: 'CANCELLED',
    cancellation_reason: cleanReason,
    cancelled_by: actor,
    cancelled_at: new Date().toISOString(),
    notes: (ticket.notes || '').replace('[BOOKING:PENDING_CONFIRMATION]', '').trim(),
  };

  const { data, error } = await db()
    .from('service_tickets')
    .update(updates)
    .eq('id', ticket.id)
    .select('id, ticket_code');

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: RLS_WRITE_ERROR };

  await recordAuditLog({
    ticketCode: ticket.ticket_code,
    action: isPending ? 'BOOKING_DECLINED' : 'TICKET_CANCELLED',
    actor,
    details: isPending
      ? `Online booking declined. Reason: ${cleanReason}`
      : `Ticket cancelled and voided. Reason: ${cleanReason}`,
    previousValue: ticket.status,
    newValue: 'CANCELLED',
  });

  broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });
  return { success: true };
}
