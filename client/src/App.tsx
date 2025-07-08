import React, { Suspense, lazy } from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import { PageLoader } from '@/components/PageLoader';

// Lazy-load pages for better performance and smaller initial bundle size.
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const PatientDashboard = lazy(() => import('@/pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('@/pages/doctor-dashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const PatientProfilePage = lazy(() => import('@/pages/PatientProfilePage'));
const DailyScoresPage = lazy(() => import('@/pages/DailyScoresPage'));
const ProgressMilestonesPage = lazy(() => import('@/pages/ProgressMilestonesPage'));
const DoctorSetupPage = lazy(() => import('@/pages/DoctorSetupPage'));

function App() {
  const { isImpersonating } = useAuth();

  return (
    <>
      {isImpersonating && <ImpersonationBanner />}
      <main className={isImpersonating ? 'pt-12' : ''}>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            {/* Public Routes */}
            <Route path="/login" component={LoginPage} />
            <Route path="/doctor/setup" component={DoctorSetupPage} />

            {/* Patient Routes */}
            <Route path="/patient-dashboard">
              <ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>
            </Route>
            <Route path="/daily-scores">
              <ProtectedRoute role="patient"><DailyScoresPage /></ProtectedRoute>
            </Route>
            <Route path="/progress-milestones">
              <ProtectedRoute role="patient"><ProgressMilestonesPage /></ProtectedRoute>
            </Route>

            {/* Doctor Routes */}
            <Route path="/doctor-dashboard">
              <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
            </Route>
            <Route path="/doctor/patient/:id">
              <ProtectedRoute role="doctor"><PatientProfilePage /></ProtectedRoute>
            </Route>

            {/* Admin Route */}
            <Route path="/admin-dashboard">
              <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
            </Route>

            {/* Default Redirect */}
            <Route><Redirect to="/login" /></Route>
          </Switch>
        </Suspense>
      </main>
      <Toaster />
    </>
  );
}
export default App;
