# Frontend-Backend Integration with cPanel

This document provides comprehensive instructions for integrating the KGC application frontend hosted on cPanel with the AWS backend services, ensuring seamless connectivity while maintaining robust security and an optimal user experience.

## Architecture Overview

The KGC application uses a distributed architecture with:

1. **Frontend (cPanel)**: Serves the static React application at www.keepgoingcare.com
2. **Authentication (AWS Cognito)**: Manages user authentication and session state
3. **API Layer (AWS API Gateway)**: Provides secure access to backend services
4. **Backend Services (AWS)**: Processes business logic and data operations
5. **Database (AWS RDS)**: Stores application data securely

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   User Browser  │◄────►│  cPanel Hosting │◄────►│  AWS Cognito    │
│                 │      │  Frontend       │      │  Authentication  │
└────────┬────────┘      └────────┬────────┘      └─────────────────┘
         │                        │                        ▲
         │                        ▼                        │
         │               ┌─────────────────┐              │
         └──────────────►│  AWS API Gateway│◄─────────────┘
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  AWS Backend    │
                         │  Services       │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  AWS RDS        │
                         │  Database       │
                         └─────────────────┘
```

## Prerequisites

Before integrating frontend and backend:
- Complete [cPanel Account Setup](./01-cpanel-account-setup.md)
- Complete [Frontend Deployment](./02-frontend-deployment.md)
- Complete [Security Configuration](./03-security-configuration.md)
- Have AWS backend services and API Gateway operational
- Have Cognito User Pools configured

## Step 1: Configure Environment Variables

The frontend application needs environment variables to connect to backend services.

### Using .env Files for Build-Time Configuration

1. **Create Environment Configuration Files**
   - For production:

```env
# .env.production
VITE_API_URL=https://api.keepgoingcare.com
VITE_COGNITO_REGION=ap-southeast-2
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_IDENTITY_POOL_ID=ap-southeast-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_STORAGE_BUCKET=kgc-patient-uploads
```

2. **Build the Application with Environment Variables**
   - When building the application, use:

```bash
npm run build
```

3. **Verify Configuration in Built Files**
   - Check that environment variables are correctly included in the build
   - Use browser developer tools to inspect Network tab and Console for errors

### Using Runtime Configuration (Alternative Approach)

For more flexibility, use a runtime configuration file:

1. **Create config.js File**
   - In the public directory of your build, create a config.js file:

```javascript
// public/config.js
window.KGC_CONFIG = {
  apiUrl: 'https://api.keepgoingcare.com',
  cognitoRegion: 'ap-southeast-2',
  cognitoUserPoolId: 'ap-southeast-2_xxxxxxxxx',
  cognitoAppClientId: 'xxxxxxxxxxxxxxxxxxxx',
  cognitoIdentityPoolId: 'ap-southeast-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  storageBucket: 'kgc-patient-uploads'
};
```

2. **Include config.js in index.html**
   - Edit index.html to include this script before the main application:

```html
<script src="%PUBLIC_URL%/config.js"></script>
```

3. **Access Configuration in Application**
   - Update your application code to use the runtime configuration:

```javascript
// Example usage in code
const apiUrl = window.KGC_CONFIG.apiUrl || process.env.VITE_API_URL;
```

## Step 2: Configure API Endpoints

### Centralized API Service

Create a centralized API service to handle all backend communication:

1. **Create API Service File**
   - Create or update the API service file:

```javascript
// src/services/api.js
import { Auth } from 'aws-amplify';

// Get API URL from environment or runtime config
const API_URL = window.KGC_CONFIG?.apiUrl || import.meta.env.VITE_API_URL;

// Helper for getting auth token
async function getAuthHeader() {
  try {
    const session = await Auth.currentSession();
    return {
      Authorization: `Bearer ${session.getIdToken().getJwtToken()}`
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return {};
  }
}

// Base API request function with authentication
export async function apiRequest(method, endpoint, data = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...await getAuthHeader(),
    };
    
    const options = {
      method,
      headers,
      credentials: 'include',
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    // Handle 401 Unauthorized (token expired)
    if (response.status === 401) {
      // Attempt to refresh token
      try {
        await Auth.currentSession({ bypassCache: true });
        // Retry the request with fresh token
        return apiRequest(method, endpoint, data);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    // For 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error(`API ${method} ${endpoint} error:`, error);
    throw error;
  }
}

// Convenience methods
export const api = {
  get: (endpoint) => apiRequest('GET', endpoint),
  post: (endpoint, data) => apiRequest('POST', endpoint, data),
  put: (endpoint, data) => apiRequest('PUT', endpoint, data),
  patch: (endpoint, data) => apiRequest('PATCH', endpoint, data),
  delete: (endpoint) => apiRequest('DELETE', endpoint),
};
```

2. **Use API Service in Components**
   - Import and use the API service in components:

```javascript
// Example usage in a component
import { api } from '../services/api';
import { useState, useEffect } from 'react';

function HealthMetrics() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const data = await api.get('/api/health-metrics');
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, []);
  
  // Component render logic
}
```

## Step 3: Configure AWS Amplify for Authentication

AWS Amplify provides a robust authentication system that integrates with Cognito:

1. **Configure Amplify in Your Application**
   - Update the Amplify configuration file:

```javascript
// src/config/amplify-config.js
import { Amplify } from 'aws-amplify';

