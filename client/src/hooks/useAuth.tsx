import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Updated User interface to include status and credits
interface User {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  status: 'active' | 'pending_payment' | 'restricted'; // Added from auth-context.tsx
  credits?: number; // Added from auth-context.tsx
}

interface DecodedToken {
  id: number;
  role: 'patient' | 'doctor' | 'admin';
  isImpersonating?: boolean;
  originalAdminId?: number;
  exp: number;
}

// Updated AuthState to include paymentRequired
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isImpersonating: boolean;
  isAuthenticated: boolean;
  paymentRequired: boolean; // Added from auth-context.tsx
  login: (token: string, user: User, paymentRequiredStatus?: boolean) => void; // Modified login
  logout: () => void;
  startImpersonation: (token: string, user: User) => void;
  endImpersonation: () => void;
  checkAuth: () => Promise<void>; // Modified to be async
  setPaymentRequired: (status: boolean) => void; // Added setter for paymentRequired
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isImpersonating: false,
  isAuthenticated: false,
  paymentRequired: false, // Initialize paymentRequired
  login: (token, user, paymentRequiredStatus) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    // paymentRequiredStatus can be passed, or determined from user.status
    const isPaymentRequired = paymentRequiredStatus !== undefined ? paymentRequiredStatus : user.status === 'pending_payment';
    set({ user, token, isAuthenticated: true, isImpersonating: false, paymentRequired: isPaymentRequired });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('originalAdmin');
    set({ user: null, token: null, isAuthenticated: false, isImpersonating: false, paymentRequired: false }); // Reset paymentRequired
  },
  startImpersonation: (token, user) => {
    const originalAdmin = {
      user: get().user,
      token: get().token,
    };
    localStorage.setItem('originalAdmin', JSON.stringify(originalAdmin));
    localStorage.setItem('accessToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    // Impersonated user's payment status is not relevant here, admin is active
    set({ user, token, isAuthenticated: true, isImpersonating: true, paymentRequired: false });
  },
  endImpersonation: () => {
    const originalAdminStr = localStorage.getItem('originalAdmin');
    if (originalAdminStr) {
      const originalAdmin = JSON.parse(originalAdminStr) as { user: User; token: string | null }; // Type assertion
      localStorage.setItem('accessToken', originalAdmin.token || ''); // Handle null token
      localStorage.setItem('currentUser', JSON.stringify(originalAdmin.user));
      localStorage.removeItem('originalAdmin');
      set({
        user: originalAdmin.user,
        token: originalAdmin.token,
        isAuthenticated: true,
        isImpersonating: false,
        paymentRequired: originalAdmin.user.status === 'pending_payment', // Set payment status for original admin
      });
    } else {
      get().logout(); // Fallback to full logout if original admin data is lost
    }
  },
  checkAuth: async () => { // Made async to align with auth-context.tsx potentially
    set({ isLoading: true }); // Set loading true at the start of check
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('currentUser');

    if (token && userStr) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp * 1000 > Date.now()) {
          const currentUser = JSON.parse(userStr) as User; // Type assertion
          set({
            token,
            user: currentUser,
            isAuthenticated: true,
            isImpersonating: !!decoded.isImpersonating,
            paymentRequired: currentUser.status === 'pending_payment', // Set based on stored user
          });
        } else {
          get().logout(); // Token expired
        }
      } catch (error) {
        console.error("Auth check (decode/parse) failed:", error);
        get().logout(); // Invalid token or user data
      }
    } else {
      // No token or user, ensure logout state
      get().logout();
    }
    set({ isLoading: false });
  },
  setPaymentRequired: (status: boolean) => set({ paymentRequired: status }), // Added setter
}));

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const store = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast(); // Get toast from the hook

  useEffect(() => {
    // checkAuth is now async, handle it if needed
    store.checkAuth().then(() => {
        // Initial check complete, now handle Stripe redirects
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const creditsPurchased = urlParams.get('credits_purchased');

        if (paymentSuccess) {
          toast({
            title: "Payment Successful!",
            description: "Verifying your subscription and unlocking your dashboard...",
          });
          store.checkAuth(); // Re-check auth to get updated user status
          store.setPaymentRequired(false); // Explicitly set paymentRequired to false
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (creditsPurchased) {
          toast({
            title: "Purchase Successful!",
            description: "Your credits have been added to your account.",
          });
          store.checkAuth(); // Re-fetch user data to get updated credit count
          window.history.replaceState({}, document.title, window.location.pathname);
        }
    });
  }, [store, toast]); // store and toast are dependencies

  // Redirect on auth state change
  useEffect(() => {
    if (!store.isLoading && !store.isAuthenticated) {
      // Only redirect if not already on a public path (e.g. /login, /doctor/setup)
      const publicPaths = ['/login', '/doctor/setup'];
      if (!publicPaths.includes(window.location.pathname)) {
        setLocation('/login');
      }
    }
  }, [store.isLoading, store.isAuthenticated, store.user, setLocation]); // Added store.user to re-check if user logs out

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};