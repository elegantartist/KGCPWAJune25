import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth-context";
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
import AdminDashboard from "@/pages/admin-dashboard";
import { LoginDemo } from "@/pages/LoginDemo";
import AuthWrapper from "@/pages/auth-wrapper";

// Import placeholder components for new pages
import Journaling from "@/pages/journaling";
import HealthSnapshots from "@/pages/health-snapshots";
import ProgressMilestones from "@/pages/progress-milestones";
import FoodDatabase from "@/pages/food-database";
import DailySelfScores from "@/pages/daily-self-scores";

// Router with authentication integration
function Router() {
  return (
    <Switch>
      {/* Default route shows authentication wrapper */}
      <Route path="/" component={AuthWrapper} />
      
      {/* Direct access to dashboards */}
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      
      <Route path="/doctor-dashboard" component={DoctorDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      
      {/* Patient routes - all with layout */}
      <Route path="/profile">
        <Layout>
          <Profile />
        </Layout>
      </Route>
      <Route path="/motivation">
        <Layout>
          <Motivation />
        </Layout>
      </Route>
      <Route path="/inspiration-d">
        <Layout>
          <InspirationD />
        </Layout>
      </Route>
      <Route path="/inspiration-d-new">
        <Layout>
          <InspirationD />
        </Layout>
      </Route>
      <Route path="/inspiration-ew">
        <Layout>
          <InspirationEW />
        </Layout>
      </Route>
      <Route path="/diet-logistics">
        <Layout>
          <DietLogistics />
        </Layout>
      </Route>
      <Route path="/ew-support">
        <Layout>
          <EWSupport />
        </Layout>
      </Route>
      <Route path="/mbp-wiz">
        <Layout>
          <MBPWiz />
        </Layout>
      </Route>
      <Route path="/journaling">
        <Layout>
          <Journaling />
        </Layout>
      </Route>
      <Route path="/health-snapshots">
        <Layout>
          <HealthSnapshots />
        </Layout>
      </Route>
      <Route path="/progress-milestones">
        <Layout>
          <ProgressMilestones />
        </Layout>
      </Route>
      <Route path="/food-database">
        <Layout>
          <FoodDatabase />
        </Layout>
      </Route>
      <Route path="/daily-self-scores">
        <Layout>
          <DailySelfScores />
        </Layout>
      </Route>
      <Route path="/chatbot">
        <Layout>
          <EnhancedChatbot />
        </Layout>
      </Route>
      <Route path="/enhanced-chatbot">
        <Layout>
          <EnhancedChatbot />
        </Layout>
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
