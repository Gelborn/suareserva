// src/lib/sessionMirror.ts
import { supabase } from './supabaseClient';

const LS_ACCESS = 'sr_access_token';
const LS_REFRESH = 'sr_refresh_token';

/** Espelha alterações de sessão no localStorage (resiliente a PWA “hibernar” IndexedDB) */
export function hookSessionMirror() {
  supabase.auth.onAuthStateChange((_event, session) => {
    try {
      if (session?.access_token && session?.refresh_token) {
        localStorage.setItem(LS_ACCESS, session.access_token);
        localStorage.setItem(LS_REFRESH, session.refresh_token);
      } else {
        localStorage.removeItem(LS_ACCESS);
        localStorage.removeItem(LS_REFRESH);
      }
    } catch {}
  });
}

/** Restaura sessão a partir do espelho (se o Supabase vier “vazio” no boot/foreground) */
export async function restoreSessionIfNeeded() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  try {
    const access_token = localStorage.getItem(LS_ACCESS);
    const refresh_token = localStorage.getItem(LS_REFRESH);
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
  } catch {}
}
