/**
 * Prompt Optimizer based on LangMem SDK
 * 
 * This service implements procedural memory for the MCP system,
 * allowing the chatbot to learn from user interactions and feedback.
 * It adapts the chatbot's behavior over time to better suit user preferences
 * and improve effectiveness of health recommendations.
 */

import { OpenAI } from 'openai';
import { CarePlanDirective, ChatMemory } from '@shared/schema';
import { MemorySystem, MemoryType, ImportanceLevel, enhancedMemoryManager } from './enhancedMemoryManager';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Types of prompt optimization
export enum OptimizationType {
  CONVERSATIONAL_STYLE = 'conversational_style',
  RECOMMENDATION_APPROACH = 'recommendation_approach',
  HEALTH_CATEGORY_FOCUS = 'health_category_focus',
  USER_PREFERENCE = 'user_preference'
}

// User feedback structure
export interface Feedback {
  userId: number;
  content: string;
  type: OptimizationType;
  rating?: number; // 1-5 scale, optional
  associatedMessage?: string; // The message this feedback is about
}

// Message format for the conversation history
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Prompt Optimizer Service
 * Implements LangMem's procedural memory concepts to learn and adapt agent behaviors
 * based on user interactions and explicit feedback
 */
export class PromptOptimizer {
  
  /**
   * Process feedback and update procedural memory
   */
  public async processUserFeedback(
    userId: number,
    feedback: Feedback,
    conversationHistory: Message[],
    healthMetrics?: any,
    carePlanDirectives?: CarePlanDirective[]
  ): Promise<string> {
    // First, check if we already have procedural memories for this optimization type
    const existingMemories = await enhancedMemoryManager.getProceduralMemories(
      userId,
      feedback.type,
      ImportanceLevel.MEDIUM
    );
    
    // Create optimization prompt based on the feedback type
    const optimizationPrompt = this.createOptimizationPrompt(
      feedback,
      conversationHistory,
      existingMemories,
      healthMetrics,
      carePlanDirectives
    );
    
    // Generate the optimized procedural rules
    const optimizedProcedures = await this.generateOptimizedProcedures(optimizationPrompt);
    
    // Store the updated procedural memory
    await this.storeOptimizedProcedures(
      userId, 
      optimizedProcedures, 
      feedback.type
    );
    
    return optimizedProcedures;
  }
  
  /**
   * Create the prompt for optimization based on feedback type
   */
  private createOptimizationPrompt(
    feedback: Feedback,
    conversationHistory: Message[],
    existingMemories: ChatMemory[],
    healthMetrics?: any,
    carePlanDirectives?: CarePlanDirective[]
  ): string {
    // Extract existing procedural rules if available
    const existingRules = existingMemories.length > 0 
      ? existingMemories.map(m => m.content).join('\n\n')
      : 'No existing procedural rules.';
    
    // Format conversation history
    const formattedConversation = conversationHistory
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    
    // Format health metrics if available
    const metricsContext = healthMetrics 
      ? `Current Health Metrics:\n${JSON.stringify(healthMetrics, null, 2)}`
      : 'No health metrics available.';
    
    // Format care plan directives if available
    const cpdContext = carePlanDirectives && carePlanDirectives.length > 0
      ? `Care Plan Directives:\n${carePlanDirectives.map(cpd => 
        `- ${cpd.category}: ${cpd.directive} (Target: ${cpd.targetValue})`).join('\n')}`
      : 'No care plan directives available.';
    
    // Create base prompt with different instructions based on feedback type
    let basePrompt = '';
    
    switch (feedback.type) {
      case OptimizationType.CONVERSATIONAL_STYLE:
        basePrompt = `
You are an expert agent optimizer focused on improving conversational style.
The healthcare agent needs to adapt its communication style based on user preferences and interactions.

CONVERSATIONAL STYLE OPTIMIZATION TASK:
Analyze the conversation history and user feedback to infer how the agent should communicate.
Consider tone, formality, verbosity, empathy level, and technical language usage.
`;
        break;
        
      case OptimizationType.RECOMMENDATION_APPROACH:
        basePrompt = `
You are an expert agent optimizer focused on improving health recommendation approaches.
The healthcare agent needs to adapt how it structures and presents recommendations to be most effective.

RECOMMENDATION APPROACH OPTIMIZATION TASK:
Analyze the conversation history and user feedback to infer how the agent should present recommendations.
Consider directness, frequency, framing (gain vs. loss), level of evidence provided, and connection to personal goals.
`;
        break;
        
      case OptimizationType.HEALTH_CATEGORY_FOCUS:
        basePrompt = `
You are an expert agent optimizer focused on adapting health topic priorities.
The healthcare agent needs to learn which health topics the user responds to best.

HEALTH CATEGORY FOCUS OPTIMIZATION TASK:
Analyze the conversation history and user feedback to infer which health topics should be prioritized.
Consider user engagement with different topics, stated preferences, and health metric improvements.
`;
        break;
        
      case OptimizationType.USER_PREFERENCE:
        basePrompt = `
You are an expert agent optimizer focused on learning specific user preferences.
The healthcare agent needs to remember important preferences to personalize interactions.

USER PREFERENCE OPTIMIZATION TASK:
Analyze the conversation history and user feedback to extract specific preferences.
Consider communication preferences, health activity preferences, scheduling preferences, etc.
`;
        break;
    }
    
    // Complete the prompt with context and instructions
    return `${basePrompt}

EXISTING PROCEDURAL RULES:
${existingRules}

RECENT CONVERSATION HISTORY:
${formattedConversation}

USER FEEDBACK:
${feedback.content}
${feedback.rating ? `Rating: ${feedback.rating}/5` : ''}

ADDITIONAL CONTEXT:
${metricsContext}

${cpdContext}

OUTPUT TASK:
1. Analyze the conversation and feedback
2. Identify patterns, preferences, and needs
3. Generate a concise, structured set of procedural rules that the agent should follow
4. Include specific examples where helpful
5. If there are existing rules, modify them appropriately (strengthen, weaken, or remove as needed)
6. Where possible, make rules conditional based on context (e.g., "When discussing exercise AND the user has mentioned pain...")

The output should be ONLY the updated procedural rules in clear, executable format for the agent.
Format each rule clearly with examples where needed. Be concise but precise.
`;
  }
  
