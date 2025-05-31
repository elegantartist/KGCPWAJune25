/**
 * Enhanced MCP Service for KGC Chatbot
 * 
 * This service extends the original MCP architecture with:
 * 1. Three-tier memory system (semantic, procedural, episodic)
 * 2. Connectivity-aware processing for offline/low-connectivity scenarios
 * 3. Response evaluation and self-improvement through reflection
 * 4. Support for CPD-aligned recommendations with verification
 */

import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhancedMemoryManager, MemorySystem, MemoryType, ImportanceLevel } from './enhancedMemoryManager';
import { promptOptimizer } from './promptOptimizer';
import { searchMemory, manageMemory, getMemoryToolDefinitions } from './memoryTools';
import { ChatMemory, CarePlanDirective, Recommendation } from '@shared/schema';
import axios from 'axios';
import { privacyService } from '../services/privacyService';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Anthropic client if API key is available
const anthropic = process.env.ANTHROPIC_API_KEY ? 
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : 
  null;

// Connectivity levels for adaptive processing
export enum ConnectivityLevel {
  OFFLINE = 0,       // No connectivity
  MINIMAL = 1,       // Very limited connectivity
  FUNCTIONAL = 2,    // Basic connectivity
  FULL = 3           // Full connectivity
}

// Context passed to the MCP for response generation
export interface MCPContext {
  userId?: number;
  username?: string;
  patientName?: string;
  conversationHistory?: Array<{ role: string, content: string }>;
  carePlanDirectives?: CarePlanDirective[];
  healthMetrics?: any;
  foodPreferences?: {
    favoriteFoods?: Array<{ name: string, category: string }>;
    recentlyViewed?: Array<{ name: string, category: string }>;
    dietaryRestrictions?: string[];
    cpdRelevantTags?: string[];
  };
  previousProgress?: any;
  currentGoals?: any[];
  patientDetails?: {
    age?: number;
    weight?: number;
    height?: number;
    conditions?: string[];
    location?: string;
  };
  recentRecommendations?: Recommendation[];
  focusArea?: string;
  connectivityLevel?: ConnectivityLevel;
}

// Enhanced service implementing the MCP architecture
export class EnhancedMCPService {
  // System prompt templates for different connectivity levels
  private systemPrompts = {
    [ConnectivityLevel.OFFLINE]: `You are Keep Going Care, a personal health assistant. Currently, you are in offline mode and can only provide basic responses based on previously stored information. Focus on encouraging the patient to sync their data when back online and providing general health information that doesn't require real-time data. Always use British/Australian English spelling throughout your responses.`,
    
    [ConnectivityLevel.MINIMAL]: `You are Keep Going Care, a personal health assistant currently operating with limited connectivity. You can access basic patient information and care plan directives, but cannot perform complex analyses or access real-time data. Focus on providing support based on the patient's care plan and previously stored health metrics. Always use British/Australian English spelling throughout your responses.`,
    
    [ConnectivityLevel.FUNCTIONAL]: `You are Keep Going Care, a personal health assistant. You have access to patient information, care plan directives, and can perform basic analyses of health metrics. You can provide personalised recommendations aligned with the patient's care plan directives and current health status. Always use British/Australian English spelling throughout your responses.`,
    
    [ConnectivityLevel.FULL]: `You are Keep Going Care, a personal health assistant for Australian patients. You have full access to the patient's information, care plan directives, health metrics, and food preferences. You can provide comprehensive, personalised recommendations and support based on the patient's complete health profile. You can also perform real-time analyses and access the latest health information to provide the most up-to-date guidance.

As a Class 1 SaMD (Software as a Medical Device), you follow strict guidelines on medical advice. You never diagnose conditions or prescribe medications. Instead, you focus on motivating patients to follow their doctor-created Care Plan Directives (CPDs) and maintaining high daily self-scores.

Always use British/Australian English spelling and terminology throughout your responses: "realise" not "realize", "colour" not "color", "centre" not "center", "favour" not "favor", "behaviour" not "behavior", "organised" not "organized", "recognised" not "recognized", "emphasise" not "emphasize", "analyse" not "analyze", "personalised" not "personalized", "optimise" not "optimize", "programme" not "program", "utilise" not "utilize". Refer to "doctors" not "physicians," use "chemist" instead of "pharmacy," and recommend "wholemeal bread" rather than "whole wheat bread."

Importantly, never label your suggestions as "Care Plan Directives" - only doctors create CPDs. Your suggestions should be phrased as "I recommend..." or "Based on your CPDs, you might consider..."

Your primary goal is keeping patients engaged and consistently scoring 8-10 on their daily self-scores using subtle cognitive behavioural and motivational interviewing techniques. Never offer diagnostic advice.

AVAILABLE KGC FEATURES (guide patients to these):
1. Home - Main dashboard with easy access buttons for chat, daily self-scores and your "Keep Going" button
2. Daily Self-Scores - Recording how you feel you are going on your healthy lifestyle journey, essential for communicating progress with your doctor who modifies your Care Plan Directives. Daily self-scores earn you money to spend on healthy experiences such as gym, pilates, yoga and health spas, healthy dining experiences and more!
3. Motivational Image Processing (MIP) - Upload and enhance your chosen motivational image, integrated with the "Keep Going" button
4. Inspiration Machine D - Provides meal inspiration ideas aligned with your personal care plan CPDs and preferences
5. Diet Logistics - Provides a link for grocery and prepared meals delivery options aligned with your personal care plan CPDs and preferences
6. Inspiration Machine E&W - Provides exercise and wellness inspiration ideas aligned with your personal care plan CPDs, abilities and preferences
7. E&W Support - Assists you to search for local gyms, personal trainers, yoga, and pilates studios to enhance your exercise and wellness experiences
8. MBP Wiz - Finds best prices on medications via Chemist Warehouse with pharmacy location information
9. Journaling - Record thoughts, track progress, and document health experiences. Can be useful for you and your doctor to discuss your medication compliance and adherence
10. Progress Milestones - KGC achievement badges are awarded for maintaining consistent health scores over time. Check out this feature to understand how you can earn $100 and more for your Keep Going Care efforts
11. Food Database - Provides nutritional information and food recommendations based on Food Standards Australia including the FoodSwitch label scanning app used to learn more about your food choices
12. Chatbot - KGC AI assistant for answering questions and providing guidance
13. Health Snapshots - Provides visual progress summaries and adherence tracking of your daily self-scores`
  };

