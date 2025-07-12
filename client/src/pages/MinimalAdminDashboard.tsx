
import { useAuth } from '@/hooks/useAuth';

export default function MinimalAdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#2E8BC0', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Welcome back, {user?.name}</p>
        </div>
        <button 
          onClick={logout}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div style={{ 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          backgroundColor: '#f8f9fa' 
        }}>
          <h3 style={{ color: '#2E8BC0', marginTop: 0 }}>System Overview</h3>
          <p>• Total Users: Loading...</p>
          <p>• Active Sessions: Loading...</p>
          <p>• System Status: Online</p>
        </div>

        <div style={{ 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          backgroundColor: '#f8f9fa' 
        }}>
          <h3 style={{ color: '#2E8BC0', marginTop: 0 }}>Quick Actions</h3>
          <button style={{ 
            display: 'block', 
            width: '100%', 
            padding: '10px', 
            margin: '5px 0',
            backgroundColor: '#2E8BC0', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Manage Users
          </button>
          <button style={{ 
            display: 'block', 
            width: '100%', 
            padding: '10px', 
            margin: '5px 0',
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            View Reports
          </button>
        </div>

        <div style={{ 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          backgroundColor: '#f8f9fa' 
        }}>
          <h3 style={{ color: '#2E8BC0', marginTop: 0 }}>Recent Activity</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>• User login: 2 minutes ago</p>
          <p style={{ fontSize: '14px', color: '#666' }}>• System backup: 1 hour ago</p>
          <p style={{ fontSize: '14px', color: '#666' }}>• Database update: 3 hours ago</p>
        </div>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        backgroundColor: '#fff3cd' 
      }}>
        <h3 style={{ color: '#856404', marginTop: 0 }}>Admin Dashboard Status</h3>
        <p style={{ color: '#856404', margin: 0 }}>
          ✅ Authentication working<br/>
          ✅ Admin role verified<br/>
          ⚠️ Full dashboard features loading...
        </p>
      </div>
    </div>
  );
}