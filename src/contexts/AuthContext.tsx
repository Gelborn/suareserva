import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within an AuthProvider');
  return c;
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // controla apenas se já tiramos o "Carregando…"
  const initialDoneRef = useRef(false);

  const hydrateFromSession = (session: import('@supabase/supabase-js').Session | null) => {
    if (!session) {
      setUser(null);
      return;
    }
    const payload = session.user;
    setUser({
      id: payload.id,
      email: payload.email || '',
      name: (payload.email || '').split('@')[0],
    });
  };

  useEffect(() => {
    // 1) principal: confiar no INITIAL_SESSION para boot (vem do storage do Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        hydrateFromSession(session);
        if (!initialDoneRef.current) {
          initialDoneRef.current = true;
          setIsAuthLoading(false);
        }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        hydrateFromSession(session);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
    });

    // 2) fallback: se por algum motivo o INITIAL_SESSION não chegar, usamos getSession uma vez
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!initialDoneRef.current) {
          hydrateFromSession(session);
          initialDoneRef.current = true;
          setIsAuthLoading(false);
        }
      } catch {
        if (!initialDoneRef.current) {
          initialDoneRef.current = true;
          setIsAuthLoading(false);
        }
      }
    })();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAuthenticated = !!user;

  const value = useMemo(
    () => ({ user, isAuthenticated, isAuthLoading, logout }),
    [user, isAuthenticated, isAuthLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