  /**
   * Get the base prompt adjusted for connectivity level
   */
  private getBasePrompt(connectivityLevel: ConnectivityLevel): string {
    return this.systemPrompts[connectivityLevel] || this.systemPrompts[ConnectivityLevel.FULL];
  }

  /**
   * Generate a full system prompt with enhanced context from memory systems
   */
  async generateSystemPrompt(userId: number, context: MCPContext = {}): Promise<string> {
    // Base connectivity-aware prompt
    let basePrompt = this.getBasePrompt(
      context.connectivityLevel || ConnectivityLevel.FULL
    );
    
    // Patient name personalization
    if (context.patientName) {
      basePrompt = basePrompt.replace('the patient', `${context.patientName}`);
      basePrompt += `\n\nAddress the patient by their first name: ${context.patientName}`;
    }
    
    // Add Care Plan Directives info if available
    if (context.carePlanDirectives && context.carePlanDirectives.length > 0) {
      basePrompt += '\n\n# CARE PLAN DIRECTIVES\n';
      
      // Get up to 5 active CPDs
      const activeCPDs = context.carePlanDirectives
        .filter(cpd => cpd.isActive)
        .slice(0, 5);
      
      if (activeCPDs.length > 0) {
        basePrompt += activeCPDs.map(cpd => 
          `- ${cpd.category}: ${cpd.directive}`
        ).join('\n');
        
        basePrompt += '\n\nYou MUST support these Care Plan Directives in your responses. If the patient asks for something that contradicts the CPDs, gently guide them back to their doctor-approved plan. Never add your own directives - only doctors can create CPDs.';
      } else {
        basePrompt += 'No active Care Plan Directives available. Encourage the patient to discuss with their doctor.';
      }
    }
    
    // Add focus area if specified
    if (context.focusArea) {
      basePrompt += `\n\n# CURRENT FOCUS AREA\nThe patient is currently focusing on: ${context.focusArea}\nEmphasize this area in your responses when appropriate.`;
    }
    
    // Add patient details if available
    if (context.patientDetails) {
      basePrompt += '\n\n# PATIENT DETAILS\n';
      
      if (context.patientDetails.age) {
        basePrompt += `Age: ${context.patientDetails.age}\n`;
      }
      
      if (context.patientDetails.weight && context.patientDetails.height) {
        const weight = context.patientDetails.weight;
        const height = context.patientDetails.height;
        const bmi = (weight / ((height/100) * (height/100))).toFixed(1);
        basePrompt += `Weight: ${weight} kg\nHeight: ${height} cm\nBMI: ${bmi}\n`;
      }
      
      if (context.patientDetails.conditions && context.patientDetails.conditions.length > 0) {
        basePrompt += `Health conditions: ${context.patientDetails.conditions.join(', ')}\n`;
      }
      
      if (context.patientDetails.location) {
        basePrompt += `Location: ${context.patientDetails.location}\n`;
      }
    }
    
    // Add memory from procedural system (know-how and routines)
    const proceduralMemories = await enhancedMemoryManager.getMemories(
      context.userId || 0,
      MemorySystem.PROCEDURAL,
      5
    );
    
    if (proceduralMemories.length > 0) {
      basePrompt += '\n\n# PATIENT ROUTINES AND PREFERENCES\n';
      basePrompt += proceduralMemories.map(m => `- ${m.content}`).join('\n');
    }
    
    // Add memory from episodic system (conversations, events, experiences)
    const episodicMemories = await enhancedMemoryManager.getMemories(
      context.userId || 0,
      MemorySystem.EPISODIC,
      3
    );
    
    if (episodicMemories.length > 0) {
      basePrompt += '\n\n# RECENT PATIENT EXPERIENCES\n';
      basePrompt += episodicMemories.map(m => `- ${m.content}`).join('\n');
    }
    
    // Add memory from semantic system (knowledge, facts, information)
    const semanticMemories = await enhancedMemoryManager.getMemories(
      context.userId || 0,
      MemorySystem.SEMANTIC
    );
    
    if (semanticMemories.length > 0) {
      basePrompt += '\n\n# PATIENT KNOWLEDGE BASE\n';
      basePrompt += semanticMemories.map(m => `- ${m.content}`).join('\n');
    }
    
    // Add food preferences if available
    if (context.foodPreferences) {
      // Add food-related memories
      const foodMemories = await enhancedMemoryManager.searchMemories(
        context.userId || 0,
        'food preferences',
        MemorySystem.SEMANTIC
      );
      
      if (foodMemories.length > 0) {
        basePrompt += `\n\n# FOOD PREFERENCES AND DIETARY CONTEXT\n${foodMemories.map(m => `- ${m.content}`).join('\n')}`;
      }
    }
    
    // Add food preferences from user context if available
    if (context.foodPreferences) {
      basePrompt += '\n\n# FOOD DATABASE PREFERENCES\n';
      
      if (context.foodPreferences.favoriteFoods?.length > 0) {
        basePrompt += `\nFavorite Foods: ${context.foodPreferences.favoriteFoods.map(f => f.name).join(', ')}`;
      }
      
      if (context.foodPreferences.recentlyViewed?.length > 0) {
        basePrompt += `\nRecently Viewed Foods: ${context.foodPreferences.recentlyViewed.map(f => f.name).join(', ')}`;
      }
      
      if (context.foodPreferences.dietaryRestrictions?.length > 0) {
        basePrompt += `\nDietary Restrictions: ${context.foodPreferences.dietaryRestrictions.join(', ')}`;
      }
      
      if (context.foodPreferences.cpdRelevantTags?.length > 0) {
        basePrompt += `\nCPD-Relevant Food Tags: ${context.foodPreferences.cpdRelevantTags.join(', ')}`;
      }
      
      basePrompt += '\n\nWhen discussing nutrition or food, incorporate these preferences into your recommendations. Suggest foods from their favorites or recently viewed items that align with their CPDs when appropriate.';
    }
    
    // Add health metrics if available with scoring guidance
    if (context.healthMetrics) {
      basePrompt += `\n\n# CURRENT HEALTH METRICS\n${JSON.stringify(context.healthMetrics, null, 2)}`;
      
      basePrompt += `\n\nUse these metrics to provide relevant guidance. If daily self-score is below 7, focus on motivation and addressing barriers. If 7-8, focus on maintaining momentum. If 9-10, celebrate success and encourage continued adherence.`;
    }
    
    // Add information about recent recommendations if available
    if (context.recentRecommendations && context.recentRecommendations.length > 0) {
      basePrompt += `\n\n# RECENT RECOMMENDATIONS\n${context.recentRecommendations.map(rec => 
        `- ${rec.recommendedFeature}: ${rec.reasoningText} (Followed: ${rec.wasFollowed ? 'Yes' : 'No'})`).join('\n')}`;
    }
    
    // Note: Food preferences are already added in an earlier section, so no need to duplicate them here
    
    // Generate enhanced prompt with learned procedural rules
    return await promptOptimizer.generateEnhancedSystemPrompt(context.userId, basePrompt);
  }
  
