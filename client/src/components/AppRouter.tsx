import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { useAuth } from '@/context/auth-context'; // Assuming this is the path

import UnifiedLoginPage from '@/pages/Login';
// import { PaymentWall } from '@/components/PaymentWall'; // Component removed
import { RestrictedAccessWall } from '@/components/RestrictedAccessWall';
import NotFound from '@/pages/not-found';

// Lazy load pages for better performance
const PatientDashboard = React.lazy(() => import('@/pages/dashboard'));
const DoctorDashboard = React.lazy(() => import('@/pages/doctor-dashboard'));
const AdminDashboard = React.lazy(() => import('@/pages/admin-dashboard'));
const DoctorSetup = React.lazy(() => import('@/pages/DoctorSetup'));
const EnhancedChatbot = React.lazy(() => import('@/pages/enhanced-chatbot'));
const DailySelfScores = React.lazy(() => import('@/pages/profile'));
const ProgressMilestones = React.lazy(() => import('@/pages/progress-milestones'));
const Journaling = React.lazy(() => import('@/pages/journaling'));
const InspirationD = React.lazy(() => import('@/pages/inspiration-d'));
const InspirationEW = React.lazy(() => import('@/pages/inspiration-ew'));
const DietLogistics = React.lazy(() => import('@/pages/diet-logistics'));
const EWSupport = React.lazy(() => import('@/pages/ew-support'));
const MBPWiz = React.lazy(() => import('@/pages/mbp-wiz'));
const Motivation = React.lazy(() => import('@/pages/motivation'));
const HealthSnapshots = React.lazy(() => import('@/pages/health-snapshots'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    {/* Replace with your actual loader component if you have one */}
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export function AppRouter() {
  const { isAuthenticated, user, isLoading, paymentRequired } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={UnifiedLoginPage} />
        {/* Doctor setup is a public route accessible via a tokenized link */}
        <Route path="/doctor-setup" component={DoctorSetup} />
        {/* Redirect all other paths to login if not authenticated */}
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  // If authenticated but payment is required, show the restricted wall
  if (paymentRequired) {
    return <RestrictedAccessWall />;
  }

  // If authenticated but access is restricted, show the restricted wall
  if (user?.status === 'restricted') {
    return <RestrictedAccessWall />;
  }

  // If authenticated and active, render the main application routes
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <Switch>
        {/* Main dashboard routes based on role */}
        <Route path="/">
          {user?.role === 'patient' && <Redirect to="/dashboard" />}
          {user?.role === 'doctor' && <Redirect to="/doctor-dashboard" />}
          {user?.role === 'admin' && <Redirect to="/admin-dashboard" />}
        </Route>
        <Route path="/dashboard" component={PatientDashboard} />
        <Route path="/doctor-dashboard" component={DoctorDashboard} />
        <Route path="/admin-dashboard" component={AdminDashboard} />

        {/* Feature routes */}
        <Route path="/enhanced-chatbot" component={EnhancedChatbot} />
        <Route path="/profile" component={DailySelfScores} />
        <Route path="/progress-milestones" component={ProgressMilestones} />
        <Route path="/journaling" component={Journaling} />
        <Route path="/inspiration-d" component={InspirationD} />
        <Route path="/inspiration-ew" component={InspirationEW} />
        <Route path="/diet-logistics" component={DietLogistics} />
        <Route path="/ew-support" component={EWSupport} />
        <Route path="/mbp-wiz" component={MBPWiz} />
        <Route path="/motivation" component={Motivation} />
        <Route path="/health-snapshots" component={HealthSnapshots} />

        {/* Fallback 404 route */}
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
}