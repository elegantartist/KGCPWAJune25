import React from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'patient' | 'doctor' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={`/login?redirect=${location}`} />;
  }

  // If a specific role is required, check if the user has that role.
  if (role && user?.role !== role) {
    const defaultDashboard = `/${user?.role}-dashboard`;
    return <Redirect to={defaultDashboard} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;