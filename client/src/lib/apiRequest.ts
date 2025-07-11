// In client/src/lib/apiRequest.ts

// Helper function moved from queryClient.ts
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text().catch(() => res.statusText)) || res.statusText; // Added catch for res.text()
    throw new Error(`API Error ${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string, // url is first, method second to match typical usage
  method: string = 'GET',
  body?: unknown | undefined, // Changed from any to unknown
  options?: RequestInit
): Promise<T> {
  try {
    const token = localStorage.getItem('accessToken'); // UPDATED to use accessToken
    const headers: Record<string, string> = {};

    if (body) { // Only add Content-Type if there is a body
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options
    };

    const response = await fetch(url, config);

    await throwIfResNotOk(response); // Use the helper

    // Handle cases where response might not have a body (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType?.includes("application/json")) {
        // For 204 or non-JSON, return a success indicator or handle as appropriate
        // Casting to T might be problematic if T expects a specific structure.
        // Consider returning a specific type or void for these cases if T is not `any`.
        return { success: true } as T; // This cast might need adjustment based on usage
    }

    return await response.json() as T;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error; // Re-throw the original error or a wrapped one
  }
}