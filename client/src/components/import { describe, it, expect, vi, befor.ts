import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supervisorAgent, SupervisorQuery } from './supervisorAgent';
import { secureLog } from './privacyMiddleware';

// Mock external dependencies to isolate the agent
vi.mock('./aiContextService', () => ({
  AIContextService: {
    prepareSecureContext: vi.fn(),
    validateAIResponse: vi.fn(),
  },
}));

vi.mock('./privacyMiddleware', () => ({
  secureLog: vi.fn(),
  validateMcpBundleSecurity: vi.fn(() => ({ isSecure: true })),
  sanitizeFinalResponse: vi.fn(response => response),
}));

vi.mock('./queryParser', () => ({
  parseUserQuery: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
}));

// Mock LLM clients
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
  })),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

describe('SupervisorAgent', () => {
  let agentInstance: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Use the singleton instance for testing
    agentInstance = supervisorAgent;
  });

  describe('_handleStaleMessage', () => {
    it('should return a re-engagement response for a message older than 15 minutes', async () => {
      // Arrange: Create a timestamp for 16 minutes ago
      const staleTimestamp = new Date(Date.now() - 16 * 60 * 1000).toISOString();
      const query: SupervisorQuery = {
        message: { text: 'Hello?', sentAt: staleTimestamp },
        userId: 1,
      };

      // Act: Call the private method with the stale message
      const response = await agentInstance._handleStaleMessage({ ...query, sessionId: 'test-session' }, Date.now());

      // Assert: Check for the correct re-engagement response
      expect(response).not.toBeNull();
      expect(response?.modelUsed).toBe('re-engagement');
      expect(response?.response).toContain('Welcome back online!');
      expect(secureLog).toHaveBeenCalledWith(expect.stringContaining('Stale offline message'), expect.any(Object));
    });

    it('should return null for a recent message (less than 15 minutes old)', async () => {
      // Arrange: Create a recent timestamp
      const recentTimestamp = new Date().toISOString();
      const query: SupervisorQuery = {
        message: { text: 'Hello?', sentAt: recentTimestamp },
        userId: 1,
      };

      // Act: Call the private method with the recent message
      const response = await agentInstance._handleStaleMessage({ ...query, sessionId: 'test-session' }, Date.now());

      // Assert: Expect null, indicating the message is not stale and processing should continue
      expect(response).toBeNull();
    });
  });
});