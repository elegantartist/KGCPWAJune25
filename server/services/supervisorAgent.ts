/**
 * Supervisor Agent - The Brain of KGC AI System
 * Central AI orchestrator implementing multi-LLM validation and Model Context Protocol (MCP)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIContextService } from './aiContextService';
import { secureLog, validateMcpBundleSecurity, sanitizeFinalResponse } from './privacyMiddleware';
import { getMealInspiration, getWellnessInspiration, getWeeklyMealPlan, getWellnessProgram } from './inspirationMachines';
import { parseUserQuery, performStructuredLocationSearch } from './queryParser';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { 
  SUPERVISOR_AGENT_SYSTEM_PROMPT, 
  CHATBOT_ENGINEERING_GUIDELINES,
  SELF_SCORE_ANALYSIS_PROMPT,
  KGC_FEATURES,
  LOCATION_SYNTHESIS_PROMPT 
} from './prompt_templates';
import { AppError, LLMError, SecurityError, APIError } from './errors';

// Authorized KGC features list for strict validation
const AUTHORIZED_KGC_FEATURES = [
  'Home', 'Daily Self-Scores', 'Motivational Image Processing', 'MIP',
  'Inspiration Machine D', 'Diet Logistics', 'Inspiration Machine E&W',
  'E&W Support', 'MBP Wiz', 'Journaling', 'Progress Milestones',
  'Food Database', 'Chatbot', 'Health Snapshots'
];

// Keywords that might indicate unauthorized feature mentions
const UNAUTHORIZED_FEATURE_KEYWORDS = [
  'appointment', 'scheduling', 'calendar', 'booking', 'video call',
  'telehealth', 'prescription', 'diagnos', 'treatment', 'medication management',
  'reminder system', 'alert system', 'notification center', 'emergency',
  'vital signs', 'blood pressure', 'heart rate', 'glucose', 'weight tracking',
  'lab results', 'test results', 'medical records', 'health records'
];

// Initialize LLM clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});



export interface SupervisorQuery {
  message: {
    text: string;
    sentAt: string;
  };
  userId: number;
  sessionId?: string;
  requiresValidation?: boolean;
}

interface SupervisorResponse {
  response: string;
  sessionId: string;
  modelUsed: string;
  validationStatus?: string;
  toolsUsed?: string[];
  processingTime: number;
}

// Phase 3: Real Inspiration Machine Tools - Now using specialized sub-agents
async function getMealInspirationTool(mcpBundle: any): Promise<string> {
  secureLog('Meal inspiration machine activated', { bundleId: mcpBundle.user_id_pseudonym });
  
  try {
    return await getMealInspiration(mcpBundle);
  } catch (error) {
    secureLog('Meal inspiration fallback activated', { 
      bundleId: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    const dietGuidance = mcpBundle.care_plan_directives.includes('Diet Guidance:') 
      ? mcpBundle.care_plan_directives.split('Diet Guidance:')[1].split('\n')[0].trim()
      : 'balanced nutrition';

    return `Based on your personalized care plan focusing on ${dietGuidance}, I recommend a balanced meal with lean protein, vegetables, and complex carbohydrates. This supports stable energy and aligns with your dietary goals.`;
  }
}

async function getWellnessInspirationTool(mcpBundle: any): Promise<string> {
  secureLog('Wellness inspiration machine activated', { bundleId: mcpBundle.user_id_pseudonym });
  
  try {
    return await getWellnessInspiration(mcpBundle);
  } catch (error) {
    secureLog('Wellness inspiration fallback activated', { 
      bundleId: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    const exerciseRoutine = mcpBundle.care_plan_directives.includes('Exercise & Wellness Routine:')
      ? mcpBundle.care_plan_directives.split('Exercise & Wellness Routine:')[1].split('\n')[0].trim()
      : 'gentle movement';

    return `Here's a wellness activity suggestion based on your care plan emphasizing ${exerciseRoutine}: Try 10-15 minutes of gentle movement or mindfulness today.`;
  }
}

// Phase 3: Advanced Tool Functions
async function getWeeklyMealPlanTool(mcpBundle: any): Promise<string> {
  secureLog('Weekly meal planning tool activated', { bundleId: mcpBundle.user_id_pseudonym });
  
  try {
    return await getWeeklyMealPlan(mcpBundle);
  } catch (error) {
    secureLog('Weekly meal planning fallback activated', { 
      bundleId: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return `For weekly planning, focus on 2-3 simple, repeatable meals that align with your care plan. Consider batch cooking proteins and vegetables to support consistent healthy eating.`;
  }
}

async function getWellnessProgramTool(mcpBundle: any): Promise<string> {
  secureLog('Wellness program tool activated', { bundleId: mcpBundle.user_id_pseudonym });
  
  try {
    return await getWellnessProgram(mcpBundle);
  } catch (error) {
    secureLog('Wellness program fallback activated', { 
      bundleId: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return `Start with a simple daily routine: 15 minutes of movement, 5 minutes of mindfulness, and one social connection per week. Build consistency before increasing intensity.`;
  }
}

class SupervisorAgent {
  private static instance: SupervisorAgent;

  private constructor() {}

  static getInstance(): SupervisorAgent {
    if (!SupervisorAgent.instance) {
      SupervisorAgent.instance = new SupervisorAgent();
    }
    return SupervisorAgent.instance;
  }

  /**
   * Main orchestration function for supervisor queries
   * Implements resilient agent orchestration with time-aware logic and decoupled primary/secondary tasks
   * This method is now a high-level orchestrator that delegates tasks to private helpers.
   */
  async runSupervisorQuery(query: SupervisorQuery): Promise<SupervisorResponse> {
    const startTime = Date.now();
    const finalSessionId = query.sessionId || crypto.randomUUID();
    const queryWithSession = { ...query, sessionId: finalSessionId };

    // 1. Handle stale messages first
    const staleResponse = await this._handleStaleMessage(queryWithSession, startTime);
    if (staleResponse) {
      return staleResponse;
    }

    let mainResponse: SupervisorResponse;
    try {
      // 2. Process the query using the main logic handler
      mainResponse = await this._processQuery(queryWithSession, startTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      secureLog('ERROR in supervisor agent flow', { 
        sessionId: finalSessionId, 
        error: errorMessage,
        errorName: errorName,
        stack: error instanceof Error ? error.stack : undefined
      });

      let userFacingMessage = "I'm sorry, an unexpected error occurred. Our technical team has been notified. Please try again later.";
      let modelUsed = 'error-handler-general';

      if (error instanceof AppError && error.isOperational) {
        userFacingMessage = error.message;
        modelUsed = `error-handler-${error.name.toLowerCase()}`;
      }
      
      return {
        response: userFacingMessage,
        sessionId: finalSessionId,
        modelUsed: modelUsed,
        processingTime: Date.now() - startTime
      };
    }

    // --- STAGE 2: Execute non-critical side effects asynchronously ---
    // We do NOT use 'await' here. This is "fire-and-forget".
    this.updateProgressMilestones(query.userId, "chatbotInteraction", finalSessionId)
      .catch((err: Error | unknown) => {
        // Log the error for developers but DO NOT let it crash the response to the user.
        secureLog("Non-critical error in milestone update", { 
          sessionId: finalSessionId, 
          userId: query.userId,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      });
    
    this.logAnalytics(query.userId, "queryExecuted", finalSessionId)
      .catch((err: Error | unknown) => {
        secureLog("Non-critical error in analytics logging", { 
          sessionId: finalSessionId, 
          userId: query.userId,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      });

    // --- STAGE 3: Return the successful main response to the user immediately ---
    return mainResponse;
  }

  /**
   * Handles the core logic of processing a user query after initial checks.
   */
  private async _processQuery(
    query: SupervisorQuery & { sessionId: string },
    startTime: number
  ): Promise<SupervisorResponse> {
    const { message: { text: userQuery } } = query;

    secureLog('Supervisor query processing started', { userId: query.userId, sessionId: query.sessionId, queryLength: userQuery.length });
    const parsedQuery = await parseUserQuery(userQuery);
    secureLog('Query parsed successfully', { sessionId: query.sessionId, intent: parsedQuery.intent });

    if (this._isLocationQuery(parsedQuery)) {
      return this._handleLocationQuery(parsedQuery, query, startTime);
    } else {
      return this._handleGeneralQuery(parsedQuery, query, startTime);
    }
  }

  /**
   * Checks if a message is stale (older than 15 minutes) and returns a re-engagement response if so.
   * @returns A SupervisorResponse if the message is stale, otherwise null.
   */
  private async _handleStaleMessage(
    query: SupervisorQuery & { sessionId: string },
    startTime: number
  ): Promise<SupervisorResponse | null> {
    const { message, userId, sessionId } = query;
    const timeSent = new Date(message.sentAt);
    const timeProcessed = new Date();
    const deltaInMinutes = (timeProcessed.getTime() - timeSent.getTime()) / 60000;

    if (deltaInMinutes <= 15) {
      return null; // Message is not stale
    }

    secureLog('Stale offline message received. Pivoting to re-engagement.', {
      userId,
      sessionId,
      deltaInMinutes,
    });

    const reEngagementResponse: SupervisorResponse = {
      response:
        "Welcome back online! I've just received your message from earlier. I hope you were able to resolve what you needed. How can I help you right now?",
      sessionId: sessionId,
      modelUsed: 're-engagement',
      processingTime: Date.now() - startTime,
    };

    // Run analytics as a non-critical side effect
    this.logAnalytics(userId, 'staleMessageReEngagement', sessionId).catch(
      (err: Error | unknown) => {
        secureLog('Non-critical error in analytics logging for stale message', {
          sessionId: sessionId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    );

    return reEngagementResponse;
  }

  /**
   * Determines if a parsed query is for finding a location.
   */
  private _isLocationQuery(parsedQuery: any): boolean {
    return (
      parsedQuery.intent === 'find_location_for_activity' &&
      parsedQuery.entities.location &&
      parsedQuery.isSafeForTooling &&
      parsedQuery.confidence > 0.7
    );
  }

  /**
   * Handles location-specific queries by using search tools.
   */
  private async _handleLocationQuery(
    parsedQuery: any,
    query: SupervisorQuery & { sessionId: string },
    startTime: number
  ): Promise<SupervisorResponse> {
    const { message: { text: userQuery }, userId, sessionId } = query;

    secureLog('Location intent detected. Using structured location search.', {
      entities: parsedQuery.entities,
      sessionId,
    });

    const searchResponse = await this.performAdvancedLocationSearch(
      parsedQuery,
      userQuery,
      userId,
      sessionId
    );

    return {
      response: searchResponse,
      sessionId,
      modelUsed: 'advanced-location-synthesis',
      toolsUsed: ['nlu-parser', 'location-search', 'care-plan-synthesis'],
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Handles general, non-location-based queries.
   */
  private async _handleGeneralQuery(
    parsedQuery: any,
    query: SupervisorQuery & { sessionId: string },
    startTime: number
  ): Promise<SupervisorResponse> {
    const { message: { text: userQuery }, userId, sessionId, requiresValidation } = query;

    const contextData = await AIContextService.prepareSecureContext({
      userId,
      includeHealthMetrics: true,
      includeChatHistory: true,
      maxHistoryItems: 10,
    });
    const mcpBundle = contextData.secureBundle;

    const securityValidation = validateMcpBundleSecurity(mcpBundle, userQuery);
    if (!securityValidation.isSecure) {
      throw new SecurityError(
        'For your privacy and security, my system blocked this request. Please try rephrasing your question without any personal information.'
      );
    }

    const toolResponse = await this.checkForToolCalling(userQuery, mcpBundle, parsedQuery);
    if (toolResponse) {
      return {
        response: toolResponse.response,
        sessionId,
        modelUsed: 'tool-based',
        toolsUsed: toolResponse.tools,
        processingTime: Date.now() - startTime,
      };
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userQuery, mcpBundle);
    const primaryResponse = await this.callPrimaryLLM(systemPrompt, userPrompt);

    const { finalResponse, validationStatus } = await this._finalizeResponse(
      primaryResponse,
      { systemPrompt, userPrompt, requiresValidation: requiresValidation || this.requiresValidation(userQuery) },
      sessionId
    );

    secureLog('General query processing completed successfully', { sessionId, processingTime: Date.now() - startTime });

    return {
      response: finalResponse,
      sessionId,
      modelUsed: 'gpt-4',
      validationStatus,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Applies a series of validation and sanitization steps to the raw LLM response.
   */
  private async _finalizeResponse(
    rawResponse: string,
    validationContext: { systemPrompt: string; userPrompt: string; requiresValidation: boolean },
    sessionId: string
  ): Promise<{ finalResponse: string; validationStatus: string }> {
    let currentResponse = rawResponse;
    let validationStatus = 'not-required';

    // 1. Multi-model validation if required
    if (validationContext.requiresValidation) {
      secureLog('Multi-model validation triggered', { sessionId });
      const validated = await this.performMultiModelValidation(
        validationContext.systemPrompt,
        validationContext.userPrompt,
        currentResponse
      );
      currentResponse = validated.response;
      validationStatus = validated.status;
    }

    // 2. KGC feature recommendation validation
    const featureValidation = this.validateFeatureRecommendations(currentResponse);
    if (!featureValidation.isValid && featureValidation.correctedResponse) {
      secureLog('Response contained unauthorized features, using corrected response', { sessionId });
      currentResponse = featureValidation.correctedResponse;
    }

    // 3. Final PII/PHI security scan on the response
    const responseValidation = await AIContextService.validateAIResponse(currentResponse, sessionId);
    if (!responseValidation.isSecure) {
      secureLog('AI response contained PII, sanitizing', { sessionId, violations: responseValidation.violations });
      currentResponse = responseValidation.sanitizedResponse;
    }

    return { finalResponse: currentResponse, validationStatus };
  }

  /**
   * Check if the query requires specific tool calling (Phase 3: Enhanced with async tools)
   * Enhanced with parsed query context for better intent understanding
   */
  private async checkForToolCalling(userQuery: string, mcpBundle: any, parsedQuery?: any): Promise<{ response: string; tools: string[] } | null> {
    const query = userQuery.toLowerCase();

    // Weekly meal planning tool
    if (query.includes('week') && (query.includes('meal') || query.includes('plan') || query.includes('food'))) {
      const response = await getWeeklyMealPlanTool(mcpBundle);
      return {
        response,
        tools: ['weekly-meal-plan']
      };
    }

    // Wellness program tool
    if (query.includes('program') || query.includes('routine') || (query.includes('week') && query.includes('wellness'))) {
      const response = await getWellnessProgramTool(mcpBundle);
      return {
        response,
        tools: ['wellness-program']
      };
    }

    // Meal inspiration tool
    if (query.includes('meal') || query.includes('eat') || query.includes('food') || query.includes('recipe') || query.includes('cook')) {
      const response = await getMealInspirationTool(mcpBundle);
      return {
        response,
        tools: ['meal-inspiration']
      };
    }

    // Wellness inspiration tool
    if (query.includes('feel') || query.includes('activity') || query.includes('exercise') || query.includes('movement') || query.includes('wellness') || query.includes('stress')) {
      const response = await getWellnessInspirationTool(mcpBundle);
      return {
        response,
        tools: ['wellness-inspiration']
      };
    }

    return null;
  }

  /**
   * Validate response to ensure only authorized KGC features are mentioned
   */
  private validateFeatureRecommendations(response: string): { isValid: boolean; correctedResponse?: string } {
    const responseLower = response.toLowerCase();
    
    // Check for unauthorized feature keywords
    const unauthorizedMentions = UNAUTHORIZED_FEATURE_KEYWORDS.filter(keyword => 
      responseLower.includes(keyword.toLowerCase())
    );
    
    if (unauthorizedMentions.length > 0) {
      secureLog('Unauthorized feature mentions detected', { 
        unauthorizedMentions,
        responsePreview: response.substring(0, 100)
      });
      
      // Generate a corrected response that redirects to authorized features
      const correctedResponse = `I understand you're looking for information about KGC's capabilities. I can help you with our 13 available features:

**Health Tracking & Progress:**
- Daily Self-Scores (earn rewards for healthy choices!)
- Health Snapshots (visual progress summaries)
- Progress Milestones (achievement badges and $100+ rewards)

**Personalized Guidance:**
- Inspiration Machine D (meal ideas from your care plan)
- Inspiration Machine E&W (exercise & wellness inspiration)
- Diet Logistics (grocery & meal delivery aligned with your plan)

**Support Tools:**
- E&W Support (find local gyms, trainers, yoga studios)
- MBP Wiz (best medication prices via Chemist Warehouse)
- Food Database (nutritional info & FoodSwitch scanner)
- Journaling (track thoughts and health experiences)

**Core Features:**
- Home dashboard (easy access to all features)
- Motivational Image Processing (enhance your "Keep Going" button)
- Chatbot (me - your KGC AI assistant!)

Which of these features would be most helpful for your health journey today?`;

      return { isValid: false, correctedResponse };
    }
    
    return { isValid: true };
  }

  /**
   * Build the system prompt for the Supervisor Agent
   */
  private buildSystemPrompt(): string {
    return `${SUPERVISOR_AGENT_SYSTEM_PROMPT}

${CHATBOT_ENGINEERING_GUIDELINES}`;
  }

  /**
   * Build the user prompt with MCP context
   */
  private buildUserPrompt(userQuery: string, mcpBundle: any): string {
    return `PATIENT CONTEXT (anonymized and secure):
Patient ID: ${mcpBundle.user_id_pseudonym}

CARE PLAN DIRECTIVES:
${mcpBundle.care_plan_directives}

RECENT HEALTH METRICS:
${JSON.stringify(mcpBundle.health_metrics, null, 2)}

RECENT CONVERSATION HISTORY (PII-redacted):
${mcpBundle.redacted_chat_history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT USER QUERY: "${userQuery}"

YOUR TASK: Provide a caring, motivational, and educational response that:
1. Addresses the user's specific query
2. Incorporates relevant aspects of their care plan directives
3. Considers their recent health metrics and conversation context
4. Uses CBT/MI techniques where appropriate
5. Maintains professional boundaries as a Type 1 SaMD
6. Encourages adherence to their healthcare provider's guidance`;
  }

  /**
   * Call the primary LLM (OpenAI GPT-4)
   */
  private async callPrimaryLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
    } catch (error) {
      secureLog('Primary LLM call failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      // Throw a specific, operational error that can be caught and handled gracefully.
      throw new LLMError(
        'I am having trouble connecting to my core AI services. Please try again in a moment.'
      );
    }
  }

  /**
   * Determine if multi-model validation is required
   */
  private requiresValidation(userQuery: string): boolean {
    const sensitiveTopics = [
      'medication', 'dose', 'side effect', 'symptom', 'diagnosis', 
      'treatment', 'therapy', 'medical', 'doctor', 'physician',
      'pain', 'hurt', 'emergency', 'urgent', 'serious'
    ];

    return sensitiveTopics.some(topic => 
      userQuery.toLowerCase().includes(topic)
    );
  }

  /**
   * Classify if a query has location intent
   */
  private classifyLocationIntent(userQuery: string): boolean {
    const locationKeywords = [
      ' in ', ' near ', ' where is ', ' directions to ', ' around ', ' a walk ', 
      ' walk in ', ' going to ', ' travel to ', ' visit ', ' trip to ', ' places ',
      ' location', ' area', ' city', ' town', ' suburb', ' region'
    ];
    const lowerCaseQuery = userQuery.toLowerCase();
    return locationKeywords.some(keyword => lowerCaseQuery.includes(keyword));
  }

  /**
   * Extract location entity from user query
   */
  private extractLocationEntity(userQuery: string): string {
    // Simple extraction - look for capitalized words that might be places
    const words = userQuery.split(' ');
    const capitalizedWords = words.filter(word => 
      /^[A-Z][a-z]+/.test(word) && word.length > 2
    );
    
    // Return the first likely location name found
    return capitalizedWords.length > 0 ? capitalizedWords[0] : 'the area you mentioned';
  }

  /**
   * Advanced location search with Care Plan Directive synthesis
   */
  private async performAdvancedLocationSearch(parsedQuery: any, userQuery: string, userId: number, sessionId: string): Promise<string> {
    // --- START OF MODIFICATIONS ---

    // Part 1: Proactive Prerequisite Check
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    if (!TAVILY_API_KEY) {
      // Also update the log message to be accurate.
      secureLog('CRITICAL_ERROR: TAVILY_API_KEY is not configured for location searches.', { sessionId, userId });
      throw new APIError(
        'LocationSearchMisconfigured', 
        500, 
        "I'm sorry, my location search feature is currently unavailable.", 
        false // This is a non-operational error, needs fixing by dev
      );
    }

    // Part 2: Comprehensive try...catch Error Insulation
    try {
      const { activity = 'activity', location = 'area' } = parsedQuery.entities;
      secureLog('Advanced location search initiated', { activity, location, userId, sessionId });

      // Get patient's care plan directives
      const mcpBundle = await AIContextService.prepareSecureContext({ userId });
      
      // Use Tavily search tool for actual location data
      const tavilyResults = await this.performTavilyLocationSearch(`best places for a ${activity} in ${location}`);
      const synthesizedResponse = await this.synthesizeLocationResponse(parsedQuery, tavilyResults, mcpBundle);

      return synthesizedResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('ERROR during performAdvancedLocationSearch', { sessionId, userId, error: errorMessage });

      // Throw an operational error that the main handler can show to the user.
      throw new APIError(
        'LocationSearchFailed', 
        503, 
        "I'm having a little trouble accessing specific location details right now, but I can still help with other questions or provide general wellness tips!",
        true // This is an operational error (e.g., Tavily is down)
      );
    }
    // --- END OF MODIFICATIONS ---
  }

  /**
   * Synthesize location recommendations with Care Plan Directives
   */
  private async synthesizeLocationResponse(parsedQuery: any, tavilyResults: any, mcpBundle: any): Promise<string> {
    try {
      // Use centralized KGC features for recommendations

      const { activity = 'activity', location = 'area' } = parsedQuery.entities;

      // Construct the user message for synthesis, now including app features
      const userPromptForSynthesis = `
        User's Original Query: "${activity} in ${location}"

        Patient's Care Plan Directives (CPDs):
        ${mcpBundle.care_plan_directives}

        Tavily Search Results:
        ${JSON.stringify(tavilyResults, null, 2)}

        KGC App Features available for recommendation:
        ${JSON.stringify(KGC_FEATURES.map(f => `${f.name} - ${f.longDescription}`))}
      `;

      // Make the final API call to the LLM for synthesis
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: LOCATION_SYNTHESIS_PROMPT }, // Using the NEW, enhanced prompt
          { role: 'user', content: userPromptForSynthesis }
        ],
        max_tokens: 600,
        temperature: 0.7
      });

      const synthesizedResponse = response.choices[0]?.message?.content;
      
      return synthesizedResponse || "I found some great options, but am having trouble personalizing them for you right now.";

    } catch (error) {
      secureLog('Response synthesis failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return "I'm sorry, I'm having trouble processing that request right now. Could you try again in a moment?";
    }
  }

  /**
   * Perform location search using Tavily API
   */
  private async performTavilyLocationSearch(searchQuery: string): Promise<any> {
    try {
      const axios = (await import('axios')).default;
      
      if (!process.env.TAVILY_API_KEY) {
        secureLog('TAVILY_API_KEY not configured for location search');
        return {
          query: searchQuery,
          results: [],
          message: "Location search service not configured"
        };
      }

      const response = await axios({
        method: 'post',
        url: 'https://api.tavily.com/search',
        data: {
          api_key: process.env.TAVILY_API_KEY,
          query: searchQuery,
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
          max_results: 8,
          include_images: true
        },
        timeout: 15000
      });

      if (!response.data || !response.data.results) {
        return {
          query: searchQuery,
          results: [],
          message: "No location results found"
        };
      }

      return {
        query: searchQuery,
        answer: response.data.answer,
        results: response.data.results.map((result: any) => ({
          title: result.title || 'Location',
          url: result.url,
          content: result.content?.substring(0, 300) || 'No description available',
          score: result.score || 0
        }))
      };

    } catch (error) {
      secureLog('Tavily location search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: searchQuery
      });
      
      return {
        query: searchQuery,
        results: [],
        message: "Location search temporarily unavailable"
      };
    }
  }

  /**
   * Perform location search using Tavily or similar search tool
   */
  private async performLocationSearch(locationEntity: string, userQuery: string, userId: number, sessionId: string): Promise<string> {
    try {
      // Since we don't have Tavily configured, provide a helpful response
      // that acknowledges the location query and provides general guidance
      secureLog('Location search requested', { 
        locationEntity, 
        userId, 
        sessionId 
      });

      return `I understand you're asking about ${locationEntity}! While I can't provide specific local recommendations right now, I'd suggest:

• Checking local tourism websites or apps like TripAdvisor for current recommendations
• Looking at walking trails and parks in the ${locationEntity} area
• Considering your health goals - walking is excellent exercise and great for mental wellbeing
• Making sure to stay hydrated and wear appropriate footwear for your walk

If you're planning regular walks, this is fantastic for your overall health! Would you like some tips on making walking a sustainable part of your wellness routine?`;

    } catch (error) {
      secureLog('Location search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      return `I'd love to help with information about ${locationEntity}, but I'm having trouble accessing location data right now. For walking recommendations, I'd suggest checking local tourism websites or asking locals for their favorite spots!`;
    }
  }

  /**
   * Perform multi-model validation using Anthropic Claude
   */
  private async performMultiModelValidation(
    systemPrompt: string, 
    userPrompt: string, 
    primaryResponse: string
  ): Promise<{ response: string; status: string }> {
    try {
      const validationPrompt = `VALIDATION TASK: Review the following AI health assistant response for accuracy, safety, and adherence to Type 1 SaMD guidelines.

ORIGINAL SYSTEM PROMPT:
${systemPrompt}

ORIGINAL USER CONTEXT:
${userPrompt}

PRIMARY AI RESPONSE TO VALIDATE:
"${primaryResponse}"

VALIDATION CRITERIA:
1. Does the response stay within non-diagnostic, educational boundaries?
2. Does it properly adhere to the user's care plan directives?
3. Is the response safe and appropriate for a health guidance context?
4. Does it avoid providing medical diagnoses or specific medical advice?
5. Is the tone supportive and motivational using CBT/MI principles?

Provide your assessment: APPROVED, NEEDS_REVISION, or REJECTED with brief reasoning.`;

      const validationResponse = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          { role: 'user', content: validationPrompt }
        ]
      });

      const validation = validationResponse.content[0].type === 'text' 
        ? validationResponse.content[0].text 
        : '';

      if (validation.includes('APPROVED')) {
        return { response: primaryResponse, status: 'validated-approved' };
      } else if (validation.includes('NEEDS_REVISION')) {
        // In a full implementation, we would generate a revised response
        return { response: primaryResponse, status: 'validated-with-concerns' };
      } else {
        // Return a safe fallback response
        return { 
          response: 'Thank you for your question. For the most accurate guidance regarding your health plan, I recommend discussing this directly with your healthcare provider.',
          status: 'validated-rejected'
        };
      }
    } catch (error) {
      secureLog('Multi-model validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { response: primaryResponse, status: 'validation-unavailable' };
    }
  }

  /**
   * Update progress milestones (non-critical background task)
   */
  private async updateProgressMilestones(userId: number, milestone: string, sessionId: string): Promise<void> {
    try {
      // For now, we'll use secure logging for milestone tracking
      // This can be extended to use a database table when progressMilestones schema is added
      secureLog('Progress milestone tracked', { 
        userId, 
        milestone, 
        sessionId,
        timestamp: new Date().toISOString(),
        event: 'chatbot_interaction'
      });

      // In a future implementation, this would insert into a progressMilestones table:
      // await db.insert(schema.progressMilestones).values({ ... });
      
    } catch (error) {
      // Re-throw to be caught by the calling code's error handler
      throw new Error(`Milestone update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log analytics data (non-critical background task)
   */
  private async logAnalytics(userId: number, event: string, sessionId: string): Promise<void> {
    try {
      // In a production system, this would log to an analytics service
      // For now, we'll use the secure logging system
      secureLog('Analytics event', {
        userId,
        event,
        sessionId,
        timestamp: new Date().toISOString()
      });

      // Could also log to database analytics table if it exists
      // await db.insert(schema.analyticsEvents).values({ ... });
      
    } catch (error) {
      // Re-throw to be caught by the calling code's error handler
      throw new Error(`Analytics logging failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Handle self-score analysis with dedicated prompt
   */
  public async runSelfScoreAnalysis(
    userId: number, 
    selfScores: { diet: number; exercise: number; medication: number },
    sessionId?: string
  ): Promise<SupervisorResponse> {
    const startTime = Date.now();
    const finalSessionId = sessionId || crypto.randomUUID();

    try {
      // Get MCP context for the user
      const contextResponse = await AIContextService.prepareSecureContext({
        userId,
        includeHealthMetrics: true,
        includeChatHistory: false
      });
      const mcpBundle = contextResponse.secureBundle;

      // Validate MCP bundle security
      if (!contextResponse.securityValidation.isSecure) {
        throw new Error('MCP bundle failed security validation');
      }

      // Build user prompt with self-scores
      const userPrompt = `PATIENT CONTEXT (anonymized and secure):
Patient ID: ${mcpBundle.user_id_pseudonym}

CARE PLAN DIRECTIVES:
${mcpBundle.care_plan_directives}

CURRENT SELF-SCORES:
Diet: ${selfScores.diet}/10
Exercise: ${selfScores.exercise}/10
Medication: ${selfScores.medication}/10

RECENT HEALTH METRICS:
${JSON.stringify(mcpBundle.health_metrics, null, 2)}

YOUR TASK: Analyze these self-scores and provide immediate, personalized feedback.`;

      // Call LLM with dedicated self-score analysis prompt
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: SELF_SCORE_ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const rawResponse = completion.choices[0]?.message?.content || 
        'I apologize, but I was unable to analyze your self-scores at this time. Please try again.';

      const processingTime = Date.now() - startTime;

      // Log successful analysis
      secureLog('Self-score analysis completed', {
        userId,
        sessionId: finalSessionId,
        processingTime
      });

      return {
        response: sanitizeFinalResponse(rawResponse),
        sessionId: finalSessionId,
        modelUsed: 'gpt-4-self-score-analysis',
        toolsUsed: ['self-score-analysis'],
        processingTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('Self-score analysis failed', {
        userId,
        sessionId: finalSessionId,
        error: errorMessage
      });

      // Throw a specific error that the API route can catch and handle.
      throw new APIError(
        'SelfScoreAnalysisError', 
        500, 
        'I apologize, but I was unable to analyze your self-scores at this time. Please try again.',
        true
      );
    }
  }
}



export const supervisorAgent = SupervisorAgent.getInstance();