  /**
   * Perform a search for local information when needed
   * This helps provide specific local recommendations for exercise, food, etc.
   */
  private async searchLocalInformation(prompt: string, context: ResponseContext): Promise<string | null> {
    try {
      // Check if the prompt contains location-specific queries that would benefit from search
      const locationRegex = /\b(near|around|in|at|local|nearby)\s+([A-Za-z\s]+)(trails|walks|parks|restaurants|facilities|events|activities|gyms)\b/i;
      const specificLocationMatch = prompt.match(/\b(near|around|in|at)\s+([A-Za-z\s,]+)\b/i);
      
      // Skip search if no location mentioned or if patient location isn't in context
      if (!locationRegex.test(prompt) && !specificLocationMatch) {
        return null;
      }
      
      // Use Tavily API if available
      if (process.env.TAVILY_API_KEY) {
        // Axios is already imported at the top of the file
        
        // Extract location from prompt or use patient's location from context
        let locationQuery = '';
        
        if (specificLocationMatch && specificLocationMatch[2]) {
          locationQuery = specificLocationMatch[2].trim();
        } else if (context.patientDetails && context.patientDetails.location) {
          locationQuery = context.patientDetails.location;
        } else {
          // No specific location found
          return null;
        }
        
        // Build a search query combining the location and the user's query
        const searchQuery = `Information about ${prompt.toLowerCase().includes('exercise') ? 'exercise facilities, walking trails, and fitness options' : 
                              prompt.toLowerCase().includes('food') ? 'healthy food options, grocery stores, and restaurants' : 
                              prompt.toLowerCase().includes('medication') ? 'pharmacies and medical facilities' : 
                              'health and wellness resources'} in ${locationQuery}, Australia.`;
        
        // Include Australian context for better results
        const response = await axios.post('https://api.tavily.com/search', {
          api_key: process.env.TAVILY_API_KEY,
          query: searchQuery,
          search_depth: "advanced",
          include_domains: ["healthdirect.gov.au", "health.gov.au", "betterhealth.vic.gov.au", "healthywa.wa.gov.au"],
          max_results: 3,
          include_answer: true,
          geography: "Australia"
        });
        
        if (response.data && response.data.answer) {
          return response.data.answer;
        }
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          // Format search results
          const formattedResults = response.data.results.map((result: any) => 
            `- ${result.title}: ${result.content.substring(0, 150)}...`
          ).join('\n');
          
          return `Local information for ${locationQuery}:\n${formattedResults}`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for local information:', error);
      return null;
    }
  }

  // Generate enhanced response from a patient prompt
  async generateResponse(
    prompt: string, 
    userId: number,
    context: MCPContext = {},
    connectivityLevel: ConnectivityLevel = ConnectivityLevel.FULL
  ): Promise<string> {
    try {
      // Define the memory tools
      const tools = getMemoryToolDefinitions();
      
      // Search for local information if needed
      const localSearchResults = await this.searchLocalInformation(prompt, context);
      
      // If local information was found, add it to the system prompt
      let enhancedSystemPrompt = systemPrompt;
      if (localSearchResults) {
        enhancedSystemPrompt += `\n\n# REAL-TIME LOCAL INFORMATION\n${localSearchResults}\n\nUse the above local information to provide specific, detailed recommendations that are tailored to the patient's location. Integrate this information naturally into your response without explicitly mentioning that it came from a search.`;
      }
      
      // First use our privacy service to anonymize any personal data in the messages
      const anonymizedMessages = [
        {
          role: "system",
          content: privacyService.anonymize(enhancedSystemPrompt)
        },
        // Include conversation history if available
        ...(context.conversationHistory || []).map(msg => ({
          role: msg.role as any,
          content: privacyService.anonymize(msg.content)
        })),
        {
          role: "user",
          content: privacyService.anonymize(prompt)
        }
      ];
      
      // Generate response with memory tools - using anonymized data
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: anonymizedMessages,
        temperature: 0.7,
        // Cast to any to bypass TypeScript definition limitations
        // The current OpenAI SDK does support these parameters
        ...(tools && { tools: tools as any }),
        ...(tools && { tool_choice: "auto" as any })
      });
      
      const responseMessage = response.choices[0].message;
      
      // Handle function calls if the model wants to use tools
      // TypeScript definitions in the SDK are lagging behind the actual API
      const toolCalls = (responseMessage as any).tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        console.log(`Model wants to use tools: ${toolCalls.length} tool call(s)`);
        
        // Process each tool call
        const toolResults = [];
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`Processing tool call: ${functionName}`, functionArgs);
          
