import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from './context/auth-context';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { offlineQueueService } from './services/offlineQueueService';
import { useEffect } from 'react';
import UnifiedLoginPage from './pages/Login';
import DoctorDashboard from './pages/doctor-dashboard';
import Dashboard from './pages/dashboard'; // Patient dashboard
import AdminDashboard from './pages/admin-dashboard';
import ProfilePage from './pages/profile';
import MotivationPage from './pages/motivation';
import InspirationDPage from './pages/inspiration-d';
import DietLogisticsPage from './pages/diet-logistics';
import InspirationEWPage from './pages/inspiration-ew';
import EWSupportPage from './pages/ew-support';
import MBPWizPage from './pages/mbp-wiz';
import JournalingPage from './pages/journaling';
import HealthSnapshotsPage from './pages/health-snapshots';
import ProgressMilestonesPage from './pages/progress-milestones';
import FoodDatabasePage from './pages/food-database';
import EnhancedChatbotPage from './pages/enhanced-chatbot';

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
            <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} requiredRole="admin" />
            
            {/* Patient feature routes - all use the same Layout template */}
            <ProtectedRoute path="/profile" component={ProfilePage} requiredRole="patient" />
            <ProtectedRoute path="/motivation" component={MotivationPage} requiredRole="patient" />
            <ProtectedRoute path="/inspiration-d" component={InspirationDPage} requiredRole="patient" />
            <ProtectedRoute path="/diet-logistics" component={DietLogisticsPage} requiredRole="patient" />
            <ProtectedRoute path="/inspiration-ew" component={InspirationEWPage} requiredRole="patient" />
            <ProtectedRoute path="/ew-support" component={EWSupportPage} requiredRole="patient" />
            <ProtectedRoute path="/mbp-wiz" component={MBPWizPage} requiredRole="patient" />
            <ProtectedRoute path="/journaling" component={JournalingPage} requiredRole="patient" />
            <ProtectedRoute path="/health-snapshots" component={HealthSnapshotsPage} requiredRole="patient" />
            <ProtectedRoute path="/progress-milestones" component={ProgressMilestonesPage} requiredRole="patient" />
            <ProtectedRoute path="/food-database" component={FoodDatabasePage} requiredRole="patient" />
            <ProtectedRoute path="/enhanced-chatbot" component={EnhancedChatbotPage} requiredRole="patient" />
            <ProtectedRoute path="/" component={Dashboard} requiredRole="patient" />

            {/* Default route redirects to login if not authenticated, or to role-specific dashboard if authenticated */}
            <Route>
                {() => {
                    const { user, loading } = useAuth();
                    if (loading) return null;
                    if (!user) return <Redirect to="/login" />;
                    
                    // Patient role goes to root path (patient dashboard template)
                    if (user.role === 'patient') return <Redirect to="/" />;
                    
                    // Other roles go to their specific dashboards
                    return <Redirect to={`/${user.role}-dashboard`} />;
                }}
            </Route>
        </Switch>
    );
}

export default function App() {
    const isOnline = useOnlineStatus();
    
    useEffect(() => {
        // When coming back online, sync offline messages
        if (isOnline) {
            offlineQueueService.syncOfflineMessages();
        }
    }, [isOnline]);
    
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <div className="relative">
                    <AppRoutes />
                    <Toaster />
                    
                    {/* App-wide offline indicator banner */}
                    {!isOnline && (
                        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-center p-2 text-sm z-50">
                            You are currently offline. Some features may be limited.
                        </div>
                    )}
                </div>
            </AuthProvider>
        </QueryClientProvider>
    );
}