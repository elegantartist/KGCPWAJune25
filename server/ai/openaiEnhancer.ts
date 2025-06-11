import OpenAI from 'openai';
import { TavilySearchResult } from './tavilyClient';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced search result interface
export interface EnhancedSearchResult {
  title: string;
  url: string;
  content: string;
  image?: string | null;
  videoId?: string | null;
  category?: string;
  intensity?: string;
  duration?: string;
  relevanceScore?: number;
  nutritionalAnalysis?: {
    calories?: number;
    difficulty?: string;
    healthScore?: number;
    allergens?: string[];
    dietCompatibility?: Record<string, boolean>;
  };
  enhancedMetadata?: {
    tags?: string[];
    recommendedFor?: string[];
    equipmentNeeded?: string[];
    skillLevel?: string;
  };
}

/**
 * Enhances recipe search results using OpenAI's GPT-4o for intelligent content analysis
 */
export async function enhanceRecipeSearchResults(
  rawResults: TavilySearchResult[],
  searchFilters: any
): Promise<EnhancedSearchResult[]> {
  try {
    console.log(`Enhancing ${rawResults.length} recipe results with OpenAI analysis...`);
    
    if (!rawResults.length) {
      return [];
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a nutritional AI assistant that analyzes cooking videos and recipes to provide detailed health information. 
          
          Analyze the provided search results and enhance each one with:
          1. Nutritional analysis (calories, health score 1-10, difficulty level)
          2. Allergen identification
          3. Diet compatibility (vegetarian, vegan, keto, gluten-free, etc.)
          4. Relevant tags for categorization
          5. Equipment needed
          6. Skill level assessment
          
          Return your analysis as a JSON array matching this exact structure. Be precise and health-focused.`
        },
        {
          role: "user",
          content: `Analyze these cooking video search results for: ${JSON.stringify(searchFilters)}

Search Results:
${JSON.stringify(rawResults.slice(0, 10), null, 2)}

Return enhanced results as JSON array with this structure:
[{
  "title": string,
  "url": string,
  "content": string,
  "image": string,
  "videoId": string,
  "category": string,
  "relevanceScore": number (1-10),
  "nutritionalAnalysis": {
    "calories": number,
    "difficulty": "beginner|intermediate|advanced",
    "healthScore": number (1-10),
    "allergens": string[],
    "dietCompatibility": {
      "vegetarian": boolean,
      "vegan": boolean,
      "glutenFree": boolean,
      "keto": boolean,
      "lowCarb": boolean,
      "dairyFree": boolean
    }
  },
  "enhancedMetadata": {
    "tags": string[],
    "recommendedFor": string[],
    "equipmentNeeded": string[],
    "skillLevel": "beginner|intermediate|advanced"
  }
}]`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content || '[]');
    
    // Merge AI analysis with original results
    const enhancedResults: EnhancedSearchResult[] = rawResults.map((result, index) => {
      const aiData = Array.isArray(aiAnalysis) ? aiAnalysis[index] : aiAnalysis.results?.[index];
      
      return {
        ...result,
        relevanceScore: aiData?.relevanceScore || 5,
        nutritionalAnalysis: aiData?.nutritionalAnalysis || {},
        enhancedMetadata: aiData?.enhancedMetadata || {},
        category: aiData?.category || result.category || 'recipe'
      };
    });

    console.log(`✓ Enhanced ${enhancedResults.length} recipe results with AI analysis`);
    return enhancedResults;

  } catch (error: any) {
    console.error('OpenAI enhancement error:', error.message);
    // Return original results if AI enhancement fails
    return rawResults.map(result => ({
      ...result,
      relevanceScore: 5,
      nutritionalAnalysis: {},
      enhancedMetadata: {}
    }));
  }
}

/**
 * Enhances exercise/wellness search results using OpenAI's GPT-4o
 */
export async function enhanceExerciseSearchResults(
  rawResults: TavilySearchResult[],
  searchFilters: any
): Promise<EnhancedSearchResult[]> {
  try {
    console.log(`Enhancing ${rawResults.length} exercise results with OpenAI analysis...`);
    
    if (!rawResults.length) {
      return [];
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a fitness AI assistant that analyzes exercise and wellness videos to provide detailed fitness information.
          
          Analyze the provided search results and enhance each one with:
          1. Exercise intensity classification
          2. Equipment requirements
          3. Fitness level recommendations
          4. Target muscle groups
          5. Estimated calorie burn
          6. Safety considerations
          
          Focus on providing accurate, health-focused assessments.`
        },
        {
          role: "user",
          content: `Analyze these exercise/wellness video search results for: ${JSON.stringify(searchFilters)}

Search Results:
${JSON.stringify(rawResults.slice(0, 10), null, 2)}

Return enhanced results as JSON array with this structure:
[{
  "title": string,
  "url": string,
  "content": string,
  "image": string,
  "videoId": string,
  "category": string,
  "intensity": "low|moderate|high|extreme",
  "duration": string,
  "relevanceScore": number (1-10),
  "enhancedMetadata": {
    "tags": string[],
    "equipmentNeeded": string[],
    "targetMuscleGroups": string[],
    "fitnessLevel": "beginner|intermediate|advanced",
    "estimatedCalorieBurn": number,
    "safetyNotes": string[]
  }
}]`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content || '[]');
    
    // Merge AI analysis with original results
    const enhancedResults: EnhancedSearchResult[] = rawResults.map((result, index) => {
      const aiData = Array.isArray(aiAnalysis) ? aiAnalysis[index] : aiAnalysis.results?.[index];
      
      return {
        ...result,
        intensity: aiData?.intensity || result.intensity || 'moderate',
        duration: aiData?.duration || result.duration || '30 minutes',
        relevanceScore: aiData?.relevanceScore || 5,
        enhancedMetadata: aiData?.enhancedMetadata || {},
        category: aiData?.category || result.category || 'exercise'
      };
    });

    console.log(`✓ Enhanced ${enhancedResults.length} exercise results with AI analysis`);
    return enhancedResults;

  } catch (error: any) {
    console.error('OpenAI enhancement error:', error.message);
    // Return original results if AI enhancement fails
    return rawResults.map(result => ({
      ...result,
      intensity: result.intensity || 'moderate',
      duration: result.duration || '30 minutes',
      relevanceScore: 5,
      enhancedMetadata: {}
    }));
  }
}

