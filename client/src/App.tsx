import { Switch, Route, Redirect } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import PatientDashboard from '@/pages/PatientDashboard';
import DoctorDashboard from '@/pages/doctor-dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import PatientProfilePage from '@/pages/PatientProfilePage';
import DailyScoresPage from '@/pages/DailyScoresPage';
import ProgressMilestonesPage from '@/pages/ProgressMilestonesPage';
import DoctorSetupPage from '@/pages/DoctorSetupPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import ImpersonationBanner from '@/components/ImpersonationBanner';

function App() {
  const { isImpersonating } = useAuth();

  return (
    <>
      {isImpersonating && <ImpersonationBanner />}
      <main className={isImpersonating ? 'pt-12' : ''}>
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
      </main>
      <Toaster />
    </>
  );
}
export default App;
