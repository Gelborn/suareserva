// src/lib/supabaseAuthed.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// cache por token para evitar criar N clients por render
const cache = new Map<string, ReturnType<typeof createClient>>();

export function makeAuthedClient(accessToken: string) {
  const key = accessToken.slice(0, 16); // só pra diferenciar a storageKey
  const cacheKey = `sr-authed-${key}`;
  const found = cache.get(cacheKey);
  if (found) return found;

  const client = createClient(url, anon, {
    // envia o Bearer para todas as requisições (RLS)
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,          // não queremos que esse client gerencie sessão
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: cacheKey,           // storageKey único por token => sem warning
    },
  });

  cache.set(cacheKey, client);
  return client;
}
