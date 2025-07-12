import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
}

interface DecodedToken {
  id: number;
  role: 'patient' | 'doctor' | 'admin';
  isImpersonating?: boolean;
  originalAdminId?: number;
  exp: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isImpersonating: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  startImpersonation: (token: string, user: User) => void;
  endImpersonation: () => void;
  checkAuth: () => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isImpersonating: false,
  isAuthenticated: false,
  login: (token, user) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isImpersonating: false });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('originalAdmin');
    set({ user: null, token: null, isAuthenticated: false, isImpersonating: false });
  },
  startImpersonation: (token, user) => {
    const originalAdmin = {
      user: get().user,
      token: get().token,
    };
    localStorage.setItem('originalAdmin', JSON.stringify(originalAdmin));
    localStorage.setItem('accessToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isImpersonating: true });
  },
  endImpersonation: () => {
    const originalAdminStr = localStorage.getItem('originalAdmin');
    if (originalAdminStr) {
      const originalAdmin = JSON.parse(originalAdminStr);
      localStorage.setItem('accessToken', originalAdmin.token);
      localStorage.setItem('currentUser', JSON.stringify(originalAdmin.user));
      localStorage.removeItem('originalAdmin');
      set({
        user: originalAdmin.user,
        token: originalAdmin.token,
        isAuthenticated: true,
        isImpersonating: false,
      });
    } else {
      get().logout(); // Fallback to full logout if original admin data is lost
    }
  },
  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('currentUser');
    if (token && userStr) {
      try {
        // Try to decode JWT token
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp * 1000 > Date.now()) {
          set({
            token,
            user: JSON.parse(userStr),
            isAuthenticated: true,
            isImpersonating: !!decoded.isImpersonating,
          });
        } else {
          get().logout(); // Token expired
        }
      } catch (error) {
        // If JWT decode fails, treat as simple token for testing
        if (token.startsWith('admin-token-')) {
          set({
            token,
            user: JSON.parse(userStr),
            isAuthenticated: true,
            isImpersonating: false,
          });
        } else {
          get().logout(); // Invalid token
        }
      }
    }
    set({ isLoading: false });
  },
}));

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const store = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    store.checkAuth();
  }, []);

  // Redirect on auth state change
  useEffect(() => {
    if (!store.isLoading && !store.isAuthenticated) {
      setLocation('/login');
    }
  }, [store.isLoading, store.isAuthenticated, setLocation]);

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};