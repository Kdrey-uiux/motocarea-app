import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://cqkwlyqajtajkvctgdeu.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q09s0Ukkdx0uTDeunRfUGA_BWx4uwNb';

/** Customer / public client (session kept in localStorage). */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const WORKSHOP_TOKEN_STORAGE_KEY = 'motocare_internal_tab_auth_token';

/**
 * Staff/Admin client for the /internal console. Its login lives in this tab's
 * sessionStorage so Admin, Staff and Customer tabs in one browser never log each other out.
 */
export const workshopSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    storageKey: WORKSHOP_TOKEN_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

function isInternalRoute(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/internal');
}

/**
 * Database client for the current page: the staff/admin login on /internal pages,
 * the customer/public client everywhere else. Shared helpers (booking lifecycle,
 * settings, hardcopy, realtime) use this so row level security sees the right user.
 */
export function db() {
  return isInternalRoute() ? workshopSupabase : supabase;
}