  /**
   * Generate optimized procedures using OpenAI
   */
  private async generateOptimizedProcedures(prompt: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert agent optimizer that creates clear procedural rules for a healthcare assistant to follow based on user feedback and conversation history."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2, // Low temperature for more consistent procedural rules
        max_tokens: 1000
      });
      
      return response.choices[0].message.content || 
        "Unable to generate optimized procedures.";
    } catch (error) {
      console.error('Error generating optimized procedures:', error);
      return "Error optimizing procedures. Please try again later.";
    }
  }
  
  /**
   * Store the optimized procedural rules in memory
   */
  private async storeOptimizedProcedures(
    userId: number, 
    optimizedProcedures: string,
    type: OptimizationType
  ): Promise<void> {
    // First, get existing memories for this optimization type
    const existingMemories = await enhancedMemoryManager.getProceduralMemories(
      userId,
      type,
      ImportanceLevel.MEDIUM
    );
    
    // If there are existing memories, update them instead of creating new ones
    if (existingMemories.length > 0) {
      // For simplicity, we'll just create a new memory and assume the old ones will be managed 
      // by memory consolidation processes later
      console.log(`Updating procedural memory for user ${userId} and type ${type}`);
    } else {
      console.log(`Creating new procedural memory for user ${userId} and type ${type}`);
    }
    
    // Store the optimized procedures as procedural memory
    await enhancedMemoryManager.createProceduralMemory(
      userId,
      optimizedProcedures,
      ImportanceLevel.HIGH,
      MemoryType.LONG_TERM,
      { type, updatedAt: new Date().toISOString() }
    );
  }

  /**
   * Retrieve all applicable procedural rules for a user
   */
  public async getProceduralRules(userId: number): Promise<Record<OptimizationType, string>> {
    const rules: Record<OptimizationType, string> = {
      [OptimizationType.CONVERSATIONAL_STYLE]: '',
      [OptimizationType.RECOMMENDATION_APPROACH]: '',
      [OptimizationType.HEALTH_CATEGORY_FOCUS]: '',
      [OptimizationType.USER_PREFERENCE]: ''
    };
    
    // Retrieve memories for each optimization type
    for (const type of Object.values(OptimizationType)) {
      const memories = await enhancedMemoryManager.getProceduralMemories(
        userId,
        type,
        ImportanceLevel.LOW,
        1
      );
      
      if (memories.length > 0) {
        rules[type as OptimizationType] = memories[0].content;
      }
    }
    
    return rules;
  }
  
  /**
   * Generate a system prompt that incorporates all procedural rules
   */
  public async generateEnhancedSystemPrompt(
    userId: number, 
    basePrompt: string
  ): Promise<string> {
    const rules = await this.getProceduralRules(userId);
    
    // Combine the rules into sections
    let proceduraRulesSection = '';
    
    for (const [type, content] of Object.entries(rules)) {
      if (content) {
        proceduraRulesSection += `\n\n## ${type.replace(/_/g, ' ').toUpperCase()}\n${content}`;
      }
    }
    
    // Only add the procedural rules section if there are any rules
    if (proceduraRulesSection) {
      return `${basePrompt}\n\n# LEARNED PATIENT PREFERENCES AND PROTOCOLS${proceduraRulesSection}`;
    }
    
    return basePrompt;
  }
}

// Export singleton instance
export const promptOptimizer = new PromptOptimizer();