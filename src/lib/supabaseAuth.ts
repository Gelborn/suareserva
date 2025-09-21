// src/lib/supabaseAuth.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Singleton exclusivo para fluxos de AUTH (OTP, verify, etc.)
export const supabaseAuth = createClient(url, anon, {
  auth: {
    persistSession: false,        // não usa storage interno do SDK
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sr-auth',        // chave única => evita o warning
  },
});
