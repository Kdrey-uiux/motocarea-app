import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://cqkwlyqajtajkvctgdeu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q09s0Ukkdx0uTDeunRfUGA_BWx4uwNb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
