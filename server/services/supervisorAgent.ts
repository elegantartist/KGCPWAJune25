/**
 * Supervisor Agent - The Brain of KGC AI System
 * Central AI orchestrator implementing multi-LLM validation and Model Context Protocol (MCP)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIContextService } from './aiContextService';
import { secureLog, validateMcpBundleSecurity } from './privacyMiddleware';
import { getMealInspiration, getWellnessInspiration, getWeeklyMealPlan, getWellnessProgram } from './inspirationMachines';
import { parseUserQuery, performStructuredLocationSearch } from './queryParser';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Initialize LLM clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Advanced Response Synthesis System Prompt
const LOCATION_SYNTHESIS_PROMPT = `
You are the KGC Health Assistant, a caring, motivational, and hyper-competent health companion. Your primary goal is to help users adhere to their doctor's care plan by providing real, actionable location recommendations.

Your task is to analyze authentic search results and synthesize them into a succinct, personalized response with verified locations.

**CONTEXT PROVIDED:**
1. **User's Query:** The exact location request
2. **Patient's Care Plan Directives:** Health goals set by their doctor
3. **Real Search Results:** Actual locations from web search
4. **KGC App Features:** Available app functionality

**RESPONSE STRUCTURE:**
1. **Brief Personalized Opening:** Connect the query to their care plan (1 sentence)
2. **Verified Location Recommendations:** List 3-4 actual places from search results with:
   - Name and brief description (1-2 sentences each)
   - Only include locations that actually exist and are mentioned in search results
   - Verify information is accurate and current
3. **KGC Feature Suggestion:** Recommend one relevant app feature (1 sentence)
4. **Encouraging Close:** Brief motivational statement and question

**CRITICAL REQUIREMENTS:**
- **ONLY USE REAL LOCATIONS:** Extract actual place names, addresses, and details from search results
- **VERIFY ACCURACY:** Ensure all location information is factual and current
- **BE SUCCINCT:** Keep total response under 150 words
- **NO FABRICATION:** Never invent locations or details not in search results
- **NO MEDICAL ADVICE:** Focus on locations and activities only

**QUALITY CHECK:** Before responding, verify each location mentioned actually appears in the search results provided.
`;

interface SupervisorQuery {
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
   */
  async runSupervisorQuery(query: SupervisorQuery): Promise<SupervisorResponse> {
    const { message, userId, sessionId } = query;
    const { text: userQuery, sentAt } = message;
    const startTime = Date.now();
    const finalSessionId = sessionId || crypto.randomUUID();

    const timeSent = new Date(sentAt);
    const timeProcessed = new Date();
    
    // Calculate the time difference in minutes
    const deltaInMinutes = (timeProcessed.getTime() - timeSent.getTime()) / 60000;

    // --- TIME-AWARE LOGIC GATE ---
    // If the message is more than 15 minutes old, it's stale. Re-engage instead of answering.
    if (deltaInMinutes > 15) {
      secureLog('Stale offline message received. Pivoting to re-engagement.', { 
        userId, 
        sessionId: finalSessionId, 
        deltaInMinutes 
      });
      
      // Instead of processing the old query, return a context-aware re-engagement message.
      const reEngagementResponse: SupervisorResponse = {
        response: "Welcome back online! I've just received your message from earlier. I hope you were able to resolve what you needed. How can I help you right now?",
        sessionId: finalSessionId,
        modelUsed: 're-engagement',
        processingTime: Date.now() - startTime
      };
      
      // Run analytics as a non-critical side effect
      this.logAnalytics(userId, "staleMessageReEngagement", finalSessionId).catch((err: Error | unknown) => {
        secureLog("Non-critical error in analytics logging for stale message", { 
          sessionId: finalSessionId, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      });

      return reEngagementResponse;
    }

    // --- If the message is recent, proceed with the normal resilient workflow ---
    let mainResponse: SupervisorResponse;

    // --- STAGE 1: Execute the critical, primary task ---
    try {
      secureLog('Supervisor query initiated', { 
        userId, 
        sessionId: finalSessionId,
        queryLength: userQuery.length,
        deltaInMinutes
      });

      // --- NEW STEP 1: Parse the query to understand intent and entities ---
      const parsedQuery = await parseUserQuery(userQuery);
      
      secureLog('Query parsed successfully', {
        sessionId: finalSessionId,
        intent: parsedQuery.intent,
        entityCount: Object.keys(parsedQuery.entities).length,
        isSafeForTooling: parsedQuery.isSafeForTooling,
        confidence: parsedQuery.confidence
      });

      // --- NEW STEP 2: Intelligent Tool-Use based on Intent ---
      if (parsedQuery.intent === 'find_location_for_activity' && 
          parsedQuery.entities.location && 
          parsedQuery.isSafeForTooling &&
          parsedQuery.confidence > 0.7) {
        
        secureLog('Location intent detected. Using structured location search.', { 
          entities: parsedQuery.entities,
          sessionId: finalSessionId
        });

        // Enhanced location search with synthesis
        const searchResponse = await this.performAdvancedLocationSearch(
          parsedQuery,
          userQuery,
          userId,
          finalSessionId
        );

        mainResponse = {
          response: searchResponse,
          sessionId: finalSessionId,
          modelUsed: 'advanced-location-synthesis',
          toolsUsed: ['nlu-parser', 'location-search', 'care-plan-synthesis'],
          processingTime: Date.now() - startTime
        };
      } else {
        // Normal flow for non-location queries
        
        // 1. Create secure MCP bundle using privacy middleware
        const contextData = await AIContextService.prepareSecureContext({
          userId,
          includeHealthMetrics: true,
          includeChatHistory: true,
          maxHistoryItems: 10
        });

        const mcpBundle = contextData.secureBundle;

        // 2. Validate MCP bundle security with query context
        const securityValidation = validateMcpBundleSecurity(mcpBundle, userQuery);
        if (!securityValidation.isSecure) {
          throw new Error(`Security validation failed: ${securityValidation.violations.join(', ')}`);
        }

        // 3. Enhanced tool calling with parsed intent context
        const toolResponse = await this.checkForToolCalling(userQuery, mcpBundle);
        if (toolResponse) {
          mainResponse = {
            response: toolResponse.response,
            sessionId: finalSessionId,
            modelUsed: 'tool-based',
            toolsUsed: toolResponse.tools,
            processingTime: Date.now() - startTime
          };
        } else {
        // 4. Construct primary LLM prompt
        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(userQuery, mcpBundle);

        // 5. Call primary LLM (OpenAI GPT-4)
        const primaryResponse = await this.callPrimaryLLM(systemPrompt, userPrompt);

        // 6. Multi-model validation if required
        let finalResponse = primaryResponse;
        let validationStatus = 'not-required';

        if (query.requiresValidation || this.requiresValidation(userQuery)) {
          secureLog('Multi-model validation triggered', { sessionId: finalSessionId });
          const validatedResponse = await this.performMultiModelValidation(
            systemPrompt, 
            userPrompt, 
            primaryResponse
          );
          finalResponse = validatedResponse.response;
          validationStatus = validatedResponse.status;
        }

        // 7. Final security check on response
        const responseValidation = await AIContextService.validateAIResponse(finalResponse, finalSessionId);
        if (!responseValidation.isSecure) {
          secureLog('AI response contained PII, sanitizing', { 
            sessionId: finalSessionId, 
            violations: responseValidation.violations 
          });
          finalResponse = responseValidation.sanitizedResponse;
        }

        mainResponse = {
          response: finalResponse,
          sessionId: finalSessionId,
          modelUsed: 'gpt-4',
          validationStatus,
          processingTime: Date.now() - startTime
        };
        }
      }

      secureLog('Supervisor query completed successfully', { 
        sessionId: finalSessionId, 
        processingTime: Date.now() - startTime 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('CRITICAL ERROR in main agent flow', { sessionId: finalSessionId, error: errorMessage });

      // --- PART 3 ENHANCEMENT: Improved Error Message ---
      // Return a context-aware, privacy-affirming error message
      return {
        response: "For your privacy and security, my system automatically blocks requests that might contain personal names. If you were asking about a person, please try rephrasing your question more generally. If you were asking about a place, please try again.",
        sessionId: finalSessionId,
        modelUsed: 'error-handler',
        processingTime: Date.now() - startTime
      };
    }

    // --- STAGE 2: Execute non-critical side effects asynchronously ---
    // We do NOT use 'await' here. This is "fire-and-forget".
    this.updateProgressMilestones(userId, "chatbotInteraction", finalSessionId)
      .catch((err: Error | unknown) => {
        // Log the error for developers but DO NOT let it crash the response to the user.
        secureLog("Non-critical error in milestone update", { 
          sessionId: finalSessionId, 
          userId,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      });
    
    this.logAnalytics(userId, "queryExecuted", finalSessionId)
      .catch((err: Error | unknown) => {
        secureLog("Non-critical error in analytics logging", { 
          sessionId: finalSessionId, 
          userId,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      });

    // --- STAGE 3: Return the successful main response to the user immediately ---
    return mainResponse;
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
   * Build the system prompt for the Supervisor Agent
   */
  private buildSystemPrompt(): string {
    return `You are the KGC Health Assistant Supervisor Agent, a Type 1 SaMD (Software as Medical Device). Your role is to provide non-diagnostic, educational health advice using evidence-based CBT (Cognitive Behavioral Therapy) and MI (Motivational Interviewing) techniques.

CRITICAL GUIDELINES:
- You must strictly adhere to the user's Care Plan Directives provided by their healthcare provider
- Provide only non-diagnostic, educational, and supportive responses
- Use motivational interviewing techniques to encourage positive health behaviors
- Apply CBT principles to help users develop healthy thought patterns
- Never provide medical diagnoses or replace professional medical advice
- Always maintain an encouraging, empathetic, and professional tone
- Focus on behavioral changes and emotional support within the scope of their care plan

RESPONSE REQUIREMENTS:
- Analyze the user's query in the context of their personalized care plan and history
- Provide supportive, educational answers that align with their care directives
- Never show your internal processing or reasoning
- Respond only with the final, helpful message to the user
- Keep responses concise but comprehensive
- Always remind users to consult their healthcare provider for medical concerns`;
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
      throw new Error('Primary LLM unavailable');
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
      return "I'm sorry, my location search feature is not configured correctly at the moment. I can still help with other questions you might have.";
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

      // Return a graceful, user-facing fallback message.
      return "I'm having a little trouble accessing specific location details right now, but I can still help with other questions or provide general wellness tips!";
    }
    // --- END OF MODIFICATIONS ---
  }

  /**
   * Synthesize location recommendations with Care Plan Directives
   */
  private async synthesizeLocationResponse(parsedQuery: any, tavilyResults: any, mcpBundle: any): Promise<string> {
    try {
      // Define the features of the KGC App that the AI can recommend
      const KGC_APP_FEATURES = [
        "Home - Main dashboard with easy access buttons for chat, daily self-scores and your Keep Going button",
        "Daily Self-Scores - Record how you feel about your healthy lifestyle journey, essential for communicating progress with your doctor who modifies your Care Plan Directives. Your daily self-scores earn you money to spend on healthy experiences like gym, pilates, yoga, health spas, and healthy dining!",
        "Motivational Image Processing (MIP) - Upload and enhance your chosen motivational image, integrated with the Keep Going button",
        "Inspiration Machine D - Provides meal inspiration ideas aligned with your personal care plan CPDs and preferences",
        "Diet Logistics - Provides links for grocery and prepared meals delivery options aligned with your personal care plan CPDs and preferences",
        "Inspiration Machine E&W - Provides exercise and wellness inspiration ideas aligned with your personal care plan CPDs, abilities and preferences",
        "E&W Support - Assists you to search for local gyms, personal trainers, yoga, and pilates studios to enhance your exercise and wellness experiences",
        "MBP Wiz - Finds best prices on medications via Chemist Warehouse with pharmacy location information",
        "Journaling - Record thoughts, track progress, and document health experiences. Useful for you and your doctor to discuss medication compliance and adherence",
        "Progress Milestones - KGC achievement badges awarded for maintaining consistent health scores over time. Earn $100 and more for your Keep Going Care efforts",
        "Food Database - Provides nutritional information and food recommendations based on Food Standards Australia including the FoodSwitch label scanning app",
        "Chatbot - KGC AI assistant for answering questions and providing guidance",
        "Health Snapshots - Provides visual progress summaries and adherence tracking of your daily self-scores"
      ];

      const { activity = 'activity', location = 'area' } = parsedQuery.entities;

      // Construct the user message for synthesis, now including app features
      const userPromptForSynthesis = `
        User's Original Query: "${activity} in ${location}"

        Patient's Care Plan Directives (CPDs):
        ${mcpBundle.care_plan_directives}

        Tavily Search Results:
        ${JSON.stringify(tavilyResults, null, 2)}

        KGC App Features available for recommendation:
        ${JSON.stringify(KGC_APP_FEATURES)}
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
}

export const supervisorAgent = SupervisorAgent.getInstance();