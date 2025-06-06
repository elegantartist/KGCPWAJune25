import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  uin?: string;
  token?: string; // JWT token for authenticated requests
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: any) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  
  // Check for existing token on initial load
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Validate token with backend
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const userObj = {
            id: data.user.id,
            name: data.user.name,
            role: data.user.role,
            uin: data.user.uin,
            token: token
          };
          setUser(userObj);
        } else {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_id');
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthentication();
  }, []);

  const login = (userData: any) => {
    // Handle JWT login response
    if (userData.access_token && userData.user) {
      const userObj = {
        id: userData.user.id,
        name: userData.user.name,
        role: userData.user.role,
        uin: userData.user.uin,
        token: userData.access_token
      };
      
      setUser(userObj);
      localStorage.setItem('auth_token', userData.access_token);
      localStorage.setItem('user_role', userData.user.role);
      localStorage.setItem('user_id', userData.user.id.toString());
      
      // Redirect based on role
      switch (userData.user.role) {
        case 'admin':
          setLocation('/admin-dashboard');
          break;
        case 'doctor':
          setLocation('/doctor-dashboard');
          break;
        case 'patient':
          setLocation('/patient-dashboard');
          break;
        default:
          setLocation('/');
      }
    } else {
      // Handle legacy user object
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('currentUser');
    setLocation('/');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
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