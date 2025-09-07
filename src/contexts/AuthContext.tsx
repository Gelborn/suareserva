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
  login: (email: string, accessToken: string) => Promise<void>;
  logout: () => void;
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

  const login = async (email: string, accessToken: string) => {
    // Store the access token and user info
    localStorage.setItem('supabase_access_token', accessToken);
    
    // Extract user info from token or make API call to get user details
    setUser({
      id: '1',
      email,
      name: email.split('@')[0],
      business: {
        name: 'Meu Negócio',
        type: 'beauty',
        slug: 'meu-negocio'
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('supabase_access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};