/**
 * Enhances provider search results using OpenAI's GPT-4o for location-based services
 */
export async function enhanceProviderSearchResults(
  rawResults: TavilySearchResult[],
  location: string,
  serviceType: string
): Promise<any[]> {
  try {
    console.log(`Enhancing provider search results for ${serviceType} in ${location}...`);
    
    if (!rawResults.length) {
      return [];
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a healthcare service locator AI that analyzes search results to extract structured provider information.
          
          Extract and structure provider information including:
          1. Business name and contact details
          2. Service types offered
          3. Location verification
          4. Professional credentials when available
          5. Business verification status
          
          Focus on accuracy and provide only verifiable information.`
        },
        {
          role: "user",
          content: `Extract provider information from these search results for ${serviceType} services in ${location}:

Search Results:
${JSON.stringify(rawResults.slice(0, 15), null, 2)}

Return structured provider data as JSON array:
[{
  "id": string,
  "name": string,
  "type": string,
  "address": string,
  "phone": string,
  "email": string,
  "website": string,
  "bio": string,
  "verifications": {
    "locationVerified": boolean,
    "businessVerified": boolean,
    "credentialsFound": boolean
  },
  "services": string[],
  "relevanceScore": number (1-10)
}]`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2500
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content || '[]');
    const providers = Array.isArray(aiAnalysis) ? aiAnalysis : aiAnalysis.providers || [];
    
    console.log(`✓ Enhanced provider search with ${providers.length} structured results`);
    return providers;

  } catch (error: any) {
    console.error('OpenAI provider enhancement error:', error.message);
    return [];
  }
}