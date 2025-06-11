/**
 * Multi-AI Evaluator
 * 
 * This service provides a framework for evaluating responses using multiple AI models
 * in parallel, with built-in privacy protection via the Privacy Protection Agent.
 * 
 * The system allows for:
 * 1. Simultaneous evaluation by multiple AI providers (OpenAI, Anthropic, etc.)
 * 2. Aggregation of evaluation results to provide a consensus
 * 3. Fallback mechanisms when individual providers fail
 * 4. Privacy protection throughout the entire process
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { privacyProtectionAgent } from '../services/privacyProtectionAgent';
import { v4 as uuidv4 } from 'uuid';

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = process.env.ANTHROPIC_API_KEY ? 
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : 
  null;

// Define evaluation providers
export enum EvaluationProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  // XAI/GROK would be added here when available
}

// Evaluation result interface
export interface EvaluationResult {
  provider: EvaluationProvider;
  score: number;           // Numerical score (0-100)
  passes: boolean;         // Whether the response meets requirements
  reason: string;          // Explanation for the evaluation
  improvedResponse?: string; // Optional improved response
}

// Context for evaluations
export interface EvaluationContext {
  userPrompt: string;      // Original user query
  aiResponse: string;      // AI response to evaluate
  requirements?: string[]; // Specific requirements to check
  carePlanDirectives?: string[]; // Relevant CPDs
  tgaCompliance?: boolean; // Whether to enforce TGA compliance
  privacyLevel?: string;   // Required privacy level
  [key: string]: any;      // Additional context
}

export class MultiAIEvaluator {
  private static instance: MultiAIEvaluator;
  
  // Private constructor for singleton pattern
  private constructor() {}
  
  // Get singleton instance
  public static getInstance(): MultiAIEvaluator {
    if (!MultiAIEvaluator.instance) {
      MultiAIEvaluator.instance = new MultiAIEvaluator();
    }
    return MultiAIEvaluator.instance;
  }
  
  /**
   * Evaluate a response using multiple AI providers and return aggregated results
   * 
   * @param context The evaluation context
   * @param providers Optional array of providers to use (defaults to all available)
   * @returns Aggregated evaluation results and improved response if needed
   */
  public async evaluateResponse(
    context: EvaluationContext,
    providers: EvaluationProvider[] = [
      EvaluationProvider.OPENAI,
      EvaluationProvider.ANTHROPIC
    ]
  ): Promise<{
    needsImprovement: boolean;
    score: number;
    feedback: string;
    improvedResponse: string | null;
    evaluations: EvaluationResult[];
  }> {
    // Create a unique session ID for this evaluation
    const sessionId = uuidv4();
    
    try {
      // Anonymize all sensitive data before evaluation
      const anonymizedContext = this.anonymizeContext(context, sessionId);
      
      // Generate evaluation promises for each provider
      const evaluationPromises: Promise<EvaluationResult>[] = [];
      
      // Add providers based on availability and request
      if (providers.includes(EvaluationProvider.OPENAI)) {
        evaluationPromises.push(this.evaluateWithOpenAI(anonymizedContext, sessionId));
      }
      
      if (providers.includes(EvaluationProvider.ANTHROPIC) && anthropic) {
        evaluationPromises.push(this.evaluateWithAnthropic(anonymizedContext, sessionId));
      }
      
      // Execute all evaluations in parallel
      const results = await Promise.allSettled(evaluationPromises);
      
      // Filter successful evaluations
      const successfulEvaluations: EvaluationResult[] = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successfulEvaluations.push(result.value);
        } else {
          console.error(`Evaluation failed:`, result.reason);
        }
      });
      
      // If no evaluations succeeded, throw error
      if (successfulEvaluations.length === 0) {
        throw new Error("All AI evaluations failed");
      }
      
      // Aggregate results
      const aggregatedResults = this.aggregateEvaluations(successfulEvaluations);
      
      // Generate improved response if needed
      let improvedResponse: string | null = null;
      if (aggregatedResults.needsImprovement && successfulEvaluations.some(e => e.improvedResponse)) {
        // Use the first available improved response
        const improvement = successfulEvaluations.find(e => e.improvedResponse)?.improvedResponse || null;
        
        // De-anonymize the improved response if available
        if (improvement) {
          improvedResponse = privacyProtectionAgent.deAnonymize(improvement, sessionId);
        }
      }
      
      // Clean up privacy session to free memory
      privacyProtectionAgent.clearSession(sessionId);
      
      return {
        ...aggregatedResults,
        improvedResponse,
        evaluations: successfulEvaluations
      };
      
    } catch (error) {
      // Clean up privacy session even in case of error
      privacyProtectionAgent.clearSession(sessionId);
      throw error;
    }
  }
  
  /**
   * Anonymize the evaluation context
   */
  private anonymizeContext(context: EvaluationContext, sessionId: string): EvaluationContext {
    const { anonymizedText: anonymizedUserPrompt } = 
      privacyProtectionAgent.anonymize(context.userPrompt, sessionId);
    
    const { anonymizedText: anonymizedAiResponse } = 
      privacyProtectionAgent.anonymize(context.aiResponse, sessionId);
    
    // Create a new anonymized context
    const anonymizedContext: EvaluationContext = {
      ...context,
      userPrompt: anonymizedUserPrompt,
      aiResponse: anonymizedAiResponse
    };
    
    // Anonymize care plan directives if present
    if (context.carePlanDirectives && Array.isArray(context.carePlanDirectives)) {
      anonymizedContext.carePlanDirectives = context.carePlanDirectives.map(directive => {
        const { anonymizedText } = privacyProtectionAgent.anonymize(directive, sessionId);
        return anonymizedText;
      });
    }
    
    return anonymizedContext;
  }
  
  /**
   * Evaluate response using OpenAI
   */
  private async evaluateWithOpenAI(
    context: EvaluationContext,
    sessionId: string
  ): Promise<EvaluationResult> {
    try {
      // Generate evaluation prompt
      const evaluationPrompt = this.generateEvaluationPrompt(context);
      
      // Make API call with error handling
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: "You are an expert healthcare quality evaluator for the Keep Going Care system. Your job is to evaluate AI responses for healthcare quality, accuracy, privacy compliance, and TGA regulatory compliance in Australia."
          },
          {
            role: "user",
            content: evaluationPrompt
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
      
      // Parse the response
      const content = response.choices[0].message.content || "{}";
      const evaluation = JSON.parse(content);
      
      // Process and return standardized result
      return {
        provider: EvaluationProvider.OPENAI,
        score: evaluation.score || 0,
        passes: evaluation.passes || false,
        reason: evaluation.reason || "No reason provided",
        improvedResponse: evaluation.improvedResponse || undefined
      };
      
    } catch (error) {
      console.error("OpenAI evaluation failed:", error);
      // Return a fallback evaluation
      return {
        provider: EvaluationProvider.OPENAI,
        score: 0,
        passes: false,
        reason: "Evaluation failed due to API error"
      };
    }
  }
  
  /**
   * Evaluate response using Anthropic/Claude
   */
  private async evaluateWithAnthropic(
    context: EvaluationContext,
    sessionId: string
  ): Promise<EvaluationResult> {
    if (!anthropic) {
      throw new Error("Anthropic API not initialized");
    }
    
    try {
      // Generate evaluation prompt
      const evaluationPrompt = this.generateEvaluationPrompt(context);
      
      // Make API call with error handling
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: evaluationPrompt
          }
        ],
        system: "You are an expert healthcare quality evaluator for the Keep Going Care system. Your job is to evaluate AI responses for healthcare quality, accuracy, privacy compliance, and TGA regulatory compliance in Australia. Provide your assessment in valid JSON format with fields: score (0-100), passes (boolean), reason (string), and improvedResponse (string, optional)."
      });
      
      // Extract and parse the JSON from the response
      const content = response.content[0].text;
      let evaluation;
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse Anthropic evaluation:", parseError);
        // Fallback to a basic evaluation
        evaluation = {
          score: 50,
          passes: false,
          reason: "Could not parse evaluation result",
          improvedResponse: null
        };
      }
      
      // Process and return standardized result
      return {
        provider: EvaluationProvider.ANTHROPIC,
        score: evaluation.score || 0,
        passes: evaluation.passes || false,
        reason: evaluation.reason || "No reason provided",
        improvedResponse: evaluation.improvedResponse || undefined
      };
      
    } catch (error) {
      console.error("Anthropic evaluation failed:", error);
      // Return a fallback evaluation
      return {
        provider: EvaluationProvider.ANTHROPIC,
        score: 0,
        passes: false,
        reason: "Evaluation failed due to API error"
      };
    }
  }
  
  /**
   * Generate a standardized evaluation prompt
   */
  private generateEvaluationPrompt(context: EvaluationContext): string {
    // Basic requirements that all responses must meet
    const baseRequirements = [
      "Must use Australian English spelling and terminology",
      "Must never label suggestions as 'Care Plan Directives' (CPDs) - only doctors can create CPDs",
      "Must avoid terms that could imply medical advice (e.g., 'health tips')",
      "Should encourage patient engagement and maintaining high daily self-scores (8-10)",
      "Should be empathetic, supportive, and motivational"
    ];
    
    // Combine with any specific requirements from the context
    const allRequirements = [
      ...baseRequirements,
      ...(context.requirements || [])
    ];
    
    // Format the requirements list
    const requirementsList = allRequirements
      .map((req, index) => `${index + 1}. ${req}`)
      .join('\n');
    
    // Format care plan directives if available
    let cpdSection = '';
    if (context.carePlanDirectives && context.carePlanDirectives.length > 0) {
      cpdSection = '\n\nRelevant Care Plan Directives:\n' + 
        context.carePlanDirectives.map(cpd => `- ${cpd}`).join('\n');
    }
    
    // Build the complete prompt
    return `Evaluate the following AI assistant response to a user query in the Keep Going Care health system.

USER QUERY:
${context.userPrompt}

AI RESPONSE TO EVALUATE:
${context.aiResponse}

EVALUATION REQUIREMENTS:
${requirementsList}
${cpdSection}

${context.tgaCompliance ? 
  "\nIMPORTANT: This must comply with TGA (Therapeutic Goods Administration) regulations for Class 1 SaMD in Australia. The response must NOT provide specific medical advice or diagnosis." : 
  ""
}

Provide your evaluation in the following JSON format:
{
  "score": [number between 0-100],
  "passes": [boolean indicating if response meets requirements],
  "reason": [detailed explanation of your evaluation],
  "improvedResponse": [optional: your improved version if the response needs improvement]
}
`;
  }
  
  /**
   * Aggregate multiple evaluations into a single result
   */
  private aggregateEvaluations(evaluations: EvaluationResult[]): {
    needsImprovement: boolean;
    score: number;
    feedback: string;
  } {
    // Calculate average score
    const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
    const averageScore = Math.round(totalScore / evaluations.length);
    
    // Determine if improvement is needed (if any evaluator fails)
    const needsImprovement = evaluations.some(evaluation => !evaluation.passes);
    
    // Compile feedback from all evaluators
    const feedback = evaluations
      .map(evaluation => `${evaluation.provider.toUpperCase()} (${evaluation.score}/100): ${evaluation.reason}`)
      .join('\n\n');
    
    return {
      needsImprovement,
      score: averageScore,
      feedback
    };
  }
}

// Export singleton instance
export const multiAIEvaluator = MultiAIEvaluator.getInstance();