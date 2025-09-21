// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Business {
  id: string; name: string; contact_email: string | null; contact_phone: string | null; timezone: string;
}
interface User {
  id: string; email: string; name: string; business?: Business | null;
}
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => { const c = useContext(AuthContext); if (!c) throw new Error('useAuth must be used within an AuthProvider'); return c; };

async function fetchUserBusiness(): Promise<Business | null> {
  const { data } = await supabase.from('businesses')
    .select('id, name, contact_email, contact_phone, timezone')
    .order('created_at', { ascending: true })
    .limit(1);
  return (data && data[0]) ? (data[0] as Business) : null;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // hidrata no boot
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setUser(null); return; }
      const payload = session.user;
      const biz = await fetchUserBusiness();
      setUser({
        id: payload.id,
        email: payload.email || '',
        name: (payload.email || '').split('@')[0],
        business: biz,
      });
    })();

    // escuta mudanças (login, refresh, logout)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { setUser(null); return; }
      const payload = session.user;
      const biz = await fetchUserBusiness();
      setUser({
        id: payload.id,
        email: payload.email || '',
        name: (payload.email || '').split('@')[0],
        business: biz,
      });
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user) return;
    const biz = await fetchUserBusiness();
    setUser({ ...user, business: biz });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAuthenticated = !!user;
  const value = useMemo(() => ({ user, isAuthenticated, refreshProfile, logout }), [user, isAuthenticated]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
