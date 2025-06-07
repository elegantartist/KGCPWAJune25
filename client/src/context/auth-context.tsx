// In client/src/context/auth-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '../lib/apiRequest';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
}

interface AuthContextType {
  user: User | null;
  login: (data: { access_token: string; user: User }) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setLocation('/login');
  }, [setLocation]);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await apiRequest('/api/users/me');
        setUser(userData);
      } catch (error) {
        logout();
      } finally {
        setLoading(false);
      }
    };
    validateSession();
  }, [logout]);

  const login = (data: { access_token: string; user: User }) => {
    localStorage.setItem('auth_token', data.access_token);
    setUser(data.user);
    setLocation(data.user ? `/${data.user.role}-dashboard` : '/login');
  };

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Authenticating...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};