import { AuditLogEntry } from '../types/internal';
import { supabase } from '../../lib/supabase';

const AUDIT_STORAGE_KEY = 'motocare_internal_audit_logs';
const AUDIT_REALTIME_CHANNEL = 'motocare_audit_realtime';

// Setup Supabase Realtime channel listener for cross-device audit sync
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel(AUDIT_REALTIME_CHANNEL)
      .on('broadcast', { event: 'AUDIT_LOG_ENTRY' }, (payload) => {
        if (payload.payload && payload.payload.log) {
          const newEntry = payload.payload.log as AuditLogEntry;
          const current = getLocalAuditLogs();
          if (!current.some((l) => l.id === newEntry.id)) {
            const updated = [newEntry, ...current].slice(0, 300);
            localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('motocare_audit_updated'));
          }
        }
      })
      .subscribe();
  } catch {
    // Ignore network error
  }
}

function getLocalAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  } catch {
    // ignore
  }
  return [];
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    // Try fetching from Supabase database table `audit_logs` first
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(300);

    if (!error && Array.isArray(data) && data.length > 0) {
      const dbLogs: AuditLogEntry[] = data.map((d: any) => ({
        id: String(d.id || d.ticket_code),
        timestamp: d.timestamp || d.created_at || new Date().toISOString(),
        ticketCode: d.ticket_code || d.ticketCode || 'SYSTEM',
        action: d.action || 'LOG',
        actor: d.actor || 'System',
        details: d.details || '',
        previousValue: d.previous_value || d.previousValue,
        newValue: d.new_value || d.newValue,
      }));
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(dbLogs));
      return dbLogs;
    }
  } catch {
    // Ignore table missing error, fallback to local
  }

  return getLocalAuditLogs();
}

export async function recordAuditLog(entry: {
  ticketCode: string;
  action: string;
  actor: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}): Promise<void> {
  const newLog: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ticketCode: entry.ticketCode,
    action: entry.action,
    actor: entry.actor,
    details: entry.details,
    previousValue: entry.previousValue || 'None',
    newValue: entry.newValue || 'None',
  };

  // 1. Try persisting to Supabase `audit_logs` database table
  try {
    await supabase.from('audit_logs').insert({
      id: newLog.id,
      timestamp: newLog.timestamp,
      ticket_code: newLog.ticketCode,
      action: newLog.action,
      actor: newLog.actor,
      details: newLog.details,
      previous_value: newLog.previousValue,
      new_value: newLog.newValue,
    });
  } catch {
    // Fallback if table does not exist yet
  }

  // 2. Persist to local storage
  const current = getLocalAuditLogs();
  const updated = [newLog, ...current].slice(0, 300);
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // 3. Broadcast across all active tabs and devices
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('motocare_audit_updated'));
    try {
      supabase.channel(AUDIT_REALTIME_CHANNEL).send({
        type: 'broadcast',
        event: 'AUDIT_LOG_ENTRY',
        payload: { log: newLog },
      });
    } catch {
      // ignore
    }
  }
}

export const fetchDatabaseAuditLogs = fetchAuditLogs;

