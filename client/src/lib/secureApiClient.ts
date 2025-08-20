/**
 * Secure API Client for Healthcare Applications
 * Implements client-side security controls to prevent PHI breaches
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Sensitive endpoints that should never be cached for security
const DO_NOT_CACHE_PATTERNS = [
  '/api/user',
  '/api/auth',
  '/api/patients',
  '/api/health-metrics',
  '/api/care-plan-directives',
  '/api/patient-scores',
  '/api/medical-records'
];

// API cache with security controls
let apiCache: Record<string, { data: any; timestamp: number }> = {};
const cacheTTL = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced API request with security controls
 */
export async function secureApiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: RequestInit
): Promise<T> {
  try {
    // Get CSRF token from session storage if needed
    const csrfToken = sessionStorage.getItem('csrf-token');
    
    const headers: HeadersInit = {
      ...(data && { "Content-Type": "application/json" }),
      ...(csrfToken && method !== 'GET' && { 'x-csrf-token': csrfToken })
    };

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      ...options
    });

    // Handle security responses
    if (res.status === 423) {
      const error = await res.json();
      throw new Error(`Account locked: ${error.remainingMinutes} minutes remaining`);
    }

    if (res.status === 429) {
      const error = await res.json();
      throw new Error(`Rate limit exceeded. Please try again in ${error.retryAfter} seconds.`);
    }

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return await res.json() as T;
  } catch (error) {
    console.error(`Secure API request failed for ${method} ${url}:`, error);
    throw error;
  }
}

/**
 * Secure cached API GET with PHI protection
 */
export async function secureApiGet(endpoint: string): Promise<any> {
  // Do not cache sensitive or user-specific endpoints
  if (DO_NOT_CACHE_PATTERNS.some(pattern => endpoint.includes(pattern))) {
    const response = await fetch(endpoint, {
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  const cacheKey = endpoint;
  const now = Date.now();
  
  // Return cached response if valid
  if (apiCache[cacheKey] && now - apiCache[cacheKey].timestamp < cacheTTL) {
    return apiCache[cacheKey].data;
  }
  
  // Otherwise fetch fresh data
  const response = await fetch(endpoint, {
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Cache only successful responses
  if (response.ok) {
    apiCache[cacheKey] = {
      data,
      timestamp: now
    };
  }
  
  return data;
}

/**
 * Clear API cache - should be called on user logout
 */
export function clearSecureApiCache() {
  apiCache = {};
  
  // Clear any stored tokens
  sessionStorage.removeItem('csrf-token');
  
  // Clear any cached user data from localStorage
  const sensitiveKeys = ['user-data', 'patient-data', 'health-metrics'];
  sensitiveKeys.forEach(key => localStorage.removeItem(key));
}

/**
 * Initialize CSRF protection
 */
export async function initializeCSRFProtection() {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const { token } = await response.json();
      sessionStorage.setItem('csrf-token', token);
    }
  } catch (error) {
    console.warn('Failed to initialize CSRF protection:', error);
  }
}

/**
 * Secure query function with PHI protection
 */
export const getSecureQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    
    // Check if this is a sensitive endpoint
    const isSensitive = DO_NOT_CACHE_PATTERNS.some(pattern => 
      endpoint.includes(pattern)
    );
    
    const res = await fetch(endpoint, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Clear any cached sensitive data on authentication failure
      if (isSensitive) {
        clearSecureApiCache();
      }
      return null;
    }

    // Handle security-specific status codes
    if (res.status === 423) {
      throw new Error('Account is temporarily locked');
    }
    
    if (res.status === 429) {
      throw new Error('Too many requests - please wait before trying again');
    }

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return await res.json();
  };

/**
 * Enhanced query client with security controls
 */
export const secureQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getSecureQueryFn({ on401: "throw" }),
      refetchInterval: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('locked')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      retry: false, // Don't retry mutations for security
      onError: (error) => {
        // Log security-related errors
        if (error.message.includes('CSRF') || 
            error.message.includes('locked') ||
            error.message.includes('429')) {
          console.warn('Security-related mutation error:', error.message);
        }
      }
    }
  }
});

/**
 * Secure local storage manager
 * Prevents sensitive data from being stored inappropriately
 */
export class SecureStorageManager {
  private static readonly SENSITIVE_PATTERNS = [
    'password', 'token', 'key', 'secret', 'auth',
    'patient', 'health', 'medical', 'phi', 'pii'
  ];

  static setItem(key: string, value: string): boolean {
    // Prevent storing sensitive data in localStorage
    const lowerKey = key.toLowerCase();
    const isSensitive = this.SENSITIVE_PATTERNS.some(pattern => 
      lowerKey.includes(pattern)
    );

    if (isSensitive) {
      console.warn(`Attempted to store sensitive data in localStorage: ${key}`);
      return false;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to store item:', error);
      return false;
    }
  }

  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to retrieve item:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }

  static clearSensitiveData(): void {
    // Clear any potentially sensitive data on logout
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.SENSITIVE_PATTERNS.some(pattern => 
        lowerKey.includes(pattern)
      );
      
      if (isSensitive) {
        this.removeItem(key);
      }
    });
  }
}

// Export legacy API functions for backward compatibility
export { secureApiRequest as apiRequest };
export { secureQueryClient as queryClient };