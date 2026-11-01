import { supabase, db } from './supabase';

/**
 * Mobile number changes (migration 20): the rider asks, the owner verifies and changes it.
 * The database checks every rule (PH number, one open request, 30-day cooldown, owner only),
 * so these functions just pass the friendly error messages back.
 */
export type PhoneRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';

export interface PhoneChangeRequest {
  id: string;
  user_id: string;
  old_phone: string | null;
  new_phone: string;
  reason: string;
  status: PhoneRequestStatus;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decline_reason: string | null;
  /** Owner view only: the rider's name */
  rider_name?: string;
}

/** Days a rider waits after an approved change before asking again (same as the database) */
export const PHONE_CHANGE_COOLDOWN_DAYS = 30;

const COLUMNS = 'id, user_id, old_phone, new_phone, reason, status, requested_at, decided_by, decided_at, decline_reason';

function friendlyError(err: unknown, fallback: string): string {
  const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
  return message || fallback;
}

/* ---------------------------------------------------------------- Rider */

/** The rider's latest requests (newest first), enough to show the open one and the cooldown */
export async function fetchMyPhoneRequests(userId: string): Promise<PhoneChangeRequest[]> {
  const { data, error } = await supabase
    .from('phone_change_requests')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return (data || []) as PhoneChangeRequest[];
}

/** When the rider may ask again, or null if they can ask now */
export function nextPhoneChangeDate(requests: PhoneChangeRequest[]): Date | null {
  const lastApproved = requests
    .filter((r) => r.status === 'APPROVED' && r.decided_at)
    .map((r) => new Date(r.decided_at as string).getTime())
    .sort((a, b) => b - a)[0];
  if (!lastApproved) return null;
  const next = new Date(lastApproved + PHONE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return next.getTime() > Date.now() ? next : null;
}

export async function requestPhoneChange(
  userId: string,
  newPhoneDigits: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('phone_change_requests').insert({
    user_id: userId,
    new_phone: `+63${newPhoneDigits}`,
    reason: reason.trim(),
  });
  if (error) return { success: false, error: friendlyError(error, 'Could not send your request. Please try again.') };
  return { success: true };
}

export async function cancelPhoneRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('phone_change_requests').update({ status: 'CANCELLED' }).eq('id', requestId);
  if (error) return { success: false, error: friendlyError(error, 'Could not cancel the request.') };
  return { success: true };
}

/* ---------------------------------------------------------------- Owner */

/** Open requests with the rider's name, oldest first (first come, first served) */
export async function fetchPendingPhoneRequests(): Promise<PhoneChangeRequest[]> {
  const { data, error } = await db()
    .from('phone_change_requests')
    .select(`${COLUMNS}, profiles(full_name)`)
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: true });
  if (error || !data) return [];
  return (data as Array<PhoneChangeRequest & { profiles?: { full_name?: string } | { full_name?: string }[] | null }>).map(
    ({ profiles, ...row }) => {
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      return { ...row, rider_name: profile?.full_name || 'Rider' };
    }
  );
}

export async function approvePhoneChange(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await db().rpc('approve_phone_change', { p_request_id: requestId });
  if (error) return { success: false, error: friendlyError(error, 'Could not approve the change.') };
  return { success: true };
}

export async function declinePhoneChange(requestId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await db().rpc('decline_phone_change', { p_request_id: requestId, p_reason: reason.trim() });
  if (error) return { success: false, error: friendlyError(error, 'Could not decline the request.') };
  return { success: true };
}

/** "+639171234567" -> "+63 917 123 4567" for display */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '');
  const local = digits.startsWith('63') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits;
  if (!/^9\d{9}$/.test(local)) return phone || '—';
  return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
