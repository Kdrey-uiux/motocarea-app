import { AuditLogEntry } from '../types/superadmin';
import { supabase } from '../lib/supabase';

const AUDIT_STORAGE_KEY = 'motocare_workshop_audit_logs';

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    return [];
  } catch (err) {
    console.error('Error reading audit logs:', err);
    return [];
  }
}

export async function recordSuperAdminAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    ...entry,
    id: `aud-sa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getAuditLogs();
    const updated = [newLog, ...current];
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated.slice(0, 300)));

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
      // Supabase table or offline fallback
    }

    return newLog;
  } catch (err) {
    console.error('Error saving audit log in superadmin:', err);
    return newLog;
  }
}
