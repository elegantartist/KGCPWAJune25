import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Motivation from "@/pages/motivation";
// Using EnhancedChatbot for all chatbot routes to fix CPD compliance issues
import EnhancedChatbot from "@/pages/enhanced-chatbot";
import MBPWiz from "@/pages/mbp-wiz";
import DietLogistics from "@/pages/diet-logistics";
import InspirationD from "@/pages/inspiration-d-new";
import InspirationEW from "@/pages/inspiration-ew";
import EWSupport from "@/pages/ew-support";
import Layout from "@/components/layout/Layout";
import DoctorDashboard from "@/pages/doctor-dashboard";
import DoctorSetup from "@/pages/DoctorSetup";
import DoctorLogin from "@/pages/DoctorLogin";
import AdminDashboard from "@/pages/admin-dashboard";
import UnifiedLogin from "@/pages/unified-login";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { useEffect } from "react";

// Import placeholder components for new pages
import Journaling from "@/pages/journaling";
import HealthSnapshots from "@/pages/health-snapshots";
import ProgressMilestones from "@/pages/progress-milestones";
import FoodDatabase from "@/pages/food-database";

// Protected Route component
function ProtectedRoute({ 
  component: Component, 
  requiredRole 
}: { 
  component: React.ComponentType, 
  requiredRole?: 'admin' | 'doctor' | 'patient' 
}) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    
    // TESTING FUNCTIONALITY: Allow admin to access any dashboard for testing
    // In production, we'll need to reinstate these role restrictions
    if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
      if (user?.role === 'doctor') {
        setLocation('/doctor-dashboard');
      } else if (user?.role === 'patient') {
        setLocation('/patient-dashboard');
      } else {
        setLocation('/');
      }
    }
  }, [isAuthenticated, user, requiredRole, setLocation]);
  
  if (!isAuthenticated) {
    return null; // Will redirect via effect
  }
  
  return <Component />;
}

// Component to handle default route redirection
function DefaultRedirect() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Check session-based authentication first, then localStorage
    fetch('/api/user/current-context')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Not authenticated');
      })
      .then(context => {
        // Route based on actual session data
        if (context.userRole === 'admin' && context.impersonatedDoctorId) {
          setLocation('/doctor-dashboard');
        } else if (context.userRole === 'admin' && context.impersonatedPatientId) {
          setLocation('/patient-dashboard');
        } else if (context.userRole === 'admin') {
          setLocation('/admin-dashboard');
        } else if (context.userRole === 'doctor') {
          setLocation('/doctor-dashboard');
        } else if (context.userRole === 'patient') {
          setLocation('/patient-dashboard');
        } else {
          setLocation('/login');
        }
      })
      .catch(() => {
        // Fallback to localStorage if session check fails
        const user = localStorage.getItem('currentUser');
        if (user) {
          try {
            const userData = JSON.parse(user);
            if (userData.role === 'admin') {
              setLocation('/admin-dashboard');
            } else if (userData.role === 'doctor') {
              setLocation('/doctor-dashboard');
            } else {
              setLocation('/patient-dashboard');
            }
          } catch (e) {
            setLocation('/login');
          }
        } else {
          setLocation('/login');
        }
      });
  }, [setLocation]);
  
  return null;
}

// Updated router to use the new single-page layout
function Router() {
  return (
    <Switch>
      {/* Default route now redirects to login */}
      <Route path="/">
        <DefaultRedirect />
      </Route>
      
      <Route path="/login" component={Login} />
      <Route path="/patient-login" component={PatientLogin} />
      <Route path="/admin-login" component={AdminLogin} />
      
      {/* Patient routes */}
      <Route path="/patient-dashboard">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <Dashboard />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <Profile />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <Dashboard />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/motivation">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <Motivation />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/inspiration-d">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <InspirationD />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/inspiration-d-new">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <InspirationD />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/inspiration-ew">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <InspirationEW />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/diet-logistics">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <DietLogistics />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/ew-support">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <EWSupport />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/mbp-wiz">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <MBPWiz />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/journaling">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <Journaling />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/health-snapshots">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <HealthSnapshots />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/progress-milestones">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <ProgressMilestones />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/food-database">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <FoodDatabase />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/chatbot">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <EnhancedChatbot />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      <Route path="/enhanced-chatbot">
        {() => (
          <ProtectedRoute component={() => (
            <Layout>
              <EnhancedChatbot />
            </Layout>
          )} requiredRole="patient" />
        )}
      </Route>
      
      {/* Doctor routes */}
      <Route path="/doctor-setup" component={DoctorSetup} />
      <Route path="/doctor-login" component={DoctorLogin} />
      <Route path="/doctor-dashboard">
        {() => (
          <ProtectedRoute component={DoctorDashboard} requiredRole="doctor" />
        )}
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin-dashboard">
        {() => (
          <ProtectedRoute component={AdminDashboard} requiredRole="admin" />
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
