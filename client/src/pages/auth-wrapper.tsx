import { useState, useEffect } from 'react';
import KGCLanding from './kgc-landing';
import AdminDashboard from './admin-dashboard';
import DoctorDashboard from './doctor-dashboard';
import Dashboard from './dashboard';

type AuthState = 'landing' | 'authenticated';

interface AuthData {
  dashboardType: string;
  email: string;
  userId?: number;
}

export default function AuthWrapper() {
  const [authState, setAuthState] = useState<AuthState>('landing');
  const [authData, setAuthData] = useState<AuthData>({
    dashboardType: '',
    email: ''
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/email-auth/status');
      const data = await response.json();

      if (data.authenticated) {
        setAuthData({
          dashboardType: data.dashboardType,
          email: data.email,
          userId: data.userId
        });
        setAuthState('authenticated');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Stay on landing if error
    }
  };

  const handleAuthSuccess = (dashboardType: string, userId: number) => {
    setAuthData({
      dashboardType,
      email: '', // Will be set by session
      userId
    });
    setAuthState('authenticated');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/email-auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthData({
        dashboardType: '',
        email: ''
      });
      setAuthState('landing');
    }
  };

  // Render based on auth state
  if (authState === 'landing') {
    return <KGCLanding onAuthSuccess={handleAuthSuccess} />;
  }

  // Authenticated - render appropriate dashboard
  switch (authData.dashboardType) {
    case 'admin':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'patient':
      return <Dashboard />;
    default:
      return <KGCLanding onAuthSuccess={handleAuthSuccess} />;
  }
}