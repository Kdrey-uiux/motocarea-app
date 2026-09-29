import { AuditLogEntry } from '../types/admin';
import { supabase } from '../lib/supabase';

const AUDIT_STORAGE_KEY = 'motocare_workshop_audit_logs';

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    ticketCode: 'MC-7201',
    action: 'TICKET_DISPATCHED',
    actor: 'Service Advisor (Admin)',
    details: 'Initial check-in and stage progression initiated for intake queue',
    previousValue: 'Queued (Pending)',
    newValue: 'Dispatched to Bay 01',
  },
  {
    id: 'aud-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    ticketCode: 'MC-7201',
    action: 'MECHANIC_ASSIGNMENT',
    actor: 'Service Advisor (Admin)',
    details: 'Assigned Lead Technician for transmission diagnosis',
    previousValue: 'Unassigned',
    newValue: 'Kuya Jun (Lead Tech)',
  },
  {
    id: 'aud-003',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    ticketCode: 'MC-7201',
    action: 'STAGE_CHANGE',
    actor: 'Kuya Jun (Lead Tech)',
    details: 'Disassembly completed, starting CVT pulley deglazing',
    previousValue: 'Stage 2: Diagnosis',
    newValue: 'Stage 3: Service & Replacement',
  },
];

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    return INITIAL_AUDIT_LOGS;
  } catch (err) {
    console.error('Error reading audit logs:', err);
    return INITIAL_AUDIT_LOGS;
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
    const updated = [newLog, ...current];
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated.slice(0, 200)));

    try {
      await supabase.from('audit_logs').insert({
        ticket_code: entry.ticketCode,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
        previous_value: entry.previousValue || null,
        new_value: entry.newValue || null,
        created_at: newLog.timestamp,
      });
    } catch {
      // Offline fallback
    }

    return newLog;
  } catch (err) {
    console.error('Error saving audit log:', err);
    return newLog;
  }
}
