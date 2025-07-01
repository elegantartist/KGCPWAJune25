import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiRequest } from '@/lib/apiRequest';
import { useToast } from '@/hooks/use-toast';

// Define the shape of the user object
interface User {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  status: 'active' | 'pending_payment' | 'restricted';
  credits?: number;
}

// Define the shape of the authentication context state
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  paymentRequired: boolean;
  login: (data: { accessToken: string; user: User; paymentRequired: boolean }) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // --- FIX: Hydrate initial state from localStorage for stability ---
  const getInitialUser = (): User | null => {
    const storedUser = localStorage.getItem('currentUser');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  };

  const [user, setUser] = useState<User | null>(getInitialUser());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  // Set initial payment status based on the hydrated user
  const [paymentRequired, setPaymentRequired] = useState(user?.status === 'pending_payment');

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Prevent race conditions by only setting loading if not already loading
    setIsLoading(true);

    try {
      const userData = await apiRequest<User>('GET', '/api/users/me');
      if (userData) {
        setUser(userData);
        setPaymentRequired(userData.status === 'pending_payment');
        localStorage.setItem('currentUser', JSON.stringify(userData)); // Keep localStorage in sync
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('currentUser');
        setUser(null);
        setPaymentRequired(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('currentUser');
      setUser(null);
      setPaymentRequired(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Check for a payment success redirect from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const creditsPurchased = urlParams.get('credits_purchased');

    if (paymentSuccess) {
      toast({
        title: "Payment Successful!",
        description: "Verifying your subscription and unlocking your dashboard...",
      });
      checkAuth();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (creditsPurchased) {
      toast({
        title: "Purchase Successful!",
        description: "Your credits have been added to your account.",
      });
      checkAuth(); // Re-fetch user data to get updated credit count
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      checkAuth();
    }
  }, [checkAuth, toast]);

  const login = useCallback((data: { accessToken: string; user: User; paymentRequired: boolean }) => {
    localStorage.setItem('auth_token', data.accessToken);
    // Store user data for faster initial load on refresh
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    setUser(data.user);
    setPaymentRequired(data.paymentRequired);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('currentUser');
    setUser(null);
    setPaymentRequired(false);
    window.location.href = '/login'; // Force a full redirect to clear state
  }, []);

  const value = { user, isAuthenticated: !!user, isLoading, paymentRequired, login, logout, checkAuth };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}