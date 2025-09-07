import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  business?: {
    name: string;
    type: string;
    slug: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => void;
  sendMagicLink: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const isAuthenticated = !!user;

  const login = async (email: string, password: string) => {
    // Mock login - replace with Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      id: '1',
      email,
      name: 'João Silva',
      business: {
        name: 'Barbearia do João',
        type: 'beauty',
        slug: 'barbearia-do-joao'
      }
    });
  };

  const register = async (email: string, password: string, businessName: string) => {
    // Mock register - replace with Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      id: '1',
      email,
      name: businessName,
      business: {
        name: businessName,
        type: 'beauty',
        slug: businessName.toLowerCase().replace(/\s+/g, '-')
      }
    });
  };

  const sendMagicLink = async (email: string) => {
    // Mock magic link - replace with Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Magic link sent to:', email);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      register,
      logout,
      sendMagicLink
    }}>
      {children}
    </AuthContext.Provider>
  );
};