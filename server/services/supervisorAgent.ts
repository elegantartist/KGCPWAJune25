/**
 * Supervisor Agent - The Brain of KGC AI System
 * Central AI orchestrator implementing multi-LLM validation and Model Context Protocol (MCP)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIContextService } from './aiContextService';
import { secureLog, validateMcpBundleSecurity } from './privacyMiddleware';
import { getMealInspiration, getWellnessInspiration, getWeeklyMealPlan, getWellnessProgram } from './inspirationMachines';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize LLM clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SupervisorQuery {
  userQuery: string;
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
   */
  async runSupervisorQuery(query: SupervisorQuery): Promise<SupervisorResponse> {
    const startTime = Date.now();
    const sessionId = query.sessionId || crypto.randomUUID();

    try {
      secureLog('Supervisor query initiated', { 
        userId: query.userId, 
        sessionId,
        queryLength: query.userQuery.length 
      });

      // 1. Create secure MCP bundle using privacy middleware
      const contextData = await AIContextService.prepareSecureContext({
        userId: query.userId,
        includeHealthMetrics: true,
        includeChatHistory: true,
        maxHistoryItems: 10
      });

      const mcpBundle = contextData.secureBundle;

      // 2. Validate MCP bundle security
      const securityValidation = validateMcpBundleSecurity(mcpBundle);
      if (!securityValidation.isSecure) {
        throw new Error(`Security validation failed: ${securityValidation.violations.join(', ')}`);
      }

      // 3. Determine if tool calling is needed
      const toolResponse = await this.checkForToolCalling(query.userQuery, mcpBundle);
      if (toolResponse) {
        return {
          response: toolResponse.response,
          sessionId,
          modelUsed: 'tool-based',
          toolsUsed: toolResponse.tools,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Construct primary LLM prompt
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query.userQuery, mcpBundle);

      // 5. Call primary LLM (OpenAI GPT-4)
      const primaryResponse = await this.callPrimaryLLM(systemPrompt, userPrompt);

      // 6. Multi-model validation if required
      let finalResponse = primaryResponse;
      let validationStatus = 'not-required';

      if (query.requiresValidation || this.requiresValidation(query.userQuery)) {
        secureLog('Multi-model validation triggered', { sessionId });
        const validatedResponse = await this.performMultiModelValidation(
          systemPrompt, 
          userPrompt, 
          primaryResponse
        );
        finalResponse = validatedResponse.response;
        validationStatus = validatedResponse.status;
      }

      // 7. Final security check on response
      const responseValidation = await AIContextService.validateAIResponse(finalResponse, sessionId);
      if (!responseValidation.isSecure) {
        secureLog('AI response contained PII, sanitizing', { 
          sessionId, 
          violations: responseValidation.violations 
        });
        finalResponse = responseValidation.sanitizedResponse;
      }

      secureLog('Supervisor query completed successfully', { 
        sessionId, 
        processingTime: Date.now() - startTime 
      });

      return {
        response: finalResponse,
        sessionId,
        modelUsed: 'gpt-4',
        validationStatus,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('Supervisor query failed', { sessionId, error: errorMessage });

      return {
        response: 'I apologize, but I encountered an issue processing your request. Please try again or contact support if the problem persists.',
        sessionId,
        modelUsed: 'error-handler',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if the query requires specific tool calling (Phase 3: Enhanced with async tools)
   */
  private async checkForToolCalling(userQuery: string, mcpBundle: any): Promise<{ response: string; tools: string[] } | null> {
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
}

export const supervisorAgent = SupervisorAgent.getInstance();