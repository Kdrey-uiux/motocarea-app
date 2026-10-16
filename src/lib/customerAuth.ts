import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type CustomerSessionCheck =
  | { status: 'customer'; user: User }
  | { status: 'workshop' }
  | { status: 'none' };

export const WORKSHOP_ACCOUNT_ON_CUSTOMER_LOGIN_MESSAGE =
  'This account cannot be used to sign in here. Please sign in with a customer account.';

/**
 * Verifies the stored customer login against Supabase (not just browser storage)
 * and makes sure it belongs to a customer.
 * - Deleted / revoked accounts are signed out locally -> 'none'
 * - Admin & staff accounts are signed out of the customer side -> 'workshop'
 *   (they must never be routed from the customer login into the workshop console)
 */
export async function verifyCustomerSession(): Promise<CustomerSessionCheck> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { status: 'none' };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // 401/403 = account deleted or token revoked. Other errors (e.g. offline) keep the local session.
    if (!error || error.status === 401 || error.status === 403) {
      await supabase.auth.signOut({ scope: 'local' });
      return { status: 'none' };
    }
    return { status: 'customer', user: session.user };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role?.toLowerCase();
  if (role === 'admin' || role === 'staff') {
    await supabase.auth.signOut({ scope: 'local' });
    return { status: 'workshop' };
  }

  return { status: 'customer', user };
}
