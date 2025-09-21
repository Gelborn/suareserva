// src/lib/supabasePublic.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  // Ajuda a detectar env faltando logo de cara
  console.warn('[supabasePublic] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabasePublic = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: false, // aqui é só para as chamadas OTP (não vamos usar a sessão do supabase-js)
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
