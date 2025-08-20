import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  uin: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (uin: string, name: string, role: 'admin' | 'doctor' | 'patient') => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            // Get full user data from localStorage as backup
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } else {
              // Create minimal user object from backend response
              setUser({
                id: data.user.id,
                role: data.user.role,
                uin: '',
                name: ''
              });
            }
          }
        } else {
          // Clear any stale localStorage data
          localStorage.removeItem('currentUser');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('currentUser');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (uin: string, name: string, role: 'admin' | 'doctor' | 'patient'): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ uin, name, role }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        return true;
      } else {
        console.error('Login failed:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    
    // Call backend logout
    fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    }).then(() => {
      window.location.href = '/login';
    }).catch(error => {
      console.error('Logout error:', error);
      window.location.href = '/login';
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
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