import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

const INTERNAL_AUTH_KEY = 'motocare_internal_auth_session';
const INTERNAL_SUPABASE_TOKEN_KEY = 'motocare_internal_tab_auth_token';
const REMEMBERED_EMAIL_KEY = 'motocare_remembered_internal_email';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://cqkwlyqajtajkvctgdeu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q09s0Ukkdx0uTDeunRfUGA_BWx4uwNb';

/**
 * Dedicated Tab-Isolated Supabase Auth Client using sessionStorage.
 * Prevents Admin, Staff, and Customer tabs in the same browser from overwriting
 * or logging out each other's sessions.
 */
const internalTabAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    storageKey: INTERNAL_SUPABASE_TOKEN_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export interface InternalSession {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'staff';
  position: string;
  isActive: boolean;
  loggedAt: string;
}

/**
 * Returns the tab-isolated Supabase client when this tab has a real staff/admin
 * Supabase login, otherwise null. Used for queries (e.g. customer profiles) that
 * need staff permissions instead of the public anonymous access.
 */
export async function getInternalAuthedClient() {
  try {
    const { data } = await internalTabAuthClient.auth.getSession();
    return data.session ? internalTabAuthClient : null;
  } catch {
    return null;
  }
}

/**
 * Returns the Supabase Auth user id stored by this tab's internal auth client, or null.
 */
function getSupabaseAuthUserId(): string | null {
  try {
    const raw = sessionStorage.getItem(INTERNAL_SUPABASE_TOKEN_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return typeof stored?.user?.id === 'string' ? stored.user.id : null;
  } catch {
    return null;
  }
}

/**
 * Reads the active session for THIS specific browser tab (sessionStorage).
 * The session is only valid when this tab also holds a real Supabase Auth login
 * for the same user, so a hand-written session entry cannot unlock the console.
 */
export function getInternalSession(): InternalSession | null {
  try {
    // Discard any legacy shared localStorage session (pre-Supabase-only login)
    localStorage.removeItem(INTERNAL_AUTH_KEY);

    const tabRaw = sessionStorage.getItem(INTERNAL_AUTH_KEY);
    if (!tabRaw) return null;
    const session: InternalSession = JSON.parse(tabRaw);

    if (!session?.userId || session.userId !== getSupabaseAuthUserId()) {
      sessionStorage.removeItem(INTERNAL_AUTH_KEY);
      return null;
    }

    if (session) {
      // Automatic Purge: sanitize any stale 'Kuya Jun' or legacy name
      if (
        session.role === 'admin' ||
        (session.fullName && (session.fullName.toLowerCase().includes('kuya') || session.fullName.toLowerCase().includes('jun')))
      ) {
        if (session.role === 'admin') {
          session.fullName = 'Admin';
        } else if (session.fullName && (session.fullName.toLowerCase().includes('kuya') || session.fullName.toLowerCase().includes('jun'))) {
          session.fullName = 'Staff Member';
        }
        sessionStorage.setItem(INTERNAL_AUTH_KEY, JSON.stringify(session));
      }
      return session;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Saves the session strictly in THIS tab's sessionStorage so multiple tabs
 * (e.g. Tab 1 = Admin, Tab 2 = Staff) can run simultaneously without conflict.
 */
export function setInternalSession(session: InternalSession): void {
  try {
    sessionStorage.setItem(INTERNAL_AUTH_KEY, JSON.stringify(session));
    // Ensure legacy shared localStorage key is cleared so tabs don't collide
    localStorage.removeItem(INTERNAL_AUTH_KEY);
  } catch {
    // ignore
  }
}

/**
 * Logs out ONLY the current browser tab (`scope: 'local'`) without logging out
 * other open Staff, Admin, or Customer tabs.
 */
export function clearInternalSession(): void {
  try {
    sessionStorage.removeItem(INTERNAL_AUTH_KEY);
    localStorage.removeItem(INTERNAL_AUTH_KEY);
    internalTabAuthClient.auth.signOut({ scope: 'local' }).catch(() => {});
  } catch {
    // ignore
  }
}

export function getRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function setRememberedEmail(email: string): void {
  try {
    if (email) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Unified Login Authenticator for /internal
 * Uses Tab-Isolated Supabase Authentication only (no local/built-in account fallbacks).
 * Strictly inspects role & active status: Blocks 'customer' and deactivated staff accounts.
 */
export async function authenticateInternal(
  email: string,
  password?: string,
  rememberMe: boolean = false
): Promise<{ success: boolean; session?: InternalSession; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    return { success: false, error: 'Please enter both your work email and password.' };
  }

  try {
    const { data: authData, error: authError } =
      await internalTabAuthClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (!authError && authData.user) {
      // Inspect user profile in Supabase profiles table using select('*') to avoid missing-column errors
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      const resolvedRole = (
        profile?.role ||
        authData.user.user_metadata?.role ||
        'customer'
      ).toLowerCase();

      // STRICT ROLE GUARD: Customers are forbidden from the internal workshop floor
      if (resolvedRole !== 'admin' && resolvedRole !== 'staff') {
        await internalTabAuthClient.auth.signOut({ scope: 'local' });
        return {
          success: false,
          error: 'Access Denied: Invalid work credentials or unauthorized personnel.',
        };
      }

      // ACTIVE PERSONNEL CHECK: Block deactivated accounts
      if (profile && profile.is_active === false) {
        await internalTabAuthClient.auth.signOut({ scope: 'local' });
        return {
          success: false,
          error: 'Account Suspended: This personnel account has been deactivated by the Shop Owner.',
        };
      }

      const finalRole: 'admin' | 'staff' = resolvedRole === 'admin' ? 'admin' : 'staff';
      const session: InternalSession = {
        userId: authData.user.id,
        email: cleanEmail,
        fullName:
          profile?.full_name ||
          authData.user.user_metadata?.full_name ||
          (finalRole === 'admin' ? 'Shop Owner' : 'Workshop Staff'),
        role: finalRole,
        position:
          profile?.position ||
          (finalRole === 'admin' ? 'Shop Owner & General Manager' : 'Service Advisor'),
        isActive: true,
        loggedAt: new Date().toISOString(),
      };

      setInternalSession(session);
      setRememberedEmail(rememberMe ? cleanEmail : '');
      return { success: true, session };
    }

    return {
      success: false,
      error: 'Access Denied: Invalid work credentials or unauthorized personnel.',
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : 'Access Denied: Invalid work credentials or unauthorized personnel.';
    return { success: false, error: msg };
  }
}

