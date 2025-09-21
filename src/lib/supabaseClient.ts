// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,       // salva (IndexedDB)
      autoRefreshToken: true,     // renova sozinho
      detectSessionInUrl: true,   // útil se usar magic link
      storageKey: 'sr.auth',      // nome da store
    },
  }
);
