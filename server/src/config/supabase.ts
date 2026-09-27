import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Subukang i-load ang .env mula sa iba't ibang posibleng paths (cwd, server folder, o root .env.local)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_ANON_KEY is missing in server .env');
}

// Client para sa public at client operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client gamit ang service_role key kung mayroon (bypasses RLS para sa admin dispatch)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