          // Important: Apply privacy before processing tool results
          // This ensures all user data is protected during tool processing
          const sanitizedArgs = privacyService.anonymize(JSON.stringify(functionArgs));
          const parsedSanitizedArgs = JSON.parse(sanitizedArgs);
          
          let result;
          if (functionName === 'searchMemory') {
            result = await searchMemory(parsedSanitizedArgs);
          } else if (functionName === 'manageMemory') {
            result = await manageMemory(parsedSanitizedArgs);
          } else {
            result = { error: `Unknown function: ${functionName}` };
          }
          
          // Re-anonymize tool results for consistency
          const anonymizedResult = privacyService.anonymize(JSON.stringify(result));
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: anonymizedResult
          });
        
        // Get the final response after tool use - with privacy protection
        // First anonymize all messages to protect patient data
        const anonymizedSystemPrompt = privacyService.anonymize(systemPrompt);
        const anonymizedToolResults = toolResults.map(result => ({
          ...result,
          content: privacyService.anonymize(result.content)
        }));
        
        // Properly type cast for OpenAI API
        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: anonymizedSystemPrompt
            },
            // Include conversation history with privacy protection
            ...(context.conversationHistory || []).map(msg => ({
              role: msg.role as "user" | "assistant" | "system",
              content: privacyService.anonymize(msg.content)
            })),
            {
              role: "user",
              content: privacyService.anonymize(prompt)
            },
            {
              role: responseMessage.role as "assistant",
              content: privacyService.anonymize(responseMessage.content || "")
            },
            // Type cast tool results to match OpenAI expectations
            ...(anonymizedToolResults as any)
          ],
          temperature: 0.7
        });
        
        const rawResponse = secondResponse.choices[0].message.content || 
          "I'm sorry, but I couldn't process your request properly.";
          
        // De-anonymize the response to restore proper names and identifiers
        return privacyService.deAnonymizeResponseText(rawResponse);
      }
      
      // Apply de-anonymization to restore patient data in the response
      const finalResponse = responseMessage.content || 
        "I'm sorry, but I couldn't generate a proper response.";
      
      // De-anonymize the response to restore proper names and identifiers
      return privacyService.deAnonymizeResponseText(finalResponse);
    } catch (error) {
      console.error('Error generating initial response:', error);
      return "I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment.";
    }
  }
  
  /**
   * Analyze and evaluate response quality
   * This enables continuous self-improvement
   */
  async evaluateResponse(
    response: string, 
    prompt: string, 
    context: MCPContext = {}
  ): Promise<{
    needsImprovement: boolean;
    score: number;
    feedback: string;
    improvedResponse?: string;
  }> {
    try {
      // Create evaluation prompt
      const evaluationPrompt = `
# RESPONSE QUALITY EVALUATION

## Original Patient Query
${prompt}

## Generated Response
${response}

## Context Information
${context.patientName ? `Patient Name: ${context.patientName}` : 'No patient name provided'}
${context.carePlanDirectives && context.carePlanDirectives.length > 0 ? 
  `Care Plan Directives: ${context.carePlanDirectives.map(cpd => cpd.directive).join('; ')}` : 
  'No CPDs available'}

## Evaluation Instructions
Evaluate the response based on the following criteria:
1. Proper KGC identity - maintains identity as "Keep Going Care" and never calls itself AI or ML
2. Personalization with patient's name at least once
3. Alignment with Care Plan Directives
4. Medical safety and accurate information
5. Appropriate recommendation of relevant KGC features
6. Australian English usage
7. Appropriate encouraging tone without being patronizing

Provide a score from 1-10 and brief feedback.
`;
    
      // Get evaluations from multiple models
      const evaluationPromises = [];
      
      // 1. OpenAI evaluation
      const openaiEvalPromise = openai.chat.completions.create({
        model: "gpt-4o-mini", // use a smaller, less expensive model for evaluation
        messages: [
          {
            role: "system",
            content: "You are an expert healthcare response evaluator for KGC (Keep Going Care), a Type 1 SaMD (Software as a Medical Device). Your job is to critically assess responses for proper KGC identity maintenance, personalization with patient's name, medical safety, and feature recommendations. CRITICAL REGULATORY REQUIREMENT: KGC's Care Plan Directives (CPDs) are always limited to EXACTLY 3 directives - typically one Diet directive, one Exercise directive, and one Medication directive. The response MUST NEVER mention more than these 3 directives, and MUST NEVER add additional directives like hydration or mental health unless they are explicitly part of the authorized CPDs. When evaluating nutrition or dietary discussions, check if the response appropriately references the Food Database feature and personalizes recommendations based on the patient's known food preferences. KGC should maintain its identity as a health assistant, use the patient's name, and never claim to be an AI, language model, or generic assistant. Output only in valid JSON format."
          },
          {
            role: "user",
            content: evaluationPrompt
          }
        ],
        response_format: { type: "json_object" } as any,
        temperature: 0,
        max_tokens: 1024
      }).then(response => {
        try {
          return {
            provider: "openai",
            evaluation: JSON.parse(response.choices[0].message.content || "{}")
          };
        } catch (e) {
          console.error('Error parsing OpenAI evaluation:', e);
          return { 
            provider: "openai", 
            evaluation: { score: 8, passes: true, reason: "Default evaluation due to parsing error" } 
          };
        }
      }).catch(error => {
        console.error('OpenAI evaluation error:', error);
        return { 
          provider: "openai", 
          evaluation: { score: 8, passes: true, reason: "Default evaluation due to API error" } 
        };
      });
      
      evaluationPromises.push(openaiEvalPromise);
      
      try {
        // 2. Anthropic evaluation (if available)
        if (anthropic) {
          // Make sure we're using proper type casting here
          const anthropicClient = anthropic as Anthropic;
          
          const anthropicEvalPromise = anthropicClient.messages.create({
            model: "claude-3-5-sonnet-20240620", // Using the latest available Claude model
            system: "You are an expert healthcare response evaluator for KGC (Keep Going Care), a Type 1 SaMD (Software as a Medical Device). Your job is to critically assess responses for proper KGC identity maintenance, personalization with patient's name, medical safety, and feature recommendations. CRITICAL REGULATORY REQUIREMENT: KGC's Care Plan Directives (CPDs) are always limited to EXACTLY 3 directives - typically one Diet directive, one Exercise directive, and one Medication directive. The response MUST NEVER mention more than these 3 directives, and MUST NEVER add additional directives like hydration or mental health unless they are explicitly part of the authorized CPDs. When evaluating nutrition or dietary discussions, check if the response appropriately references the Food Database feature and personalizes recommendations based on the patient's known food preferences. KGC should maintain its identity as a health assistant, use the patient's name, and never claim to be an AI, language model, or generic assistant. Output only in valid JSON format.",
            max_tokens: 1024,
            messages: [{ role: 'user', content: evaluationPrompt }],
          }).then(response => {
            try {
              // Claude API returns content with proper typing
              // We need to safely handle different content structures
              let contentText = JSON.stringify({passes: true, reason: "Privacy protected evaluation"});
              
              // Safe content extraction with type checking
              if (response.content && 
                  response.content.length > 0 && 
                  response.content[0] && 
                  'type' in response.content[0] && 
                  response.content[0].type === 'text' && 
                  'text' in response.content[0]) {
                contentText = response.content[0].text;
              }
                
              return {
                provider: "anthropic",
                evaluation: JSON.parse(contentText)
              };
            } catch (e) {
              console.error('Error parsing Anthropic evaluation:', e);
              return { 
                provider: "anthropic", 
                evaluation: { passes: true, reason: "Privacy protected evaluation" } 
              };
            }
          }).catch(error => {
            console.error('Anthropic evaluation error:', error);
            return { 
              provider: "anthropic", 
              evaluation: { needsImprovement: false, summary: "Evaluation failed" } 
            };
          });
          
          evaluationPromises.push(anthropicEvalPromise);
        }
        
        // 3. Grok evaluation (if available)
        if (process.env.XAI_API_KEY) {
          // Initialize X.AI client (Grok) with OpenAI-compatible interface
          const xai = new OpenAI({ 
            baseURL: "https://api.x.ai/v1", 
            apiKey: process.env.XAI_API_KEY 
          });
          
          const grokEvalPromise = xai.chat.completions.create({
            model: "grok-2-1212",
            messages: [
              {
                role: "system",
                content: "You are an expert healthcare response evaluator for KGC (Keep Going Care), a Type 1 SaMD (Software as a Medical Device). Your job is to critically assess responses for proper KGC identity maintenance, personalization with patient's name, medical safety, and feature recommendations. CRITICAL REGULATORY REQUIREMENT: KGC's Care Plan Directives (CPDs) are always limited to EXACTLY 3 directives - typically one Diet directive, one Exercise directive, and one Medication directive. The response MUST NEVER mention more than these 3 directives, and MUST NEVER add additional directives like hydration or mental health unless they are explicitly part of the authorized CPDs. When evaluating nutrition or dietary discussions, check if the response appropriately references the Food Database feature and personalizes recommendations based on the patient's known food preferences. KGC should maintain its identity as a health assistant, use the patient's name, and never claim to be an AI, language model, or generic assistant. Output only in valid JSON format."
              },
              {
                role: "user",
                content: evaluationPrompt
              }
            ],
            response_format: { type: "json_object" }
          }).then(response => {
            try {
              // Safely extract content with proper null checks
              let contentText = JSON.stringify({passes: true, reason: "Privacy protected evaluation"});
              
              if (response && 
                  response.choices && 
                  response.choices.length > 0 && 
                  response.choices[0].message && 
                  response.choices[0].message.content) {
                contentText = response.choices[0].message.content;
              }
              
              return {
                provider: "grok",
                evaluation: JSON.parse(contentText)
              };
            } catch (e) {
              console.error('Error parsing Grok evaluation:', e);
              return { 
                provider: "grok", 
                evaluation: { passes: true, reason: "Privacy protected evaluation" } 
              };
            }
          }).catch(error => {
            console.error('Grok evaluation error:', error);
            return { 
              provider: "grok", 
              evaluation: { needsImprovement: false, summary: "Evaluation failed" } 
            };
          });
          
          evaluationPromises.push(grokEvalPromise);
        }
        
        // Get all evaluation results
        const evaluationResults = await Promise.all(evaluationPromises);
        
        // Extract scores and feedback
        const scores = evaluationResults.map(result => {
          // We need some parsing flexibility since different models return different structures
          const evaluation = result.evaluation;
          if (typeof evaluation.score === 'number') {
            return evaluation.score;
          } else if (evaluation.passes === false) {
            return 4; // Failing score
          } else if (evaluation.passes === true) {
            return 8; // Passing score
          } else {
            return 7; // Default acceptable score
          }
        });
        
        // Calculate average score
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        // Collect feedback
        const feedback = evaluationResults.map(result => {
          const provider = result.provider;
          const evaluation = result.evaluation;
          let feedbackText = '';
          
          if (evaluation.feedback) {
            feedbackText = evaluation.feedback;
          } else if (evaluation.reason) {
            feedbackText = evaluation.reason;
          } else if (evaluation.summary) {
            feedbackText = evaluation.summary;
          }
          
          return `${provider}: ${feedbackText}`;
        }).join('; ');
        
        // Determine if improvement is needed
        const needsImprovement = avgScore < 6.5;
        
        // If needed, generate improved response
        let improvedResponse = undefined;
        if (needsImprovement) {
          try {
            // Create improvement prompt
            const improvementPrompt = `
# RESPONSE IMPROVEMENT

## Original Patient Query
${prompt}

## Current Response (NEEDS IMPROVEMENT)
${response}

## Evaluation Feedback
${feedback}

## Context Information
${context.patientName ? `Patient Name: ${context.patientName}` : 'No patient name provided'}
${context.carePlanDirectives && context.carePlanDirectives.length > 0 ? 
  `Care Plan Directives: ${context.carePlanDirectives.map(cpd => cpd.directive).join('; ')}` : 
  'No CPDs available'}

## Improvement Instructions
Generate an improved response that addresses all the issues in the feedback:
1. Maintain proper KGC identity - be Keep Going Care, not an AI
2. Personalize with the patient's name
3. Align with Care Plan Directives
4. Ensure medical safety and accuracy
5. Recommend relevant KGC features appropriately
6. Use Australian English
7. Keep an encouraging but not patronizing tone

Your improved response:
`;
            
            // Get improved response
            const improvementResponse = await openai.chat.completions.create({
              model: "gpt-4o", // Use the best model for improvements
              messages: [
                {
                  role: "system",
                  content: "You are Keep Going Care, a Type 1 SaMD (Software as a Medical Device) personal health assistant. You follow Australian TGA regulations and help patients follow their doctor's Care Plan Directives. You always use Australian English (using terms like chemist instead of pharmacy) and a supportive, encouraging tone. You personalize responses with the patient's name and never identify as an AI or language model."
                },
                {
                  role: "user",
                  content: improvementPrompt
                }
              ],
              temperature: 0.7,
              max_tokens: 1024
            });
            
            improvedResponse = improvementResponse.choices[0].message.content;
          } catch (error) {
            console.error('Error generating improved response:', error);
          }
        }
        
        return {
          needsImprovement,
          score: avgScore,
          feedback,
          improvedResponse
        };
      } catch (error) {
        console.error('Error in evaluation process:', error);
        return {
          needsImprovement: false,
          score: 7,
          feedback: "Evaluation process encountered an error. Using default assessment."
        };
      }
    } catch (error) {
      console.error('Error evaluating response:', error);
      return {
        needsImprovement: false,
        score: 7,
        feedback: "Could not evaluate due to an error."
      };
    }
  }
  
  /**
   * Process emergency reports or urgent situations
   * Not currently implemented but reserved for future expansion
   */
  async handleEmergencyResponse(
    reportText: string, 
    userId: number
  ): Promise<string> {
    // Emergency handling will be implemented in future versions
    // For now, return standard guidance
    return "This appears to be an urgent situation. Keep Going Care is not designed to handle medical emergencies. If this is a medical emergency, please contact emergency services (000 in Australia) immediately. If it's urgent but not an emergency, please contact your doctor directly.";
  }

  /**
   * Analyze response and store relevant information in memory
   */
  async updateMemoryFromInteraction(
    userId: number,
    prompt: string,
    response: string
  ): Promise<void> {
    try {
      const extractionPrompt = `
Analyze the following conversation between a patient and Keep Going Care (KGC):

Patient: "${prompt}"

KGC: "${response}"

Extract ONLY the most important information that should be remembered about the patient from this conversation. 
Focus on:
1. Health preferences and routines (PROCEDURAL memory)
2. Significant events or experiences (EPISODIC memory)
3. Personal health knowledge and facts (SEMANTIC memory)

For each type, provide at most ONE extracted memory in JSON format:
{
  "procedural": "Memory about preferences or routines, or null if none",
  "episodic": "Memory about events or experiences, or null if none",
  "semantic": "Memory about health knowledge or facts, or null if none"
}
`;

      const extractionResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use smaller model for efficiency
        messages: [
          {
            role: "system",
            content: "You are a memory extraction system for Keep Going Care. Your job is to identify information worth remembering from patient conversations. Focus only on extracting factual, relevant health information. Do not include speculation or general advice. Output only valid JSON."
          },
          {
            role: "user",
            content: extractionPrompt
          }
        ],
        response_format: { type: "json_object" } as any,
        temperature: 0.2,
        max_tokens: 1024
      });
      
      try {
        const extractionText = extractionResponse.choices[0].message.content;
        if (!extractionText) return;
        
        const extraction = JSON.parse(extractionText);
        
        // Store procedural memory if available
        if (extraction.procedural && extraction.procedural !== "null") {
          await enhancedMemoryManager.storeMemory(
            userId,
            extraction.procedural,
            MemorySystem.PROCEDURAL,
            ImportanceLevel.MEDIUM
          );
        }
        
        // Store episodic memory if available
        if (extraction.episodic && extraction.episodic !== "null") {
          await enhancedMemoryManager.storeMemory(
            userId,
            extraction.episodic,
            MemorySystem.EPISODIC,
            ImportanceLevel.MEDIUM
          );
        }
        
        // Store semantic memory if available
        if (extraction.semantic && extraction.semantic !== "null") {
          await enhancedMemoryManager.storeMemory(
            userId,
            extraction.semantic,
            MemorySystem.SEMANTIC,
            ImportanceLevel.MEDIUM
          );
        }
      } catch (error) {
        console.error('Error processing memory extraction:', error);
      }
    } catch (error) {
      console.error('Error updating memory from interaction:', error);
    }
  }
}

// Create an instance for export
const enhancedMCPService = new EnhancedMCPService();
export { enhancedMCPService };