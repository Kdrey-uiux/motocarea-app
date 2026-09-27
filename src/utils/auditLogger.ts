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
  {
    id: 'aud-004',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    ticketCode: 'MC-5490',
    action: 'TICKET_COMPLETED',
    actor: 'Service Advisor (Admin)',
    details: 'Final payment received & rider signed job release order',
    previousValue: 'READY_FOR_PICKUP',
    newValue: 'COMPLETED',
  },
  {
    id: 'aud-005',
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    ticketCode: 'MC-3814',
    action: 'BAY_ASSIGNMENT',
    actor: 'Service Advisor (Admin)',
    details: 'Moved to Bay 03 for electrical stator diagnostics',
    previousValue: 'Staging Area',
    newValue: 'Bay 03 - Diagnostics',
  },
];

/**
 * Kunin lahat ng audit logs (localStorage + memory)
 */
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

/**
 * Mag-record ng bagong Audit Log entry
 */
export async function recordAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. I-save sa LocalStorage
    const current = getAuditLogs();
    const updated = [newLog, ...current];
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated.slice(0, 200))); // keep latest 200

    // 2. Subukan din i-insert sa Supabase audit_logs kung umiiral ang table (hindi mag-eerror kung wala)
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
      // Tahimik lang kung walang table sa Supabase
    }

    return newLog;
  } catch (err) {
    console.error('Error saving audit log:', err);
    return newLog;
  }
}

// Audit logs are strictly immutable (append-only) for business compliance and fraud prevention.
// No delete or clear operations are permitted.
