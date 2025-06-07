import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from './context/auth-context';
import UnifiedLoginPage from './pages/Login';
import DoctorDashboard from './pages/doctor-dashboard';
import Dashboard from './pages/dashboard'; // Patient dashboard
import AdminDashboard from './pages/admin-dashboard';
import ProfilePage from './pages/profile';

const ProtectedRoute = ({ component: Component, requiredRole, ...rest }: any) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>; // Or a loading spinner
    }

    if (!user) {
        return <Redirect to="/login" />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to their own dashboard if they access the wrong one
        return <Redirect to={`/${user.role}-dashboard`} />;
    }

    return <Route {...rest} component={Component} />;
};

function AppRoutes() {
    return (
        <Switch>
            <Route path="/login" component={UnifiedLoginPage} />
            
            <ProtectedRoute path="/doctor-dashboard" component={DoctorDashboard} requiredRole="doctor" />
            <ProtectedRoute path="/patient-dashboard" component={Dashboard} requiredRole="patient" />
            <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} requiredRole="admin" />
            <ProtectedRoute path="/profile" component={ProfilePage} requiredRole="patient" />

            {/* Default route redirects to login if not authenticated, or to role-specific dashboard if authenticated */}
            <Route>
                {() => {
                    const { user, loading } = useAuth();
                    if (loading) return null;
                    return <Redirect to={user ? `/${user.role}-dashboard` : "/login"} />;
                }}
            </Route>
        </Switch>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppRoutes />
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    );
}