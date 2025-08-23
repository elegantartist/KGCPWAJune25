// client/src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_URL; // Vercel environment variable

// Example: health check call
export async function fetchHealthCheck() {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

// Example: generic GET request
export async function getData(endpoint: string) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

// Example: generic POST request
export async function postData(endpoint: string, data: any) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

