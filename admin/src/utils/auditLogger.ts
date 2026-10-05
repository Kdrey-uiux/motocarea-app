import { AuditLogEntry, AdminTicket } from '../types/admin';
import { supabase } from '../lib/supabase';

const AUDIT_STORAGE_KEY = 'motocare_workshop_audit_logs';
const AUDIT_REALTIME_CHANNEL = 'motocare_audit_realtime';

// Setup Supabase Realtime channel listener for cross-device audit sync
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel(AUDIT_REALTIME_CHANNEL)
      .on('broadcast', { event: 'AUDIT_LOG_ENTRY' }, (payload) => {
        if (payload.payload && payload.payload.log) {
          const newEntry = payload.payload.log as AuditLogEntry;
          const current = getAuditLogs();
          if (!current.some((l) => l.id === newEntry.id)) {
            const updated = [newEntry, ...current].slice(0, 300);
            localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('motocare_audit_updated'));
          }
        }
      })
      .subscribe();
  } catch {
    // ignore
  }
}

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Purge any legacy dummy entries containing "MC-7201"
      const clean = parsed.filter(
        (log) => !['aud-001', 'aud-002', 'aud-003'].includes(log.id) && log.ticketCode !== 'MC-7201'
      );
      return clean.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    return [];
  } catch (err) {
    console.error('Error reading audit logs:', err);
    return [];
  }
}

/**
 * Automatically integrates live tickets from database into audit log if missing
 */
export function syncAuditFromTickets(tickets: AdminTicket[]): void {
  try {
    const current = getAuditLogs();
    const existingIds = new Set(current.map((l) => l.id));
    const newLogs: AuditLogEntry[] = [];

    tickets.forEach((t) => {
      const intakeId = `aud-intake-${t.id}`;
      if (!existingIds.has(intakeId)) {
        newLogs.push({
          id: intakeId,
          timestamp: t.created_at || new Date().toISOString(),
          ticketCode: t.ticket_code,
          action: 'TICKET_CREATED',
          actor: t.customer_name || 'Rider Customer',
          details: `Service intake booked: ${t.service_type} for ${t.motorcycles?.model || 'Motorcycle'} (${t.motorcycles?.plate_number || 'No Plate'})`,
          previousValue: 'Intake Submitted',
          newValue: `Stage ${t.stage}: ${t.status}`,
        });
      }

      if (t.assigned_bay && !t.assigned_bay.includes('Pending')) {
        const bayId = `aud-bay-${t.id}`;
        if (!existingIds.has(bayId)) {
          newLogs.push({
            id: bayId,
            timestamp: t.updated_at || t.created_at || new Date().toISOString(),
            ticketCode: t.ticket_code,
            action: 'BAY_ASSIGNMENT',
            actor: 'Workshop Dispatch (Admin / Staff)',
            details: `Assigned unit to ${t.assigned_bay}. Assigned technician: ${t.assigned_mechanic || 'Queued'}`,
            previousValue: 'Bay Assignment Pending',
            newValue: t.assigned_bay,
          });
        }
      }

      if (t.status === 'COMPLETED') {
        const compId = `aud-comp-${t.id}`;
        if (!existingIds.has(compId)) {
          newLogs.push({
            id: compId,
            timestamp: t.updated_at || t.created_at || new Date().toISOString(),
            ticketCode: t.ticket_code,
            action: 'TICKET_COMPLETED',
            actor: 'Service Advisor (Admin / Staff)',
            details: `Work completed and motorcycle released to customer: ${t.motorcycles?.model || 'Unit'}`,
            previousValue: 'IN_PROGRESS',
            newValue: 'COMPLETED',
          });
        }
      }
    });

    if (newLogs.length > 0) {
      const merged = [...newLogs, ...current].slice(0, 300);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(merged));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('motocare_audit_updated'));
      }
    }
  } catch (err) {
    console.error('Error syncing audit from tickets:', err);
  }
}

export async function recordAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getAuditLogs();
    const updated = [newLog, ...current].slice(0, 300);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('motocare_audit_updated'));
      try {
        supabase.channel(AUDIT_REALTIME_CHANNEL).send({
          type: 'broadcast',
          event: 'AUDIT_LOG_ENTRY',
          payload: { log: newLog },
        });
      } catch {
        // ignore network error
      }
    }

    return newLog;
  } catch (err) {
    console.error('Error saving audit log:', err);
    return newLog;
  }
}
