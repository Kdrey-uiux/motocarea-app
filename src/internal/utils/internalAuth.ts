import { workshopSupabase, WORKSHOP_TOKEN_STORAGE_KEY } from '../../lib/supabase';
import { getCaptchaToken } from '../../lib/captcha';

const INTERNAL_AUTH_KEY = 'motocare_internal_auth_session';
const INTERNAL_SUPABASE_TOKEN_KEY = WORKSHOP_TOKEN_STORAGE_KEY;
const REMEMBERED_EMAIL_KEY = 'motocare_remembered_internal_email';

/** Tab-isolated staff/admin Supabase client (see lib/supabase). */
const internalTabAuthClient = workshopSupabase;

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

    return session;
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
    const captchaToken = await getCaptchaToken('staff_login');
    const { data: authData, error: authError } =
      await internalTabAuthClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
        options: { captchaToken },
      });

    // Created but not confirmed yet (usually a staff account made before migration 13)
    if (authError && authError.message.toLowerCase().includes('email not confirmed')) {
      return {
        success: false,
        error: 'This account is not confirmed yet. Ask the Shop Owner to recreate it, or confirm it in Supabase.',
      };
    }

    if (!authError && authData.user) {
      // The role comes only from the profiles table (signup metadata is user-editable)
      const { data: profile } = await internalTabAuthClient
        .from('profiles')
        .select('full_name, role, position, is_active')
        .eq('id', authData.user.id)
        .maybeSingle();

      const resolvedRole = String(profile?.role || 'customer').toLowerCase();

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
          (finalRole === 'admin' ? 'Shop Owner & General Manager' : 'Staff'),
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

