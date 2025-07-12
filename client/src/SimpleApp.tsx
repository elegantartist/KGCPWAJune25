
import { Switch, Route, Redirect } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import MinimalAdminDashboard from '@/pages/MinimalAdminDashboard';

function SimpleApp() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/admin-dashboard">
        {isAuthenticated && user?.role === 'admin' ? (
          <MinimalAdminDashboard />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route>
        <Redirect to={isAuthenticated ? `/${user?.role}-dashboard` : '/login'} />
      </Route>
    </Switch>
  );
}

export default SimpleApp;