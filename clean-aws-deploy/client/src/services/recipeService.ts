import { apiRequest } from '../lib/queryClient';

export interface RecipeSearchFilters {
  ingredients?: string[];
  cuisineType?: string;
  mealType?: string;
  dietaryPreferences?: string[];
  maxCookingTime?: number;
  userId?: number;
  useCPDs?: boolean; // Flag to indicate if CPDs should be considered in search
  additionalContext?: {
    doctorCPD?: string;    // Doctor's exact diet plan text
    ahfGuidelines?: string; // AHF guidelines to include in search context but not show in UI
  };
  limit?: number; // Added to limit the number of results
}

export interface RecipeSearchResult {
  id?: number;  // Added for favorite videos
  userId?: number;  // Added for favorite videos
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
  videoId?: string;  // YouTube video ID
  source_name?: string;
  cooking_time?: string;
  ingredients?: string[];
  cuisine_type?: string;
  meal_type?: string;
  tags?: string[];  // Added for categorizing videos
  createdAt?: string;  // Added for sorting favorites by date
  nutritionalAnalysis?: {  // Added for OpenAI nutritional analysis
    calories?: number;
    difficulty?: string;
    healthScore?: number;
    allergens?: string[];
    dietCompatibility?: Record<string, boolean>;
  };
}

export interface RecipeAnalysis {
  nutritionalValue: string;
  healthBenefits: string[];
  caloriesEstimate: string;
  difficultyLevel: string;
  alternatives: {
    ingredient: string;
    alternatives: string[];
  }[];
  tips: string[];
}

export interface EnhancedRecipe extends RecipeSearchResult {
  analysis?: RecipeAnalysis;
  healthScore?: number;
}

export interface SavedRecipe extends EnhancedRecipe {
  id: number;
  userId: number;
  created_at: string;
}

/**
 * Search for recipes based on filters
 */
