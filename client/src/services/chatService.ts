/**
 * Chat Service
 *
 * This service encapsulates all client-side API communication related to the
 * main chat functionality. It provides a clean interface for UI components
 * to interact with the backend chat agent.
 */

export interface ChatApiResponse {
  response: string;
  sessionId?: string;
  modelUsed?: string;
  validationStatus?: string;
  toolsUsed?: string[];
  error?: string; // To carry over any error messages
}

/**
 * Sends a message to the new backend /api/chat endpoint.
 *
 * This function will replace the direct, local calls to the supervisorAgent
 * in the chat UI. It handles fetching the authentication token, making the
 * network request, and parsing the response.
 *
 * @param message The text of the message to send.
 * @param sessionId The current chat session ID (optional).
 * @returns A promise that resolves to the AI's response.
 */
export const sendChatMessage = async (message: string, sessionId?: string): Promise<ChatApiResponse> => {
  try {
    // The authentication token is required for this secure endpoint.
    // We assume the useAuth() hook stores it in localStorage after login.
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Return a structured error for auth issues.
      return {
        response: "Authentication error. Please log in again to use the chat.",
        error: 'Authentication token not found.',
      };
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // The body must match the SupervisorQuery interface on the backend.
      body: JSON.stringify({
        message: {
          text: message,
          sentAt: new Date().toISOString(),
        },
        sessionId
      }),
    });

    const data: ChatApiResponse = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.response || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (error: any) {
    console.error('Chat API request failed:', error);
    return {
      response: "I'm sorry, but I'm having trouble connecting right now. Please try again in a moment.",
      error: error.message,
    };
  }
};
