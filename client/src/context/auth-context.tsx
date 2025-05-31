import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  uin?: string; // Optional UIN for user identification (visible only to admin)
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();
  
  // Check for existing user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    setLocation('/login');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Custom hook to redirect if not authenticated
export const useRequireAuth = (
  requiredRole?: 'admin' | 'doctor' | 'patient',
  redirectPath: string = '/login'
) => {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation(redirectPath);
    } else if (requiredRole && user?.role !== requiredRole) {
      // Redirect based on role - for role-specific access control
      if (user?.role === 'admin') {
        setLocation('/admin-dashboard');
      } else if (user?.role === 'doctor') {
        setLocation('/doctor-dashboard');
      } else if (user?.role === 'patient') {
        setLocation('/');
      }
    }
  }, [isAuthenticated, user, requiredRole, redirectPath, setLocation]);

  return { user, isAuthenticated };
};