// Get config from environment or runtime config
const config = {
  region: window.KGC_CONFIG?.cognitoRegion || import.meta.env.VITE_COGNITO_REGION,
  userPoolId: window.KGC_CONFIG?.cognitoUserPoolId || import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolWebClientId: window.KGC_CONFIG?.cognitoAppClientId || import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
  identityPoolId: window.KGC_CONFIG?.cognitoIdentityPoolId || import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
};

export const initializeAmplify = () => {
  Amplify.configure({
    Auth: {
      region: config.region,
      userPoolId: config.userPoolId,
      userPoolWebClientId: config.userPoolWebClientId,
      identityPoolId: config.identityPoolId,
      oauth: {
        domain: `auth.${window.location.hostname}`,
        scope: ['email', 'profile', 'openid'],
        redirectSignIn: window.location.origin,
        redirectSignOut: window.location.origin,
        responseType: 'code'
      }
    },
    Storage: {
      AWSS3: {
        bucket: window.KGC_CONFIG?.storageBucket || import.meta.env.VITE_STORAGE_BUCKET,
        region: config.region
      }
    }
  });
};
```

2. **Initialize Amplify in Application**
   - Update your main application file:

```javascript
// src/main.jsx or src/App.jsx
import { initializeAmplify } from './config/amplify-config';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize Amplify when the app loads
    initializeAmplify();
  }, []);
  
  // Rest of your app code
}
```

## Step 4: Implement Authentication Logic

Create authentication hooks and components that work with Cognito:

1. **Create Authentication Hook**
   - Implement a hook for authentication state and functions:

```javascript
// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { Auth } from 'aws-amplify';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check authentication state on load
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Function to check current authentication state
  async function checkAuth() {
    try {
      setLoading(true);
      const currentUser = await Auth.currentAuthenticatedUser();
      setUser(currentUser);
    } catch (err) {
      // Not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  
  // Login function
  async function login(username, password) {
    try {
      setLoading(true);
      setError(null);
      const user = await Auth.signIn(username, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  // Sign up function
  async function signUp(username, password, email) {
    try {
      setLoading(true);
      setError(null);
      await Auth.signUp({
        username,
        password,
        attributes: {
          email,
        },
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  // Confirm sign up function
  async function confirmSignUp(username, code) {
    try {
      setLoading(true);
      setError(null);
      await Auth.confirmSignUp(username, code);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  // Logout function
  async function logout() {
    try {
      await Auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }
  
  // Value for the context provider
  const value = {
    user,
    loading,
    error,
    login,
    signUp,
    confirmSignUp,
    logout,
    checkAuth,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

2. **Add Authentication Provider to Application**
   - Wrap your application with the AuthProvider:

```javascript
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { initializeAmplify } from './config/amplify-config';

// Initialize Amplify
initializeAmplify();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

## Step 5: Implement Protected Routes

Create protected routes that require authentication:

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Render child routes if authenticated
  return <Outlet />;
}
```

## Step 6: Configure Offline Support

Implement offline support to enhance user experience:

1. **Configure Service Worker**
   - Create or update the service worker registration file:

```javascript
// src/serviceWorkerRegistration.js
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/service-worker.js';
      
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('ServiceWorker registered: ', registration);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}
```

2. **Create Service Worker File**
   - Create service-worker.js in the public directory:

```javascript
// public/service-worker.js
const CACHE_NAME = 'kgc-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.chunk.css',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/config.js',
  '/manifest.json',
  '/logo.png'
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // Skip non-GET requests and API/authentication calls
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('amazonaws.com')
  ) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
  );
});

// Update a service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

3. **Configure Offline Storage**
   - Implement offline data storage using IndexedDB:

```javascript
// src/services/offlineStorage.js
import { openDB } from 'idb';

const DB_NAME = 'kgc-offline-db';
const DB_VERSION = 1;

async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores for offline data
      if (!db.objectStoreNames.contains('healthMetrics')) {
        const healthStore = db.createObjectStore('healthMetrics', { keyPath: 'id', autoIncrement: true });
        healthStore.createIndex('userId', 'userId');
        healthStore.createIndex('date', 'date');
        healthStore.createIndex('syncStatus', 'syncStatus');
      }
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('endpoint', 'endpoint');
        syncStore.createIndex('method', 'method');
      }
    }
  });
}

// Store data locally
export async function saveOfflineData(storeName, data) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.put({ ...data, syncStatus: 'pending' });
  await tx.complete;
}

// Queue API request for later execution
export async function queueAPIRequest(endpoint, method, data) {
  const db = await initDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  await tx.objectStore('syncQueue').add({
    endpoint,
    method,
    data,
    timestamp: new Date().toISOString()
  });
  await tx.complete;
}

// Process sync queue when online
export async function processSyncQueue() {
  const db = await initDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const items = await store.getAll();
  
  for (const item of items) {
    try {
      // Attempt to execute the API request
      await apiRequest(item.method, item.endpoint, item.data);
      // Remove from queue if successful
      await store.delete(item.id);
    } catch (error) {
      console.error('Failed to process queued item:', error);
      // Leave in queue to retry later
    }
  }
  
  await tx.complete;
}

// Get offline data
export async function getOfflineData(storeName, indexName, key) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const index = indexName ? store.index(indexName) : null;
  
  let results;
  if (index && key !== undefined) {
    results = await index.getAll(key);
  } else {
    results = await store.getAll();
  }
  
  await tx.complete;
  return results;
}
```

## Step 7: Implement Connectivity Monitoring

Create a connectivity service to manage online/offline states:

```javascript
// src/hooks/useConnectivity.js
import { useState, useEffect, createContext, useContext } from 'react';
import { processSyncQueue } from '../services/offlineStorage';

const ConnectivityContext = createContext();

export function ConnectivityProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  
  useEffect(() => {
    // Set up event listeners for online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
      // Process sync queue when we come back online
      processSyncQueue().catch(err => {
        console.error('Failed to process sync queue:', err);
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection check
    checkConnection();
    
    // Set up periodic connection quality checks
    const intervalId = setInterval(checkConnection, 30000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);
  
  // Function to check connection quality
  const checkConnection = async () => {
    if (!navigator.onLine) {
      setConnectionQuality('offline');
      return;
    }
    
    try {
      const startTime = Date.now();
      const response = await fetch('/api/connectivity/test', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        setConnectionQuality('poor');
        return;
      }
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Categorize connection quality based on latency
      if (latency < 300) {
        setConnectionQuality('good');
      } else if (latency < 1000) {
        setConnectionQuality('fair');
      } else {
        setConnectionQuality('poor');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionQuality('poor');
    }
  };
  
  return (
    <ConnectivityContext.Provider value={{ isOnline, connectionQuality, checkConnection }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
}
```

## Step 8: Setup Error Boundary and Monitoring

Implement error boundaries to gracefully handle errors and report them to monitoring services:

```javascript
// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }
  
  logErrorToService(error, errorInfo) {
    // Send error to monitoring service like Sentry, LogRocket, etc.
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Example: Send to custom error endpoint
    fetch('/api/error-logging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to log error:', err));
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="error-boundary p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-700 mb-4">Something went wrong</h2>
          <p className="mb-4">We're sorry, but there was an error in the application. Our team has been notified.</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Refresh the Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
```

## Step 9: Comprehensive Testing

Before going live, perform comprehensive testing of the integration:

1. **Authentication Flow Testing**
   - Test complete login, registration, and password reset flows
   - Verify token refresh functionality
   - Test session persistence and timeout behavior

2. **API Integration Testing**
   - Test all API endpoints with proper authentication
   - Verify error handling and retries
   - Test rate limiting behavior

3. **Offline Functionality Testing**
   - Test application behavior when switching between online and offline
   - Verify offline data storage and sync
   - Test service worker caching

4. **Security Testing**
   - Verify HTTPS and content security policies
   - Test CORS configuration
   - Verify proper token handling and storage

5. **Performance Testing**
   - Measure application load time
   - Test responsiveness on various devices
   - Identify and optimize slow API calls

## Performance Optimization Considerations

For optimal frontend-backend integration performance:

1. **API Request Batching**
   - Group multiple related API calls into batch requests
   - Implement server-side endpoint for handling batched requests

2. **Response Compression**
   - Enable gzip/brotli compression for API responses
   - Configure appropriate cache headers

3. **Selective Data Loading**
   - Implement pagination for large data sets
   - Use cursor-based pagination for efficiency

4. **Connection Pooling**
   - Configure proper connection pooling for database access
   - Optimize API Gateway connection management

## User Experience Enhancements

To maintain excellent UX during frontend-backend communication:

1. **Loading States**
   - Implement skeleton loaders for content that's fetching
   - Use optimistic UI updates when appropriate

2. **Error Recovery**
   - Provide clear, actionable error messages
   - Implement automatic retry with exponential backoff

3. **Background Synchronization**
   - Use the Background Sync API for deferring actions until connectivity is restored
   - Notify users when offline actions are successfully synchronized

4. **Progressive Enhancement**
   - Design core functionality to work without JavaScript
   - Layer enhanced experiences for capable browsers

## Next Steps

After completing the frontend-backend integration, proceed to [User Experience Optimization](./05-user-experience-optimization.md) to fine-tune the user experience of the application.