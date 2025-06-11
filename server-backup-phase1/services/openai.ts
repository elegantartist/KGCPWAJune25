import OpenAI from 'openai';
import { RecipeSearchResult, EnhancedRecipe, RecipeAnalysis, RecipeAnalysisPreferences } from '../types/recipe';

// Create a cache for recipe analyses to reduce API calls
const analysisCache = new Map<string, RecipeAnalysis>();
const scoreCache = new Map<string, number>();

// Initialize OpenAI
let openai: OpenAI;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI API initialized successfully');
} catch (error) {
  console.error('Failed to initialize OpenAI API:', error);
}

/**
 * Analyze a recipe using OpenAI
 */
async function analyzeRecipe(recipe: RecipeSearchResult): Promise<EnhancedRecipe> {
  try {
    // Check cache first
    const cacheKey = recipe.url;
    let analysis: RecipeAnalysis | undefined = analysisCache.get(cacheKey);
    let healthScore: number | undefined = scoreCache.get(cacheKey);
    
    if (!analysis || healthScore === undefined) {
      // Prepare prompt for OpenAI
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: 'system', 
              content: 'You are a nutritionist and dietitian who provides accurate, evidence-based analysis of recipes. Focus on nutritional value, health benefits, and practical tips.' 
            },
            { 
              role: 'user', 
              content: `Analyze this recipe and provide nutritional information:
Recipe Title: ${recipe.title}
Recipe Description: ${recipe.description}
Source: ${recipe.source_name || 'Unknown'}
Cuisine: ${recipe.cuisine_type || 'Not specified'}
Meal Type: ${recipe.meal_type || 'Not specified'}

Respond with JSON only, following this structure:
{
  "nutritionalValue": "Brief, evidence-based analysis of nutritional value",
  "healthBenefits": ["3-5 bullet points on health benefits"],
  "caloriesEstimate": "Approximate calories per serving",
  "difficultyLevel": "Easy, Medium, or Hard",
  "alternatives": [
    {
      "ingredient": "ingredient name",
      "alternatives": ["healthier alternative 1", "healthier alternative 2"]
    }
  ],
  "tips": ["2-4 quick health-focused cooking tips"],
  "healthScore": number from 0-100 rating nutritional quality
}`
            }
          ],
          temperature: 0.5
        });
        
        const responseContent = response.choices[0]?.message?.content;
        
        if (responseContent) {
          const parsedResponse = JSON.parse(responseContent);
          
          // Extract data
          analysis = {
            nutritionalValue: parsedResponse.nutritionalValue || 'Nutritional information not available',
            healthBenefits: parsedResponse.healthBenefits || [],
            caloriesEstimate: parsedResponse.caloriesEstimate || 'Unknown',
            difficultyLevel: parsedResponse.difficultyLevel || 'Medium',
            alternatives: parsedResponse.alternatives || [],
            tips: parsedResponse.tips || []
          };
          
          healthScore = parsedResponse.healthScore || 50;
          
          // Cache the results
          analysisCache.set(cacheKey, analysis);
          if (typeof healthScore === 'number') {
            scoreCache.set(cacheKey, healthScore);
          }
        } else {
          throw new Error('No content in response');
        }
      } catch (apiError) {
        console.error('Error calling OpenAI API:', apiError);
        // Provide fallback analysis
        analysis = {
          nutritionalValue: 'Unable to analyze nutritional content at this time.',
          healthBenefits: ['Benefits could not be determined'],
          caloriesEstimate: 'Unknown',
          difficultyLevel: 'Medium',
          alternatives: [],
          tips: ['Consider consulting a nutritionist for personalized advice']
        };
        healthScore = 50;
      }
    }
    
    // Return enhanced recipe
    return {
      ...recipe,
      analysis,
      healthScore
    };
    
  } catch (error) {
    console.error('Error analyzing recipe with OpenAI:', error);
    throw new Error('Failed to analyze recipe');
  }
}

/**
 * Analyze and rank multiple recipes based on health score
 */
async function analyzeAndRankRecipes(
  recipes: RecipeSearchResult[],
  preferences: RecipeAnalysisPreferences = {}
): Promise<EnhancedRecipe[]> {
  try {
    // Process recipes in parallel
    const enhancedRecipes = await Promise.all(
      recipes.map(recipe => analyzeRecipe(recipe))
    );
    
    // Apply user preferences
    if (preferences.allergies?.length || preferences.avoidIngredients?.length) {
      // Filter out recipes with allergens or avoided ingredients
      // This would require ingredient parsing which we don't have here
      // For now, we'll just adjust the health score based on preferences
    }
    
    // Sort by health score if health-focused
    if (preferences.healthFocus) {
      enhancedRecipes.sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));
    }
    
    return enhancedRecipes;
    
  } catch (error) {
    console.error('Error analyzing multiple recipes:', error);
    throw new Error('Failed to analyze and rank recipes');
  }
}

export default {
  analyzeRecipe,
  analyzeAndRankRecipes,
  getClient: () => openai
};