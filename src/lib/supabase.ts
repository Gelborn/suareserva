// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente único e centralizado do Supabase
// Configurado para persistir sessão automaticamente e fazer refresh de tokens
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Persiste sessão automaticamente no IndexedDB
    autoRefreshToken: true,      // Renova tokens automaticamente
    detectSessionInUrl: false,   // Não detecta sessão na URL (evita conflitos)
    storageKey: 'suareserva-auth', // Chave única para o storage
  },
});