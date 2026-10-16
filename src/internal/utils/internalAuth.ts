import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getLocalStaffRegistry } from './databaseStaffManager';

const INTERNAL_AUTH_KEY = 'motocare_internal_auth_session';
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
    storageKey: 'motocare_internal_tab_auth_token',
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
 * Reads the active session for THIS specific browser tab (sessionStorage).
 * Falls back to migrating any legacy localStorage session into sessionStorage once.
 */
export function getInternalSession(): InternalSession | null {
  try {
    let session: InternalSession | null = null;
    const tabRaw = sessionStorage.getItem(INTERNAL_AUTH_KEY);
    if (tabRaw) {
      session = JSON.parse(tabRaw);
    } else {
      // One-time migration if a legacy localStorage session exists
      const legacyRaw = localStorage.getItem(INTERNAL_AUTH_KEY);
      if (legacyRaw) {
        sessionStorage.setItem(INTERNAL_AUTH_KEY, legacyRaw);
        localStorage.removeItem(INTERNAL_AUTH_KEY);
        session = JSON.parse(legacyRaw);
      }
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

const BUILTIN_WORKSHOP_ACCOUNTS: Record<
  string,
  {
    passwords: string[];
    userId: string;
    fullName: string;
    role: 'admin' | 'staff';
    position: string;
  }
> = {
  'admin@motocare.ph': {
    passwords: ['admin2026!', 'admin123'],
    userId: 'staff-admin-01',
    fullName: 'Admin',
    role: 'admin',
    position: 'Workshop Administrator',
  },
  'owner@motocare.ph': {
    passwords: ['admin123', 'admin2026!'],
    userId: 'staff-admin-02',
    fullName: 'Admin',
    role: 'admin',
    position: 'Workshop Administrator',
  },
  'staff@motocare.ph': {
    passwords: ['staff2026!', 'staff123'],
    userId: 'staff-generic-01',
    fullName: 'Workshop Staff',
    role: 'staff',
    position: 'Service Advisor & Floor Staff',
  },
};

/**
 * Unified Login Authenticator for /internal
 * Uses Tab-Isolated Supabase Authentication + Verified Workshop Personnel Registry.
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
    // 1. Check if this staff member has been deactivated in the workshop staff registry
    const staffRegistry = getLocalStaffRegistry();
    const registeredStaff = staffRegistry.find(
      (s) => s.email.trim().toLowerCase() === cleanEmail
    );

    if (registeredStaff && registeredStaff.isActive === false) {
      return {
        success: false,
        error: 'Account Suspended: This personnel account has been deactivated by the Shop Owner.',
      };
    }

    // 2. Try authenticating via Tab-Isolated Supabase Auth first
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
        registeredStaff?.role ||
        authData.user.user_metadata?.role ||
        'customer'
      ).toLowerCase();

      // STRICT ROLE GUARD: Customers are forbidden from the internal workshop floor
      if (resolvedRole === 'customer' && !BUILTIN_WORKSHOP_ACCOUNTS[cleanEmail] && !registeredStaff) {
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
          registeredStaff?.fullName ||
          authData.user.user_metadata?.full_name ||
          (finalRole === 'admin' ? 'Shop Owner' : 'Workshop Staff'),
        role: finalRole,
        position:
          profile?.position ||
          registeredStaff?.position ||
          (finalRole === 'admin' ? 'Shop Owner & General Manager' : 'Service Advisor'),
        isActive: true,
        loggedAt: new Date().toISOString(),
      };

      setInternalSession(session);
      setRememberedEmail(rememberMe ? cleanEmail : '');
      return { success: true, session };
    }

    // 3. Check verified workshop personnel registry (for newly created staff or built-in accounts)
    if (registeredStaff && registeredStaff.password && registeredStaff.password === password) {
      const session: InternalSession = {
        userId: registeredStaff.id,
        email: cleanEmail,
        fullName: registeredStaff.fullName,
        role: registeredStaff.role === 'admin' ? 'admin' : 'staff',
        position: registeredStaff.position,
        isActive: true,
        loggedAt: new Date().toISOString(),
      };
      setInternalSession(session);
      setRememberedEmail(rememberMe ? cleanEmail : '');
      return { success: true, session };
    }

    const builtin = BUILTIN_WORKSHOP_ACCOUNTS[cleanEmail];
    if (builtin && builtin.passwords.includes(password)) {
      const session: InternalSession = {
        userId: builtin.userId,
        email: cleanEmail,
        fullName: registeredStaff?.fullName || builtin.fullName,
        role: builtin.role,
        position: registeredStaff?.position || builtin.position,
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

