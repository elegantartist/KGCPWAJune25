import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: RequestInit
): Promise<T> {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });

    // Handle unauthorized responses gracefully
    if (res.status === 401) {
      console.warn(`Unauthorized request to ${url}, clearing auth token`);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('currentUser');
      throw new Error('Authentication expired. Please log in again.');
    }

    await throwIfResNotOk(res);
    return await res.json() as T;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error;
  }
}

// Centralized video search API function
export async function searchVideos(type: 'recipes' | 'exercise-wellness', query: string): Promise<any[]> {
  try {
    const endpoint = type === 'recipes' ? '/api/recipes/videos' : '/api/exercise-wellness/videos';
    const response = await apiRequest('POST', endpoint, { query });
    return response.videos || [];
  } catch (error) {
    console.error(`Video search failed for ${type}:`, error);
    throw error;
  }
}

// Centralized provider search API function
export async function searchProviders(type: 'recipes' | 'exercise-wellness', location: string): Promise<any[]> {
  try {
    const endpoint = type === 'recipes' ? '/api/recipes/providers' : '/api/exercise-wellness/providers';
    const response = await apiRequest('POST', endpoint, { location });
    return response.providers || [];
  } catch (error) {
    console.error(`Provider search failed for ${type}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
