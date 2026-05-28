import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

/**
 * Singleton Supabase client.
 *
 * Uses the anon (public) key, subject to Row Level Security policies.
 * For POC purposes, RLS is currently disabled on user_profiles and chat_history
 * — every client with this key can read/write all rows. Tighten before any
 * non-internal deployment.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
