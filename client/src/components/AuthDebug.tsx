import { useAuth } from '@/hooks/useAuth';

export default function AuthDebug() {
  const auth = useAuth();
  
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, background: 'white', padding: '10px', border: '1px solid black', zIndex: 9999 }}>
      <h3>Auth Debug</h3>
      <p>Loading: {auth.isLoading ? 'true' : 'false'}</p>
      <p>Authenticated: {auth.isAuthenticated ? 'true' : 'false'}</p>
      <p>User: {auth.user ? JSON.stringify(auth.user) : 'null'}</p>
      <p>Token: {auth.token ? 'exists' : 'null'}</p>
    </div>
  );
}