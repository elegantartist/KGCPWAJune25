import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: any) => void;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_token');
    setLocation('/');
  }, [setLocation]);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser({ ...userData, token });
        } else {
          logout(); // Token is invalid or expired
        }
      } catch (error) {
        console.error("Token validation failed", error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [logout]);

  const login = (userData: { access_token: string; user: { id: number; name: string; role: 'admin' | 'doctor' | 'patient' } }) => {
    if (userData.access_token && userData.user) {
      const userWithToken = { ...userData.user, token: userData.access_token };
      localStorage.setItem('auth_token', userData.access_token);
      setUser(userWithToken);
      
      switch (userWithToken.role) {
        case 'admin': setLocation('/admin-dashboard'); break;
        case 'doctor': setLocation('/doctor-dashboard'); break;
        case 'patient': setLocation('/patient-dashboard'); break;
        default: setLocation('/');
      }
    }
  };

  const value = { user, login, logout, loading, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Loading Application...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};