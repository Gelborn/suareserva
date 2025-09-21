// ───────────────────────────────────────────────────────────────────────────────
// File: src/lib/supabase.ts  (UPDATED)
// ───────────────────────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Ensure a single client in dev/HMR to avoid duplicate GoTrue instances.
// Also guarantees a single storageKey for session persistence.
const globalForSupabase = globalThis as unknown as { __sro_supabase?: SupabaseClient };

export const supabase: SupabaseClient =
  globalForSupabase.__sro_supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'suareserva-auth',
    },
  });

if (!globalForSupabase.__sro_supabase) globalForSupabase.__sro_supabase = supabase;
