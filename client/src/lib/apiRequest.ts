// In client/src/lib/apiRequest.ts
export async function apiRequest(url: string, method: string = 'GET', body?: any) {
  const token = localStorage.getItem('accessToken'); // Updated to use 'accessToken'
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const config: RequestInit = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An API error occurred.' }));
    throw new Error(errorData.message);
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return { success: true };
}