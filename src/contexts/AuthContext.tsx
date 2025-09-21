// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { makeAuthedClient } from '../lib/supabaseAuthed';

interface Business {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  timezone: string;
}
interface User {
  id: string;
  email: string;
  name: string;
  business?: Business | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, accessToken: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const STORAGE_TOKEN = 'supabase_access_token';
const STORAGE_USER  = 'app_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

/** JWT utils (decodificação simples) */
function decodeJwtPayload<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const pad = (s: string) => s + '==='.slice((s.length + 3) % 4);
    const json = atob(pad(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
function isExpired(token: string | null) {
  if (!token) return true;
  const p = decodeJwtPayload<{ exp?: number }>(token);
  if (!p?.exp) return false;
  return p.exp <= Math.floor(Date.now() / 1000);
}

/** Busca 1º business do usuário autenticado (com RLS) */
async function fetchUserBusiness(accessToken: string): Promise<Business | null> {
  const sb = makeAuthedClient(accessToken);

  // Pega o primeiro business que o usuário tem acesso (padrão single-tenant).
  // Se tiver multi-tenant, você pode trocar por uma tela de seleção.
  const { data, error } = await sb
    .from('businesses')
    .select('id, name, contact_email, contact_phone, timezone')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[Auth] fetchUserBusiness error:', error);
    return null;
  }
  return (data && data[0]) ? (data[0] as Business) : null;
}

/** Monta o objeto User a partir do token + opcionalmente o business */
function buildUserFromToken(emailFallback: string, token: string, business?: Business | null): User {
  const payload = decodeJwtPayload<{ sub?: string; email?: string }>(token);
  const email = (payload?.email || emailFallback).toLowerCase();
  const id = payload?.sub || 'user';
  return {
    id,
    email,
    name: email.split('@')[0],
    business: business ?? null,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_TOKEN); } catch { return null; }
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  });

  const isAuthenticated = !!accessToken && !!user && !isExpired(accessToken);

  /** Hidrata na 1ª carga: se tem token mas não tem user/business, busca no DB */
  useEffect(() => {
    (async () => {
      if (!accessToken) return;

      if (isExpired(accessToken)) {
        logout();
        return;
      }

      // se já temos user com business, ok.
      if (user?.business) return;

      // tenta buscar business e reconstruir user
      const biz = await fetchUserBusiness(accessToken);
      const hydrated = buildUserFromToken(user?.email || '', accessToken, biz || undefined);
      setUser(hydrated);
      try { localStorage.setItem(STORAGE_USER, JSON.stringify(hydrated)); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // só na montagem

  /** Sincroniza entre abas */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_TOKEN) {
        setAccessToken(localStorage.getItem(STORAGE_TOKEN));
      }
      if (e.key === STORAGE_USER) {
        const raw = localStorage.getItem(STORAGE_USER);
        setUser(raw ? JSON.parse(raw) : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Permite forçar re-buscar o business (ex: após criar loja) */
  const refreshProfile = async () => {
    if (!accessToken || !user) return;
    const biz = await fetchUserBusiness(accessToken);
    const next = { ...user, business: biz };
    setUser(next);
    try { localStorage.setItem(STORAGE_USER, JSON.stringify(next)); } catch {}
  };

  /** Login após verify OTP (você recebe o accessToken do Supabase) */
  const login = async (email: string, token: string) => {
    try { localStorage.setItem(STORAGE_TOKEN, token); } catch {}
    setAccessToken(token);

    // busca business do usuário sob RLS
    const biz = await fetchUserBusiness(token);
    const u = buildUserFromToken(email, token, biz || undefined);

    setUser(u);
    try { localStorage.setItem(STORAGE_USER, JSON.stringify(u)); } catch {}
  };

  const logout = () => {
    try { localStorage.removeItem(STORAGE_TOKEN); } catch {}
    try { localStorage.removeItem(STORAGE_USER); } catch {}
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isAuthenticated, accessToken, login, logout, refreshProfile }),
    [user, isAuthenticated, accessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
