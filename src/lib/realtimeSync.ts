import { db } from './supabase';

/**
 * Single shared realtime channel used by every screen (Customer, Admin, Staff)
 * to announce ticket changes. Keeping one name avoids screens listening on
 * different channels and missing each other's updates.
 */
export const TICKET_SYNC_CHANNEL = 'motocare_dispatch_realtime';
export const TICKET_SYNC_EVENT = 'TICKET_DISPATCH_SYNC';

/**
 * Broadcasts a ticket change to all connected screens.
 * Never throws: realtime delivery is best-effort, and database
 * change events plus background polling act as the backup.
 */
export function broadcastTicketSync(payload: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    db()
      .channel(TICKET_SYNC_CHANNEL)
      .send({ type: 'broadcast', event: TICKET_SYNC_EVENT, payload })
      .catch(() => {});
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent('motocare_ticket_dispatched', { detail: payload }));
  } catch {
    // ignore
  }
}

/**
 * Wraps a function so that many rapid calls collapse into a single call
 * after `waitMs` of quiet time.
 */
export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return wrapped;
}
