# Keep Going Care Frontend Architecture Guide

## Table of Contents
1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [State Management](#state-management)
4. [Data Fetching Strategy](#data-fetching-strategy)
5. [Routing and Navigation](#routing-and-navigation)
6. [UI Component Library](#ui-component-library)
7. [Responsive Design](#responsive-design)
8. [Performance Optimizations](#performance-optimizations)
9. [Offline Support](#offline-support)
10. [Accessibility Implementation](#accessibility-implementation)
11. [Testing Strategy](#testing-strategy)
12. [Code Splitting](#code-splitting)
13. [Development Guidelines](#development-guidelines)

## Overview

Keep Going Care (KGC) frontend is built using React with TypeScript, following a component-based architecture optimized for performance, maintainability, and user experience. The application leverages modern frameworks and techniques to deliver a responsive, accessible healthcare platform.

### Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                 React Application                      │
│                                                       │
│  ┌─────────────┐    ┌────────────┐    ┌────────────┐  │
│  │   Pages     │    │  Shared    │    │ Dashboard  │  │
│  │             │◄──►│ Components │◄──►│ Components │  │
│  └─────────────┘    └────────────┘    └────────────┘  │
│         ▲                  ▲                 ▲        │
└─────────┼──────────────────┼─────────────────┼────────┘
          │                  │                 │
┌─────────▼──────┐  ┌────────▼───────┐  ┌──────▼─────────┐
│    Routing     │  │ State Management│  │ API Integration│
│   (wouter)     │  │(React Context, │  │(TanStack Query)│
│                │  │  Query)        │  │                │
└────────────────┘  └────────────────┘  └────────────────┘
          │                  │                 │
          └─────────────────┐│─────────────────┘
                           ┌▼▼┐
                           │UI│
                           │  │
                           └──┘
```

### Technology Stack

- **Core**: React.js with TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Routing**: wouter
- **Data Fetching**: TanStack React Query
- **State Management**: React Context + Query Client
- **UI Components**: shadcn/ui + custom components
- **Forms**: react-hook-form with Zod validation
- **Icons**: Lucide React
- **Offline Support**: Service Worker + IndexedDB
- **Progressive Web App**: PWA-compliant implementation

## Component Architecture

KGC follows a well-structured component hierarchy to maximize code reuse and maintainability.

### Component Hierarchy

```
┌───────────────────────────────────────────────────────┐
│                 Application Shell                      │
│ ┌───────────────────────────────────────────────────┐ │
│ │                  Layout Components                 │ │
│ │                                                   │ │
│ │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│ │ │   Navbar    │  │  Sidebar    │  │  Footer     │ │ │
│ │ └─────────────┘  └─────────────┘  └─────────────┘ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │                     Pages                          │ │
│ └───────────────────────────────────────────────────┘ │
│         │               │                 │           │
└─────────┼───────────────┼─────────────────┼───────────┘
          │               │                 │
┌─────────▼──────┐ ┌──────▼───────┐ ┌───────▼──────────┐
│ Feature-based  │ │ Shared       │ │ Dashboard-specific│
│ Components     │ │ Components   │ │ Components       │
└────────────────┘ └──────────────┘ └──────────────────┘
          │               │                 │
          └───────────────┼─────────────────┘
                          │
                   ┌──────▼─────┐
                   │ UI Elements│
                   └────────────┘
```

### Component Types

1. **Layout Components**:
   - `Navbar`: Navigation header with user context
   - `Sidebar`: Context-sensitive side navigation
   - `Footer`: Application-wide footer
   - `PageLayout`: Consistent page structure

2. **Feature Components**:
   - `HealthMetricsDisplay`: Health score visualization
   - `ProgressMilestones`: Goal tracking interface
   - `SupervisorAgent`: AI chat interaction
   - `MotivationalImageUploader`: Image upload and display

3. **Shared Components**:
   - `UserProfileCard`: Consistent user information display
   - `MetricsChart`: Reusable data visualization
   - `FeatureCard`: Standard feature entry point
   - `NotificationBell`: Application-wide alerts

4. **UI Elements**:
   - All shadcn/ui components (Button, Card, Dialog, etc.)
   - Custom styled elements
   - Icon wrappers

### Component Implementation Pattern

KGC follows a consistent pattern for component implementation:

```tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthMetric } from '@shared/schema';

interface HealthMetricsDisplayProps {
  userId: number;
  compact?: boolean;
  className?: string;
  onMetricClick?: (metric: HealthMetric) => void;
}

/**
 * Displays health metrics for a specific user
 * 
 * @param userId - The user ID to fetch metrics for
 * @param compact - Whether to show a compact version
 * @param className - Additional CSS classes
 * @param onMetricClick - Optional click handler for metrics
 */
export function HealthMetricsDisplay({
  userId,
  compact = false,
  className = '',
  onMetricClick
}: HealthMetricsDisplayProps) {
  // State management
  const [selectedMetricId, setSelectedMetricId] = useState<number | null>(null);
  
  // Data fetching
  const {
    data: metrics,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/health-metrics/latest', userId],
    enabled: userId > 0
  });
  
  // Effects
  useEffect(() => {
    // Additional setup if needed
  }, [userId]);
  
  // Event handlers
  const handleMetricClick = (metric: HealthMetric) => {
    setSelectedMetricId(metric.id);
    if (onMetricClick) {
      onMetricClick(metric);
    }
  };
  
  // Loading state
  if (isLoading) {
    return <MetricsSkeleton compact={compact} className={className} />;
  }
  
  // Error state
  if (error || !metrics) {
    return <MetricsError compact={compact} className={className} />;
  }
  
  // Render component
  return (
    <Card className={`${className} ${compact ? 'p-3' : 'p-6'}`}>
      <CardHeader className={compact ? 'p-2' : 'p-4'}>
        <CardTitle>Health Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
}

// Supporting components
function MetricsSkeleton({ compact, className }: { compact?: boolean, className?: string }) {
  // Skeleton implementation
}

function MetricsError({ compact, className }: { compact?: boolean, className?: string }) {
  // Error state implementation
}
```

## State Management

KGC implements a hybrid state management approach optimized for different state types.

### State Management Strategy

1. **Server State**: TanStack React Query
   - All API data is managed through React Query
   - Centralized cache for shared data
   - Optimistic updates for mutations

2. **UI State**: React useState/useReducer
   - Component-level UI states use useState
   - Complex UI logic uses useReducer
   - Memoization for derived state values

3. **Application State**: React Context
   - User authentication state
   - Theme and preferences
   - Feature flags and permissions

4. **Persistence**: LocalStorage + IndexedDB
   - User preferences in localStorage
   - Offline data in IndexedDB
   - Session data in sessionStorage

### Authentication Context

```tsx
// Example of well-structured authentication context
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  // Fetch current user
  const {
    data: user,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    onError: (err) => setError(err as Error)
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetch(); // Refresh user data after login
      setError(null);
    },
    onError: (err) => setError(err as Error)
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      refetch(); // Refresh user data after logout
      setError(null);
    },
    onError: (err) => setError(err as Error)
  });

  // Login handler
  const login = async (username: string, password: string) => {
    return loginMutation.mutateAsync({ username, password });
  };

  // Logout handler
  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  const value = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for consuming the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Query Client Configuration

```tsx
// Centralized query client configuration
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
        // Global error handling for mutations
      }
    }
  }
});

// API request helper
export async function apiRequest(
  method: string, 
  endpoint: string, 
  data?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include' // Include cookies for authentication
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);
  
  // Handle authentication errors consistently
  if (response.status === 401) {
    queryClient.setQueryData(['/api/auth/user'], null);
    // Redirect to login if needed
  }
  
  return response;
}
```

## Data Fetching Strategy

KGC implements an optimized data fetching strategy using TanStack React Query.

### Key Patterns

1. **Centralized Query Hooks**:
   ```tsx
   // Reusable query hook for health metrics
   export function useHealthMetrics(userId: number) {
     return useQuery({
       queryKey: ['/api/health-metrics', userId],
       queryFn: async () => {
         const response = await apiRequest('GET', `/api/health-metrics/user/${userId}`);
         if (!response.ok) {
           throw new Error('Failed to fetch health metrics');
         }
         return response.json();
       },
       enabled: userId > 0,
       staleTime: 5 * 60 * 1000, // 5 minutes
     });
   }
   ```

2. **Pagination Handling**:
   ```tsx
   // Paginated data fetching hook
   export function usePaginatedData<T>(
     endpoint: string,
     page: number,
     pageSize: number
   ) {
     return useQuery({
       queryKey: [endpoint, page, pageSize],
       queryFn: async () => {
         const response = await apiRequest(
           'GET', 
           `${endpoint}?page=${page}&pageSize=${pageSize}`
         );
         if (!response.ok) {
           throw new Error(`Failed to fetch data from ${endpoint}`);
         }
         return response.json() as Promise<{
           data: T[];
           totalCount: number;
           totalPages: number;
         }>;
       },
       keepPreviousData: true, // Keep previous pages while loading new ones
     });
   }
   ```

3. **Mutation Patterns**:
   ```tsx
   // Reusable mutation hook with cache updates
   export function useUpdateHealthMetric() {
     return useMutation({
       mutationFn: async (data: UpdateHealthMetric) => {
         const response = await apiRequest(
           'PATCH',
           `/api/health-metrics/${data.id}`,
           data
         );
         if (!response.ok) {
           throw new Error('Failed to update health metric');
         }
         return response.json();
       },
       onSuccess: (updatedMetric) => {
         // Update individual item in cache
         queryClient.setQueryData(
           ['/api/health-metrics', updatedMetric.userId],
           (oldData: HealthMetric[] | undefined) => {
             if (!oldData) return [updatedMetric];
             return oldData.map(metric => 
               metric.id === updatedMetric.id ? updatedMetric : metric
             );
           }
         );
         
         // Update latest metric if this is the most recent
         queryClient.setQueryData(
           ['/api/health-metrics/latest', updatedMetric.userId],
           (oldData: HealthMetric | undefined) => {
             if (!oldData || new Date(updatedMetric.date) >= new Date(oldData.date)) {
               return updatedMetric;
             }
             return oldData;
           }
         );
       }
     });
   }
   ```

4. **Offline Support**:
   ```tsx
   // Data fetching with offline capabilities
   export function useOfflineCapableData<T>(
     endpoint: string,
     storageKey: string,
     options?: UseQueryOptions<T>
   ) {
     // Set up network status tracking
     const [isOnline, setIsOnline] = useState(navigator.onLine);
     
     useEffect(() => {
       const handleOnline = () => setIsOnline(true);
       const handleOffline = () => setIsOnline(false);
       
       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);
       
       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }, []);
     
     // Query with offline fallback
     return useQuery({
       queryKey: [endpoint],
       queryFn: async () => {
         try {
           // Attempt online fetch
           const response = await apiRequest('GET', endpoint);
           if (!response.ok) {
             throw new Error(`Failed to fetch from ${endpoint}`);
           }
           
           const data = await response.json();
           
           // Cache successful response
           localStorage.setItem(storageKey, JSON.stringify({
             data,
             timestamp: Date.now()
           }));
           
           return data as T;
         } catch (error) {
           // If offline or fetch fails, try local cache
           const cachedData = localStorage.getItem(storageKey);
           if (cachedData) {
             return JSON.parse(cachedData).data as T;
           }
           throw error;
         }
       },
       ...options,
       // Disable network requests when offline
       enabled: options?.enabled !== false && (isOnline || localStorage.getItem(storageKey) !== null)
     });
   }
   ```

## Routing and Navigation

KGC implements routing with wouter, optimized for performance and developer experience.

### Routing Structure

```tsx
// Main routing configuration
import { Switch, Route, useLocation } from 'wouter';
import { Suspense, lazy } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Lazy-loaded page components
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const HealthMetrics = lazy(() => import('@/pages/HealthMetrics'));
const ProgressMilestones = lazy(() => import('@/pages/ProgressMilestones'));
const SupervisorChat = lazy(() => import('@/pages/SupervisorChat'));
const Settings = lazy(() => import('@/pages/Settings'));
const Auth = lazy(() => import('@/pages/Auth'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Route configuration
const routes = [
  { path: '/', component: Dashboard, protected: true },
  { path: '/health-metrics', component: HealthMetrics, protected: true },
  { path: '/milestones', component: ProgressMilestones, protected: true },
  { path: '/chat', component: SupervisorChat, protected: true },
  { path: '/settings', component: Settings, protected: true },
  { path: '/auth', component: Auth, protected: false },
];

export function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Redirect logic
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && location !== '/auth') {
        // Redirect unauthenticated users to auth page
        setLocation('/auth');
      } else if (isAuthenticated && location === '/auth') {
        // Redirect authenticated users to dashboard
        setLocation('/');
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation]);
  
  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Switch>
        {routes.map(({ path, component: Component, protected: isProtected }) => (
          <Route
            key={path}
            path={path}
            component={() => {
              // Check if route is protected and user is authenticated
              if (isProtected && !isAuthenticated) {
                return <Auth />;
              }
              return <Component />;
            }}
          />
        ))}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
```

### Navigation Components

```tsx
// Main navigation component
export function MainNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Navigation items based on user role
  const navItems = useMemo(() => {
    const items = [
      { href: '/', label: 'Dashboard', icon: HomeIcon },
      { href: '/health-metrics', label: 'Health Metrics', icon: ActivityIcon },
      { href: '/milestones', label: 'Progress Milestones', icon: TargetIcon },
      { href: '/chat', label: 'Health Assistant', icon: MessageCircleIcon },
    ];
    
    // Add role-specific items
    if (user?.roleId === DOCTOR_ROLE_ID) {
      items.push({ href: '/patients', label: 'My Patients', icon: UsersIcon });
    } else if (user?.roleId === ADMIN_ROLE_ID) {
      items.push({ href: '/admin', label: 'Admin Panel', icon: ShieldIcon });
    }
    
    return items;
  }, [user?.roleId]);
  
  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-4 py-2 text-sm font-medium rounded-md",
            location === item.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

## UI Component Library

KGC uses shadcn/ui components extended with custom components tailored for healthcare use cases.

### Core UI Components

1. **Base Components**:
   - All standard shadcn/ui components
   - Tailwind CSS utility classes
   - Custom theme configuration

2. **Custom Healthcare Components**:
   - `HealthScoreCard`: Visualizes health metrics with color-coded indicators
   - `MedicationTracker`: Medication adherence tracking interface
   - `ProgressChart`: Health progress visualization
   - `AlertBanner`: Context-sensitive health alerts

### Theming System

```tsx
// Theme configuration
const theme = {
  primary: '#0c4a6e', // Tailwind blue-900
  variant: 'professional', // professional | tint | vibrant
  appearance: 'system', // light | dark | system
  radius: 0.5, // Border radius scale
};

// Applied via theme.json for shadcn/ui
```

### Form Components

```tsx
// Example of form component implementation with validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Validation schema
const healthMetricFormSchema = z.object({
  medicationScore: z
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100"),
  dietScore: z
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100"),
  exerciseScore: z
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100"),
});

type HealthMetricFormValues = z.infer<typeof healthMetricFormSchema>;

interface HealthMetricFormProps {
  defaultValues?: HealthMetricFormValues;
  onSubmit: (values: HealthMetricFormValues) => void;
}

export function HealthMetricForm({
  defaultValues = {
    medicationScore: 50,
    dietScore: 50,
    exerciseScore: 50,
  },
  onSubmit,
}: HealthMetricFormProps) {
  // Form hook
  const form = useForm<HealthMetricFormValues>({
    resolver: zodResolver(healthMetricFormSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="medicationScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medication Score</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Rate your medication adherence from 0-100
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Similar fields for dietScore and exerciseScore */}
        
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## Responsive Design

KGC implements a mobile-first responsive design approach optimized for all device sizes.

### Responsive Strategy

1. **Mobile-First Development**:
   - Base styles for mobile devices
   - Progressive enhancement for larger screens
   - Touch-friendly UI elements

2. **Breakpoint System**:
   ```css
   /* Tailwind breakpoints used throughout the application */
   /* sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px */
   ```

3. **Responsive Layouts**:
   - Flexbox and Grid for adaptive layouts
   - Container queries for component-level responsiveness
   - Dynamic spacing based on viewport size

### Implementation Examples

```tsx
// Responsive layout example
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar - full width on mobile, side column on desktop */}
        <aside className="w-full md:w-64 p-4 border-r border-border">
          <MainNavigation />
        </aside>
        
        {/* Main content - adapts to available space */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      
      <Footer />
    </div>
  );
}

// Responsive component example
export function HealthMetricsCard({ metrics }: { metrics: HealthMetric }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Health Metrics</CardTitle>
        <CardDescription className="hidden sm:block">
          Your latest health scores
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Grid layout - 1 column on mobile, 3 on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricDisplay
            label="Medication"
            value={metrics.medicationScore}
            icon={<Pill className="h-5 w-5" />}
          />
          <MetricDisplay
            label="Diet"
            value={metrics.dietScore}
            icon={<Utensils className="h-5 w-5" />}
          />
          <MetricDisplay
            label="Exercise"
            value={metrics.exerciseScore}
            icon={<Activity className="h-5 w-5" />}
          />
        </div>
        
        {/* Additional content shown only on larger screens */}
        <div className="hidden md:block mt-6">
          <ProgressChart data={metrics} />
        </div>
      </CardContent>
    </Card>
  );
}
```

## Performance Optimizations

KGC implements multiple performance optimization techniques to ensure a fast, responsive user experience.

### Optimization Techniques

1. **Component Optimization**:
   ```tsx
   // Memoization example
   import { memo, useMemo } from 'react';
   
   interface MetricChartProps {
     data: HealthMetric[];
     period: 'week' | 'month' | 'year';
   }
   
   // Memoize the entire component
   export const MetricChart = memo(function MetricChart({
     data,
     period
   }: MetricChartProps) {
     // Memoize expensive calculations
     const processedData = useMemo(() => {
       return processMetricData(data, period);
     }, [data, period]);
     
     // Render chart using processed data
     return (
       <div className="h-64">
         <LineChart data={processedData} />
       </div>
     );
   });
   
   // Only re-render if props actually changed
   function arePropsEqual(
     prevProps: MetricChartProps,
     nextProps: MetricChartProps
   ) {
     return (
       prevProps.period === nextProps.period &&
       prevProps.data.length === nextProps.data.length &&
       prevProps.data.every((item, i) => item.id === nextProps.data[i]?.id)
     );
   }
   ```

2. **Virtualization**:
   ```tsx
   // Virtual list for large datasets
   import { useVirtualizer } from '@tanstack/react-virtual';
   
   export function PatientList({ patients }: { patients: Patient[] }) {
     const parentRef = useRef<HTMLDivElement>(null);
     
     const virtualizer = useVirtualizer({
       count: patients.length,
       getScrollElement: () => parentRef.current,
       estimateSize: () => 80, // Estimated row height
     });
     
     return (
       <div
         ref={parentRef}
         className="h-[600px] overflow-auto"
       >
         <div
           style={{
             height: `${virtualizer.getTotalSize()}px`,
             position: 'relative',
           }}
         >
           {virtualizer.getVirtualItems().map(virtualRow => (
             <div
               key={virtualRow.index}
               style={{
                 position: 'absolute',
                 top: 0,
                 left: 0,
                 width: '100%',
                 height: `${virtualRow.size}px`,
                 transform: `translateY(${virtualRow.start}px)`,
               }}
               className="border-b p-4"
             >
               <PatientCard patient={patients[virtualRow.index]} />
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

3. **Code Splitting**:
   ```tsx
   // Dynamic imports for routes
   import { lazy, Suspense } from 'react';
   
   const SupervisorAgent = lazy(() => import('@/components/SupervisorAgent'));
   
   export function ChatPage() {
     return (
       <div className="container mx-auto p-4">
         <h1 className="text-2xl font-bold mb-4">Health Assistant</h1>
         
         <Suspense fallback={<ChatSkeleton />}>
           <SupervisorAgent userId={currentUserId} />
         </Suspense>
       </div>
     );
   }
   ```

4. **Image Optimization**:
   ```tsx
   // Optimized image component
   export function OptimizedImage({
     src,
     alt,
     width,
     height,
     priority = false
   }: {
     src: string;
     alt: string;
     width: number;
     height: number;
     priority?: boolean;
   }) {
     return (
       <div
         className="relative"
         style={{ width, height, overflow: 'hidden' }}
       >
         <img
           src={src}
           alt={alt}
           width={width}
           height={height}
           loading={priority ? 'eager' : 'lazy'}
           decoding="async"
           className="object-cover w-full h-full"
         />
       </div>
     );
   }
   ```

## Offline Support

KGC implements comprehensive offline capabilities to ensure functionality without an internet connection.

### Offline Architecture

```
┌───────────────────────────────────────────────────────┐
│                  Service Worker                        │
│ ┌─────────────────┐      ┌───────────────────────┐    │
│ │  Cache Strategy │      │  Background Sync      │    │
│ └─────────────────┘      └───────────────────────┘    │
└───────────────────────────────────────────────────────┘
                │                      │
                ▼                      ▼
┌───────────────────────┐    ┌──────────────────────────┐
│     Cache Storage     │    │      IndexedDB           │
│ ┌─────────────────┐   │    │ ┌────────────────────┐   │
│ │  Static Assets  │   │    │ │ Offline Data Store │   │
│ └─────────────────┘   │    │ └────────────────────┘   │
└───────────────────────┘    └──────────────────────────┘
                │                      │
                ▼                      ▼
┌───────────────────────────────────────────────────────┐
│                   Application Logic                    │
│ ┌─────────────────┐      ┌───────────────────────┐    │
│ │ Online-First    │      │ Offline-Aware         │    │
│ │ Data Fetching   │      │ Components            │    │
│ └─────────────────┘      └───────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

### Implementation Components

1. **Service Worker Registration**:
   ```tsx
   // Service worker registration
   export function registerServiceWorker() {
     if ('serviceWorker' in navigator) {
       window.addEventListener('load', () => {
         navigator.serviceWorker
           .register('/service-worker.js')
           .then(registration => {
             console.log('SW registered:', registration);
           })
           .catch(error => {
             console.log('SW registration failed:', error);
           });
       });
     }
   }
   ```

2. **Offline Store**:
   ```tsx
   // IndexedDB storage for offline data
   export class OfflineStore {
     private db: IDBDatabase | null = null;
     private readonly dbName = 'kgc-offline-db';
     private readonly version = 1;
     
     async connect(): Promise<boolean> {
       return new Promise((resolve, reject) => {
         const request = indexedDB.open(this.dbName, this.version);
         
         request.onerror = () => {
           console.error('Failed to open IndexedDB');
           reject(false);
         };
         
         request.onsuccess = () => {
           this.db = request.result;
           resolve(true);
         };
         
         request.onupgradeneeded = (event) => {
           const db = (event.target as IDBOpenDBRequest).result;
           
           // Create object stores for offline data
           if (!db.objectStoreNames.contains('healthMetrics')) {
             db.createObjectStore('healthMetrics', { keyPath: 'id' });
           }
           
           if (!db.objectStoreNames.contains('progressMilestones')) {
             db.createObjectStore('progressMilestones', { keyPath: 'id' });
           }
           
           if (!db.objectStoreNames.contains('pendingActions')) {
             db.createObjectStore('pendingActions', { 
               keyPath: 'id', 
               autoIncrement: true 
             });
           }
         };
       });
     }
     
     async saveData(
       storeName: string,
       data: any,
       key?: IDBValidKey
     ): Promise<boolean> {
       if (!this.db) await this.connect();
       
       return new Promise((resolve, reject) => {
         const transaction = this.db!.transaction(storeName, 'readwrite');
         const store = transaction.objectStore(storeName);
         
         const request = key ? store.put(data, key) : store.put(data);
         
         request.onsuccess = () => resolve(true);
         request.onerror = () => reject(false);
       });
     }
     
     async getData(
       storeName: string,
       key?: IDBValidKey
     ): Promise<any> {
       if (!this.db) await this.connect();
       
       return new Promise((resolve, reject) => {
         const transaction = this.db!.transaction(storeName, 'readonly');
         const store = transaction.objectStore(storeName);
         
         const request = key ? store.get(key) : store.getAll();
         
         request.onsuccess = () => resolve(request.result);
         request.onerror = () => reject(null);
       });
     }
     
     // Additional methods for working with offline data
   }
   
   // Create singleton instance
   export const offlineStore = new OfflineStore();
   ```

3. **Background Sync**:
   ```tsx
   // Background sync for offline changes
   export class BackgroundSyncManager {
     private readonly syncTag = 'kgc-data-sync';
     
     constructor(private offlineStore: OfflineStore) {}
     
     async queueAction(action: {
       type: string;
       endpoint: string;
       method: string;
       data: any;
     }): Promise<void> {
       // Add timestamp to track when action was queued
       const actionWithTimestamp = {
         ...action,
         timestamp: Date.now(),
       };
       
       // Save action to pending actions store
       await this.offlineStore.saveData('pendingActions', actionWithTimestamp);
       
       // Register background sync if supported
       if ('serviceWorker' in navigator && 'SyncManager' in window) {
         const registration = await navigator.serviceWorker.ready;
         await registration.sync.register(this.syncTag);
       }
     }
     
     async processPendingActions(): Promise<void> {
       // Get all pending actions
       const pendingActions = await this.offlineStore.getData('pendingActions');
       
       if (!pendingActions || pendingActions.length === 0) {
         return;
       }
       
       // Process actions in order
       for (const action of pendingActions) {
         try {
           // Attempt to send data to server
           const response = await fetch(action.endpoint, {
             method: action.method,
             headers: {
               'Content-Type': 'application/json',
             },
             body: JSON.stringify(action.data),
           });
           
           if (response.ok) {
             // Remove action once processed
             await this.offlineStore.deleteData('pendingActions', action.id);
           }
         } catch (error) {
           console.error('Failed to process action:', error);
           // Keep action in queue for next sync
         }
       }
     }
   }
   ```

4. **Offline-Aware Components**:
   ```tsx
   // Offline-aware component example
   export function ProgressMilestonesWithOffline({ userId }: { userId: number }) {
     const [isOnline, setIsOnline] = useState(navigator.onLine);
     const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete'>('idle');
     
     // Set up online/offline detection
     useEffect(() => {
       const handleOnline = () => setIsOnline(true);
       const handleOffline = () => setIsOnline(false);
       
       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);
       
       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }, []);
     
     // Sync data when coming back online
     useEffect(() => {
       if (isOnline) {
         syncData();
       }
     }, [isOnline]);
     
     // Custom hook for offline-capable data
     const { data, isLoading, error } = useOfflineCapableData(
       `/api/progress-milestones/user/${userId}`,
       `milestones-${userId}`
     );
     
     // Sync offline changes with server
     const syncData = async () => {
       if (!isOnline) return;
       
       setSyncStatus('syncing');
       
       try {
         await syncManager.processPendingActions();
         setSyncStatus('complete');
         
         // Reset status after delay
         setTimeout(() => setSyncStatus('idle'), 3000);
       } catch (error) {
         console.error('Sync failed:', error);
         setSyncStatus('idle');
       }
     };
     
     return (
       <div className="space-y-4">
         <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold">Progress Milestones</h2>
           
           {!isOnline && (
             <Badge variant="outline" className="bg-amber-100 text-amber-800">
               Offline Mode
             </Badge>
           )}
           
           {syncStatus === 'syncing' && (
             <Badge variant="outline" className="bg-blue-100 text-blue-800">
               <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
               Syncing...
             </Badge>
           )}
           
           {syncStatus === 'complete' && (
             <Badge variant="outline" className="bg-green-100 text-green-800">
               <Check className="h-3 w-3 mr-1" />
               Synced
             </Badge>
           )}
         </div>
         
         {/* Component content */}
       </div>
     );
   }
   ```

## Accessibility Implementation

KGC prioritizes accessibility throughout the application, following WCAG 2.1 AA standards.

### Key Implementation Areas

1. **Semantic HTML**:
   ```tsx
   // Example of semantic HTML structure
   export function HealthMetricSection({ metrics }: { metrics: HealthMetric }) {
     return (
       <section aria-labelledby="health-metrics-heading">
         <h2 id="health-metrics-heading" className="text-xl font-semibold mb-4">
           Health Metrics
         </h2>
         
         <div className="space-y-4">
           <article aria-labelledby="medication-heading">
             <h3 id="medication-heading" className="text-lg font-medium">
               Medication
             </h3>
             <p>Score: {metrics.medicationScore}/100</p>
             <div role="progressbar" 
                  aria-valuenow={metrics.medicationScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="bg-gray-200 rounded-full h-2.5 mt-2"
             >
               <div 
                 className="bg-blue-600 h-2.5 rounded-full"
                 style={{ width: `${metrics.medicationScore}%` }} 
               />
             </div>
           </article>
           
           {/* Similar patterns for other metrics */}
         </div>
       </section>
     );
   }
   ```

2. **Keyboard Navigation**:
   ```tsx
   // Enhanced focus management
   export function AccessibleTabs({ tabs }: { tabs: TabItem[] }) {
     const [activeTab, setActiveTab] = useState(0);
     
     const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
       switch (e.key) {
         case 'ArrowLeft':
           e.preventDefault();
           setActiveTab(prev => (prev === 0 ? tabs.length - 1 : prev - 1));
           break;
         case 'ArrowRight':
           e.preventDefault();
           setActiveTab(prev => (prev === tabs.length - 1 ? 0 : prev + 1));
           break;
       }
     };
     
     return (
       <div>
         <div role="tablist" aria-label="Health information tabs">
           {tabs.map((tab, index) => (
             <button
               key={index}
               role="tab"
               id={`tab-${index}`}
               aria-selected={activeTab === index}
               aria-controls={`tabpanel-${index}`}
               tabIndex={activeTab === index ? 0 : -1}
               onClick={() => setActiveTab(index)}
               onKeyDown={e => handleKeyDown(e, index)}
               className={`px-4 py-2 ${
                 activeTab === index
                   ? 'bg-primary text-primary-foreground'
                   : 'bg-muted text-muted-foreground'
               }`}
             >
               {tab.label}
             </button>
           ))}
         </div>
         
         {tabs.map((tab, index) => (
           <div
             key={index}
             role="tabpanel"
             id={`tabpanel-${index}`}
             aria-labelledby={`tab-${index}`}
             tabIndex={0}
             hidden={activeTab !== index}
             className="p-4 border rounded-b-md"
           >
             {tab.content}
           </div>
         ))}
       </div>
     );
   }
   ```

3. **ARIA Attributes**:
   ```tsx
   // Live region for dynamic content
   export function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
     return (
       <div>
         <h2 className="text-lg font-semibold mb-2">Notifications</h2>
         
         <div 
           aria-live="polite"
           aria-atomic="false"
           aria-relevant="additions"
           className="space-y-2"
         >
           {notifications.map(notification => (
             <div 
               key={notification.id}
               className="p-2 border rounded-md"
             >
               <h3 className="font-medium">{notification.title}</h3>
               <p>{notification.message}</p>
             </div>
           ))}
         </div>
         
         {notifications.length === 0 && (
           <p>No new notifications</p>
         )}
       </div>
     );
   }
   ```

4. **Color Contrast**:
   ```tsx
   // High contrast component example
   export function AlertMessage({ 
     type = 'info',
     message
   }: { 
     type?: 'info' | 'success' | 'warning' | 'error';
     message: string;
   }) {
     // Use high contrast color combinations
     const styles = {
       info: 'bg-blue-100 border-blue-500 text-blue-900',
       success: 'bg-green-100 border-green-500 text-green-900',
       warning: 'bg-yellow-100 border-yellow-500 text-yellow-900',
       error: 'bg-red-100 border-red-500 text-red-900'
     };
     
     return (
       <div 
         className={`p-4 border-l-4 ${styles[type]}`}
         role={type === 'error' ? 'alert' : 'status'}
       >
         {message}
       </div>
     );
   }
   ```

## Testing Strategy

KGC implements a comprehensive testing strategy to ensure code quality and reliability.

### Testing Framework

1. **Unit Testing**:
   ```tsx
   // Unit test example for a utility function
   import { render, screen } from '@testing-library/react';
   import { calculateOverallScore } from '@/utils/healthMetrics';
   
   describe('calculateOverallScore', () => {
     it('calculates the correct average of health metrics', () => {
       const metrics = {
         medicationScore: 80,
         dietScore: 70,
         exerciseScore: 60
       };
       
       expect(calculateOverallScore(metrics)).toBe(70);
     });
     
     it('handles missing metrics by using zero', () => {
       const metrics = {
         medicationScore: 60,
         dietScore: 0, // Missing value defaults to 0
         exerciseScore: 90
       };
       
       expect(calculateOverallScore(metrics)).toBe(50);
     });
   });
   ```

2. **Component Testing**:
   ```tsx
   // Component test example
   import { render, screen, fireEvent } from '@testing-library/react';
   import { HealthMetricsDisplay } from '@/components/HealthMetricsDisplay';
   
   // Mock the health metrics data
   const mockMetrics = {
     id: 1,
     userId: 123,
     medicationScore: 80,
     dietScore: 70,
     exerciseScore: 60,
     date: new Date().toISOString()
   };
   
   describe('HealthMetricsDisplay', () => {
     it('renders the component with metrics', () => {
       render(<HealthMetricsDisplay metrics={mockMetrics} />);
       
       expect(screen.getByText('Health Metrics')).toBeInTheDocument();
       expect(screen.getByText('Medication')).toBeInTheDocument();
       expect(screen.getByText('Diet')).toBeInTheDocument();
       expect(screen.getByText('Exercise')).toBeInTheDocument();
     });
     
     it('displays the correct scores', () => {
       render(<HealthMetricsDisplay metrics={mockMetrics} />);
       
       expect(screen.getByText('80/100')).toBeInTheDocument(); // Medication
       expect(screen.getByText('70/100')).toBeInTheDocument(); // Diet
       expect(screen.getByText('60/100')).toBeInTheDocument(); // Exercise
     });
     
     it('renders in compact mode correctly', () => {
       const { container } = render(
         <HealthMetricsDisplay metrics={mockMetrics} compact />
       );
       
       // Check that the compact class is applied
       expect(container.firstChild).toHaveClass('p-3');
     });
   });
   ```

3. **Integration Testing**:
   ```tsx
   // Integration test example
   import { render, screen, waitFor } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { rest } from 'msw';
   import { setupServer } from 'msw/node';
   import { QueryClientProvider } from '@tanstack/react-query';
   import { queryClient } from '@/lib/queryClient';
   import { HealthMetricsForm } from '@/components/HealthMetricsForm';
   
   // Mock server setup
   const server = setupServer(
     rest.post('/api/health-metrics', (req, res, ctx) => {
       return res(
         ctx.status(201),
         ctx.json({ id: 1, ...req.body })
       );
     })
   );
   
   beforeAll(() => server.listen());
   afterEach(() => {
     server.resetHandlers();
     queryClient.clear();
   });
   afterAll(() => server.close());
   
   describe('HealthMetricsForm Integration', () => {
     it('submits the form and shows success message', async () => {
       render(
         <QueryClientProvider client={queryClient}>
           <HealthMetricsForm userId={123} />
         </QueryClientProvider>
       );
       
       // Fill the form
       await userEvent.type(
         screen.getByLabelText(/medication score/i),
         '85'
       );
       await userEvent.type(
         screen.getByLabelText(/diet score/i),
         '75'
       );
       await userEvent.type(
         screen.getByLabelText(/exercise score/i),
         '65'
       );
       
       // Submit the form
       await userEvent.click(screen.getByRole('button', { name: /submit/i }));
       
       // Wait for success message
       await waitFor(() => {
         expect(
           screen.getByText(/health metrics saved successfully/i)
         ).toBeInTheDocument();
       });
     });
   });
   ```

## Code Splitting

KGC implements code splitting to optimize initial load time and subsequent user interactions.

### Code Splitting Strategy

1. **Route-Based Splitting**:
   - Each route is loaded dynamically
   - Core functionality loads first
   - Dashboard-specific code loads on demand

2. **Component-Level Splitting**:
   - Large components are split into smaller chunks
   - Heavy visualization components load on demand
   - AI features load when activated

3. **Dynamic Imports**:
   - React.lazy for components
   - Dynamic imports for utilities
   - Preloading for anticipated interactions

### Implementation

```tsx
// App-level code splitting
import { lazy, Suspense } from 'react';
import { Switch, Route } from 'wouter';
import PageLoader from '@/components/PageLoader';

// Lazy-loaded routes
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const HealthMetrics = lazy(() => import('@/pages/HealthMetrics'));
const ProgressMilestones = lazy(() => import('@/pages/ProgressMilestones'));
const SupervisorChat = lazy(() => import('@/pages/SupervisorChat'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/health-metrics" component={HealthMetrics} />
        <Route path="/milestones" component={ProgressMilestones} />
        <Route path="/chat" component={SupervisorChat} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Component-level code splitting
export function DashboardFeatures() {
  const [showCharts, setShowCharts] = useState(false);
  
  // Preload charts when mouse hovers over the button
  const handleMouseEnter = () => {
    const ChartComponent = import('@/components/AdvancedCharts');
  };
  
  return (
    <div className="space-y-4">
      <Button 
        onClick={() => setShowCharts(true)}
        onMouseEnter={handleMouseEnter}
      >
        Show Advanced Charts
      </Button>
      
      {showCharts && (
        <Suspense fallback={<ChartSkeleton />}>
          <AdvancedCharts />
        </Suspense>
      )}
    </div>
  );
}

// Dynamic component with preload capability
const AdvancedCharts = lazy(() => import('@/components/AdvancedCharts'));
```

## Development Guidelines

KGC follows a set of development guidelines to ensure consistency and quality across the codebase.

### Component Structure

1. **File Organization**:
   ```
   components/
   ├─ ui/              # Base UI components
   ├─ shared/          # Shared feature components
   │  ├─ HealthMetricsDisplay.tsx
   │  └─ ProgressMilestones.tsx
   ├─ dashboard/       # Dashboard-specific components
   ├─ charts/          # Visualization components
   ├─ forms/           # Form components
   └─ layout/          # Layout components
   ```

2. **Component Template**:
   ```tsx
   import React from 'react';
   import { ComponentProps, utility functions } from '@/lib';
   import { UI components } from '@/components/ui';
   
   // Define component props with proper JSDoc
   interface ComponentNameProps {
     /** Description of propA */
     propA: string;
     /** Description of propB */
     propB?: number;
   }
   
   /**
   * Component description
   * 
   * @example
   * <ComponentName propA="value" propB={42} />
   */
   export function ComponentName({
     propA,
     propB = 0,
   }: ComponentNameProps) {
     // State and hooks
     
     // Event handlers
     
     // Effects
     
     // Render helpers
     
     // Main render
     return (
       <div>
         {/* Component content */}
       </div>
     );
   }
   ```

### Naming Conventions

1. **Files and Components**:
   - PascalCase for component files and component names
   - camelCase for utility files and functions
   - kebab-case for CSS files

2. **Variables and Functions**:
   - Descriptive, action-oriented names
   - Prefixes: `use` for hooks, `handle` for event handlers
   - Clear pluralization for arrays/collections

3. **CSS Classes**:
   - Follow Tailwind conventions
   - BEM pattern for custom CSS when needed
   - Utility-first approach

### Best Practices

1. **Performance**:
   - Always memoize lists and expensive computations
   - Use callback functions for event handlers
   - Virtualize long lists

2. **Accessibility**:
   - Use semantic HTML elements
   - Include proper ARIA attributes
   - Ensure keyboard navigation
   - Maintain color contrast

3. **State Management**:
   - Keep state as close to use as possible
   - Lift state only when necessary
   - Use React Query for server state
   - Implement optimistic updates

4. **Code Style**:
   - Follow TypeScript best practices
   - Document public APIs and complex logic
   - Add explicit return types for non-trivial functions
   - Use enum or union types for bounded values

---

This document provides comprehensive guidance on the frontend architecture of the Keep Going Care (KGC) application. For further details or specific implementation questions, please refer to the codebase or contact the frontend development team.