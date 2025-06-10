/**
 * Query Parser Service - Advanced NLU Pre-Processing
 * Natural Language Understanding engine for structured query analysis
 */

import OpenAI from 'openai';
import { secureLog } from './privacyMiddleware';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ParsedQuery {
  intent: 'find_location_for_activity' | 'general_chat' | 'ask_about_data' | 'health_inquiry' | 'other';
  entities: {
    activity?: string;
    location?: string;
    timeframe?: string;
    healthTopic?: string;
  };
  isSafeForTooling: boolean; // Flag to indicate if the query is a simple, safe request for a tool
  confidence: number; // Confidence score for the parsing
}

export async function parseUserQuery(queryText: string): Promise<ParsedQuery> {
  const systemPrompt = `
    You are a highly efficient Natural Language Understanding (NLU) engine for a healthcare platform. Your only job is to analyze the user's query and return a JSON object with the following structure:
    {
      "intent": "classification of the user's goal",
      "entities": { 
        "activity": "the activity mentioned (e.g., walk, run, exercise)", 
        "location": "the location mentioned (e.g., city, place name)", 
        "timeframe": "any timeframe mentioned (e.g., tomorrow, next week)",
        "healthTopic": "any health-related topic mentioned"
      },
      "isSafeForTooling": "boolean, true if the query is a simple request for public information (like a location search), false otherwise",
      "confidence": "number between 0 and 1 indicating parsing confidence"
    }
    
    Intent classifications:
    - 'find_location_for_activity': User wants to find places for activities (walking, exercise, etc.)
    - 'general_chat': Casual conversation, greetings, general questions
    - 'ask_about_data': Questions about their health data, scores, metrics
    - 'health_inquiry': Medical or health-related questions
    - 'other': Anything else
    
    Guidelines:
    - If an entity is not present, omit the key
    - Set isSafeForTooling to true only for simple location/activity searches
    - Never respond with conversational text, only the JSON object
    - Be conservative with isSafeForTooling - when in doubt, set to false
  `;

  try {
    secureLog('QueryParser: Analyzing user query', { 
      queryLength: queryText.length,
      queryPreview: queryText.substring(0, 50) + '...'
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: queryText }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.1 // Low temperature for consistent parsing
    });
    
    const parsedJson = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate the parsed result
    const result: ParsedQuery = {
      intent: parsedJson.intent || 'other',
      entities: parsedJson.entities || {},
      isSafeForTooling: parsedJson.isSafeForTooling || false,
      confidence: Math.min(1, Math.max(0, parsedJson.confidence || 0.5))
    };

    secureLog('QueryParser: Successfully parsed query', {
      intent: result.intent,
      entityCount: Object.keys(result.entities).length,
      isSafeForTooling: result.isSafeForTooling,
      confidence: result.confidence
    });

    return result;

  } catch (error) {
    secureLog('QueryParser: Error during parsing', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Fallback in case of parsing failure
    return { 
      intent: 'general_chat', 
      entities: {}, 
      isSafeForTooling: false,
      confidence: 0.1
    };
  }
}

/**
 * Enhanced location search using structured entities
 */
export async function performStructuredLocationSearch(
  entities: ParsedQuery['entities'], 
  originalQuery: string,
  userId: number,
  sessionId: string
): Promise<string> {
  try {
    const { activity = 'activity', location = 'area', timeframe } = entities;
    
    secureLog('Structured location search initiated', { 
      activity, 
      location, 
      timeframe,
      userId, 
      sessionId 
    });

    // Build contextual search query
    let searchContext = `places for ${activity}`;
    if (location) searchContext += ` in ${location}`;
    if (timeframe) searchContext += ` (${timeframe})`;

    // Since we don't have Tavily configured, provide intelligent structured response
    const synthesisPrompt = `
      A user is asking about ${searchContext}. They want recommendations for ${activity} in ${location}${timeframe ? ` ${timeframe}` : ''}.
      
      Provide a helpful, encouraging response that:
      1. Acknowledges their specific location and activity
      2. Gives general guidance for finding good ${activity} spots
      3. Includes health and wellness benefits
      4. Suggests practical next steps
      
      Keep the tone warm, supportive, and health-focused as this is a healthcare platform.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are a supportive health and wellness assistant. Provide encouraging, practical advice.' 
        },
        { role: 'user', content: synthesisPrompt }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    const synthesizedResponse = response.choices[0]?.message?.content || 
      `I'd love to help you find great places for ${activity} in ${location}! While I can't access real-time location data, I recommend checking local tourism sites and apps for current recommendations. ${activity} is excellent for your health and wellbeing!`;

    secureLog('Structured location search completed', { 
      sessionId,
      responseLength: synthesizedResponse.length
    });

    return synthesizedResponse;

  } catch (error) {
    secureLog('Structured location search failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId 
    });
    
    const { activity = 'activity', location = 'the area' } = entities;
    return `I'd love to help you find places for ${activity} in ${location}! While I'm having trouble accessing location data right now, I recommend checking local tourism websites or asking locals for their favorite spots. ${activity} is wonderful for your health!`;
  }
}