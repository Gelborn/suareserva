// src/lib/supabaseAuthed.ts
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

/**
 * Cria um client que envia Authorization: Bearer <token> em TODAS as requisições.
 * Útil quando você já tem o access_token (OTP verify) e quer usar RLS direto.
 */
export function makeAuthedClient(accessToken: string) {
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
