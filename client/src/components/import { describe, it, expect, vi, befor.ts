import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supervisorAgent, SupervisorQuery } from './supervisorAgent';
import { AIContextService } from './aiContextService';
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

  describe('_isLocationQuery', () => {
    it('should return true for a valid location query', () => {
      const parsedQuery = {
        intent: 'find_location_for_activity',
        entities: { location: 'Sydney' },
        isSafeForTooling: true,
        confidence: 0.8,
      };
      expect(agentInstance._isLocationQuery(parsedQuery)).toBe(true);
    });

    it('should return false if intent is not location-related', () => {
      const parsedQuery = {
        intent: 'general_chat',
        entities: { location: 'Sydney' },
        isSafeForTooling: true,
        confidence: 0.8,
      };
      expect(agentInstance._isLocationQuery(parsedQuery)).toBe(false);
    });

    it('should return false if confidence is too low', () => {
      const parsedQuery = {
        intent: 'find_location_for_activity',
        entities: { location: 'Sydney' },
        isSafeForTooling: true,
        confidence: 0.6,
      };
      expect(agentInstance._isLocationQuery(parsedQuery)).toBe(false);
    });

    it('should return false if location entity is missing', () => {
      const parsedQuery = {
        intent: 'find_location_for_activity',
        entities: {},
        isSafeForTooling: true,
        confidence: 0.9,
      };
      expect(agentInstance._isLocationQuery(parsedQuery)).toBe(false);
    });
  });

  describe('_handleLocationQuery', () => {
    it('should call performAdvancedLocationSearch and return a structured response', async () => {
      // Arrange
      const parsedQuery = { intent: 'find_location_for_activity', entities: { location: 'park' } };
      const query = {
        message: { text: 'find a park', sentAt: new Date().toISOString() },
        userId: 1,
        sessionId: 'test-session',
      };
      const startTime = Date.now();
      const mockSearchResponse = 'Found a great park for you!';

      // Mock the internal method that performs the search
      agentInstance.performAdvancedLocationSearch = vi.fn().mockResolvedValue(mockSearchResponse);

      // Act
      const response = await agentInstance._handleLocationQuery(parsedQuery, query, startTime);

      // Assert
      expect(agentInstance.performAdvancedLocationSearch).toHaveBeenCalledWith(
        parsedQuery,
        query.message.text,
        query.userId,
        query.sessionId
      );
      expect(response.response).toBe(mockSearchResponse);
      expect(response.modelUsed).toBe('advanced-location-synthesis');
      expect(response.toolsUsed).toEqual(expect.arrayContaining(['location-search']));
    });
  });

  describe('_handleGeneralQuery', () => {
    const mockQuery = {
      message: { text: 'tell me a joke', sentAt: new Date().toISOString() },
      userId: 1,
      sessionId: 'test-session',
      requiresValidation: false,
    };
    const mockParsedQuery = { intent: 'general_chat', entities: {} };
    const mockMcpBundle = { secureBundle: { some: 'data' } };

    beforeEach(() => {
      // Mock dependencies for this describe block
      (AIContextService.prepareSecureContext as vi.Mock).mockResolvedValue(mockMcpBundle);
      agentInstance.checkForToolCalling = vi.fn().mockResolvedValue(null);
      agentInstance._finalizeResponse = vi.fn().mockResolvedValue({
        finalResponse: 'This is a finalized joke.',
        validationStatus: 'not-required',
      });
    });

    it('should process a general query without tool use and call the finalization pipeline', async () => {
      // Act
      const response = await agentInstance._handleGeneralQuery(mockParsedQuery, mockQuery, Date.now());

      // Assert
      expect(AIContextService.prepareSecureContext).toHaveBeenCalledWith({
        userId: mockQuery.userId,
        includeHealthMetrics: true,
        includeChatHistory: true,
        maxHistoryItems: 10,
      });
      expect(agentInstance.checkForToolCalling).toHaveBeenCalled();
      expect(agentInstance._finalizeResponse).toHaveBeenCalled();
      expect(response.response).toBe('This is a finalized joke.');
      expect(response.modelUsed).toBe('gpt-4');
    });

    it('should return a tool-based response and bypass the finalization pipeline if a tool is called', async () => {
      // Arrange: Override the mock for checkForToolCalling for this specific test
      const toolResponse = {
        response: 'Here is some inspiration!',
        tools: ['meal-inspiration'],
      };
      agentInstance.checkForToolCalling.mockResolvedValue(toolResponse);

      // Act
      const response = await agentInstance._handleGeneralQuery(mockParsedQuery, mockQuery, Date.now());

      // Assert
      expect(AIContextService.prepareSecureContext).toHaveBeenCalled();
      expect(agentInstance.checkForToolCalling).toHaveBeenCalled();

      // _finalizeResponse should NOT be called when a tool is used
      expect(agentInstance._finalizeResponse).not.toHaveBeenCalled();

      expect(response.response).toBe(toolResponse.response);
      expect(response.modelUsed).toBe('tool-based');
      expect(response.toolsUsed).toEqual(toolResponse.tools);
    });
  });

  describe('_finalizeResponse', () => {
    const mockValidationContext = {
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      requiresValidation: false,
    };
    const rawResponse = 'This is a raw response from the LLM.';

    beforeEach(() => {
      // Mock dependencies for this describe block
      agentInstance.performMultiModelValidation = vi.fn().mockResolvedValue({
        response: rawResponse,
        status: 'validated-approved',
      });
      agentInstance.validateFeatureRecommendations = vi.fn().mockReturnValue({
        isValid: true,
      });
      (AIContextService.validateAIResponse as vi.Mock).mockResolvedValue({
        isSecure: true,
        sanitizedResponse: rawResponse,
      });
    });

    it('should return the raw response when no validation is required and all checks pass', async () => {
      // Act
      const result = await agentInstance._finalizeResponse(rawResponse, mockValidationContext, 'test-session');

      // Assert
      expect(result.finalResponse).toBe(rawResponse);
      expect(result.validationStatus).toBe('not-required');
      expect(agentInstance.performMultiModelValidation).not.toHaveBeenCalled();
      expect(agentInstance.validateFeatureRecommendations).toHaveBeenCalledWith(rawResponse);
      expect(AIContextService.validateAIResponse).toHaveBeenCalledWith(rawResponse, 'test-session');
    });

    it('should trigger multi-model validation when required', async () => {
      // Arrange
      const contextWithValidation = { ...mockValidationContext, requiresValidation: true };
      const validatedResponse = 'This is a validated response.';
      agentInstance.performMultiModelValidation.mockResolvedValue({
        response: validatedResponse,
        status: 'validated-approved',
      });

      // Act
      const result = await agentInstance._finalizeResponse(rawResponse, contextWithValidation, 'test-session');

      // Assert
      expect(agentInstance.performMultiModelValidation).toHaveBeenCalled();
      expect(result.finalResponse).toBe(validatedResponse);
      expect(result.validationStatus).toBe('validated-approved');
    });

    it('should correct the response if it contains unauthorized feature recommendations', async () => {
      // Arrange
      const correctedResponse = 'This is a corrected response with valid features.';
      agentInstance.validateFeatureRecommendations.mockReturnValue({
        isValid: false,
        correctedResponse: correctedResponse,
      });

      // Act
      const result = await agentInstance._finalizeResponse(rawResponse, mockValidationContext, 'test-session');

      // Assert
      expect(agentInstance.validateFeatureRecommendations).toHaveBeenCalled();
      expect(result.finalResponse).toBe(correctedResponse);
      expect(secureLog).toHaveBeenCalledWith(expect.stringContaining('unauthorized features'), expect.any(Object));
    });

    it('should sanitize the response if it contains PII', async () => {
      // Arrange
      const sanitizedResponse = 'This is a sanitized response.';
      (AIContextService.validateAIResponse as vi.Mock).mockResolvedValue({
        isSecure: false,
        sanitizedResponse: sanitizedResponse,
        violations: ['EMAIL'],
      });

      // Act
      const result = await agentInstance._finalizeResponse(rawResponse, mockValidationContext, 'test-session');

      // Assert
      expect(AIContextService.validateAIResponse).toHaveBeenCalled();
      expect(result.finalResponse).toBe(sanitizedResponse);
      expect(secureLog).toHaveBeenCalledWith(expect.stringContaining('AI response contained PII'), expect.any(Object));
    });
  });
});