export async function searchRecipes(filters: RecipeSearchFilters): Promise<RecipeSearchResult[]> {
  try {
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await apiRequest<{ recipes: RecipeSearchResult[], query: string, answer?: string }>(
        'POST', 
        '/api/recipes/search', 
        { ...filters, limit: 10 }, // Added limit here
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response || !response.recipes) {
        console.error('Invalid response format from recipe search API');
        return [];
      }

      // Ensure all recipe results have a thumbnail_url
      const recipesWithThumbnails = response.recipes.map(recipe => {
        if (!recipe.thumbnail_url) {
          // If no thumbnail, use a placeholder image
          recipe.thumbnail_url = `https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(recipe.title.substring(0, 20))}`;
        }
        return recipe;
      });

      return recipesWithThumbnails;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Recipe search request timed out');
        throw new Error('Recipe search request timed out. Please try again.');
      }

      throw error;
    }
  } catch (error: unknown) {
    console.error('Recipe search error:', error);

    // Extract more detailed error message if available
    let errorMessage = 'Failed to search for recipes';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      if (errorObj.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Get detailed analysis for a recipe
 */
export async function analyzeRecipe(recipe: RecipeSearchResult, userId?: number): Promise<EnhancedRecipe> {
  try {
    return await apiRequest<EnhancedRecipe>('POST', '/api/recipes/analyze', { recipe, userId });
  } catch (error) {
    console.error('Recipe analysis error:', error);
    throw new Error('Failed to analyze recipe');
  }
}

/**
 * Analyze multiple recipes in batch and sort by health score
 */
export async function analyzeRecipeBatch(
  recipes: RecipeSearchResult[],
  preferences: {
    healthFocus?: boolean;
    allergies?: string[];
    avoidIngredients?: string[];
    userId?: number;
  } = {}
): Promise<EnhancedRecipe[]> {
  try {
    return await apiRequest<EnhancedRecipe[]>('POST', '/api/recipes/analyze-batch', {
      recipes,
      ...preferences
    });
  } catch (error) {
    console.error('Recipe batch analysis error:', error);
    throw new Error('Failed to analyze recipes');
  }
}

/**
 * Save a recipe to user's favorites
 */
export async function saveRecipe(userId: number, recipe: EnhancedRecipe): Promise<SavedRecipe> {
  try {
    return await apiRequest<SavedRecipe>('POST', `/api/users/${userId}/saved-recipes`, recipe);
  } catch (error) {
    console.error('Save recipe error:', error);
    throw new Error('Failed to save recipe');
  }
}

/**
 * Get user's saved recipes
 */
export async function getSavedRecipes(userId: number): Promise<SavedRecipe[]> {
  try {
    return await apiRequest<SavedRecipe[]>('GET', `/api/users/${userId}/saved-recipes`);
  } catch (error) {
    console.error('Get saved recipes error:', error);
    throw new Error('Failed to retrieve saved recipes');
  }
}

/**
 * Search for cooking videos on YouTube
 * Enhanced to prioritize videos that match Care Plan Directives (CPDs)
 * and focus on individual meal preparation videos
 */
export async function searchCookingVideos(filters: RecipeSearchFilters): Promise<RecipeSearchResult[]> {
  try {
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await apiRequest<{ videos: RecipeSearchResult[], query: string, answer?: string }>(
        'POST', 
        '/api/recipes/videos', 
        { ...filters, limit: 10 }, // Request exactly 10 results
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response || !response.videos) {
        console.error('Invalid response format from video search API');
        return [];
      }

      // Ensure all video results have a thumbnail_url and other required fields
      const videosWithThumbnails = response.videos.map(video => {
        if (!video.thumbnail_url) {
          // If no thumbnail, use a YouTube-style placeholder
          video.thumbnail_url = `https://placehold.co/320x180/ff0000/ffffff?text=${encodeURIComponent("Video: " + video.title.substring(0, 15))}`;
        }
        
        // Add some metadata to help identify individual meal preparation videos
        const isMealPrep = 
          video.title.toLowerCase().includes("how to make") || 
          video.title.toLowerCase().includes("how to cook") ||
          video.title.toLowerCase().includes("recipe") ||
          video.title.toLowerCase().includes("meal prep") ||
          video.description.toLowerCase().includes("ingredients");
          
        // Add this info as a tag if it's not already there
        if (isMealPrep && video.tags && !video.tags.includes("individual-meal")) {
          video.tags.push("individual-meal");
        } else if (isMealPrep && !video.tags) {
          video.tags = ["individual-meal"];
        }
        
        return video;
      });
      
      // Log some info about how many videos matched our criteria
      const individualMealVideos = videosWithThumbnails.filter(v => 
        v.tags && v.tags.includes("individual-meal")
      );
      
      console.log(`Found ${videosWithThumbnails.length} total videos, ${individualMealVideos.length} are individual meal preparations`);

      // Return the results, all of which should be cooking videos
      return videosWithThumbnails;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Video search request timed out');
        throw new Error('Video search request timed out. Please try again.');
      }

      throw error;
    }
  } catch (error: unknown) {
    console.error('Cooking video search error:', error);

    // Extract more detailed error message if available
    let errorMessage = 'Failed to search for cooking videos';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      if (errorObj.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Save a video to user's favorites
 */
export async function saveFavoriteVideo(userId: number, video: RecipeSearchResult): Promise<any> {
  try {
    return await apiRequest('POST', `/api/users/${userId}/favorite-videos`, video);
  } catch (error) {
    console.error('Save favorite video error:', error);
    throw new Error('Failed to save favorite video');
  }
}

/**
 * Get user's favorite videos
 */
export async function getFavoriteVideos(userId: number): Promise<RecipeSearchResult[]> {
  try {
    return await apiRequest<RecipeSearchResult[]>('GET', `/api/users/${userId}/favorite-videos`);
  } catch (error) {
    console.error('Get favorite videos error:', error);
    throw new Error('Failed to retrieve favorite videos');
  }
}

/**
 * Delete a favorite video
 */
export async function deleteFavoriteVideo(userId: number, videoId: number): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/users/${userId}/favorite-videos/${videoId}`);
  } catch (error) {
    console.error('Delete favorite video error:', error);
    throw new Error('Failed to delete favorite video');
  }
}

export default {
  searchRecipes,
  analyzeRecipe,
  analyzeRecipeBatch,
  saveRecipe,
  getSavedRecipes,
  searchCookingVideos,
  saveFavoriteVideo,
  getFavoriteVideos,
  deleteFavoriteVideo
};