import axios from 'axios';
// Recipe interfaces
export interface RecipeSearchFilters {
  ingredients?: string[];
  cuisineType?: string;
  mealType?: string;
  dietaryPreferences?: string[];
  maxCookingTime?: number;
  userId?: number;
  useCPDs?: boolean; // Flag to indicate if CPDs should be considered in search
}

export interface RecipeSearchResult {
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
  source_name?: string;
  cooking_time?: string;
  ingredients?: string[];
  cuisine_type?: string;
  meal_type?: string;
}

/**
 * Search for recipes using Tavily API
 */
async function searchRecipes(filters: RecipeSearchFilters): Promise<RecipeSearchResult[]> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY is not set in the environment');
    }

    // Build search query
    let searchQuery = 'healthy recipes';
    
    if (filters.ingredients && filters.ingredients.length > 0) {
      searchQuery += ` with ${filters.ingredients.join(', ')}`;
    }
    
    if (filters.cuisineType) {
      searchQuery += ` ${filters.cuisineType} cuisine`;
    }
    
    if (filters.mealType) {
      searchQuery += ` for ${filters.mealType}`;
    }
    
    // Process dietary preferences and CPD-derived terms
    if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) {
      // Ensure unique terms
      const uniquePreferencesSet = new Set(filters.dietaryPreferences);
      const uniquePreferences = Array.from(uniquePreferencesSet);
      searchQuery += ` ${uniquePreferences.join(' ')}`;
      
      // Log CPD-related information for debugging
      if (filters.useCPDs) {
        console.log(`Recipe search enhanced with Care Plan Directives: ${uniquePreferences.join(', ')}`);
      }
    }
    
    // Add health-focused terms
    searchQuery += ' nutritious with full ingredients and instructions';
    
    // Call Tavily API
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'advanced',
        include_domains: ['allrecipes.com', 'eatingwell.com', 'foodnetwork.com', 'tasty.co', 'bbcgoodfood.com', 'delish.com', 'taste.com.au', 'yummly.com', 'epicurious.com'],
        include_answer: true,
        include_raw_content: false,
        max_results: 10,
        include_images: true
      }
    );
    
    console.log('Tavily recipe search query:', searchQuery);
    
    if (!response.data || !response.data.results) {
      return [];
    }
    
    // Map Tavily results to our recipe format
    return response.data.results.map((result: any) => ({
      title: result.title,
      description: result.content.substring(0, 200) + '...',
      url: result.url,
      thumbnail_url: result.image,
      source_name: new URL(result.url).hostname.replace('www.', ''),
      cuisine_type: filters.cuisineType || undefined,
      meal_type: filters.mealType || undefined
    }));
    
  } catch (error) {
    console.error('Error searching recipes with Tavily:', error);
    throw new Error('Failed to search for recipes');
  }
}

/**
 * Extract YouTube video ID from a URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([^"&?\/\s]{11})/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Search for cooking videos using Tavily API with specified configuration
 */
async function searchCookingVideos(filters: RecipeSearchFilters): Promise<{ 
  results: RecipeSearchResult[],
  query: string,
  answer?: string
}> {
  try {
    // Guard clause: Check for required API key
    if (!process.env.TAVILY_API_KEY) {
      console.error("CRITICAL ERROR: TAVILY_API_KEY is not set in environment secrets.");
      throw new Error("The search feature is not properly configured. Please contact support.");
    }

    // Build cuisine prefix based on cuisine type
    const cuisinePrefix = filters.cuisineType 
      ? `authentic ${filters.cuisineType}` 
      : "healthy";
    
    // Build ingredients list if specified
    const ingredientsStr = filters.ingredients && filters.ingredients.length > 0
      ? `using ${filters.ingredients.join(', ')}`
      : "";
    
    // Construct the search query according to specified format
    let searchQuery = `${cuisinePrefix} recipes ${ingredientsStr} site:youtube.com`;
    
    // Add meal type if specified
    if (filters.mealType) {
      searchQuery = `${cuisinePrefix} ${filters.mealType} recipes ${ingredientsStr} site:youtube.com`;
    }
    
    // Process dietary preferences and CPD-derived terms
    let dietaryTerms: string[] = [];
    if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) {
      // Ensure unique terms
      const uniquePreferencesSet = new Set(filters.dietaryPreferences);
      const uniquePreferences = Array.from(uniquePreferencesSet);
      dietaryTerms = uniquePreferences;
      
      // Add dietary preferences to query
      if (filters.useCPDs) {
        console.log(`Video search enhanced with Care Plan Directives: ${uniquePreferences.join(', ')}`);
        searchQuery = `${cuisinePrefix} ${uniquePreferences.join(' ')} recipes ${ingredientsStr} site:youtube.com`;
      }
    }
    
    console.log('Tavily video search query:', searchQuery);
    
    // Call Tavily API with specified configuration
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'advanced',
        include_domains: ['youtube.com'],
        include_answer: true,
        include_raw_content: false,
        max_results: 20, // Request 20 results as specified
        include_images: true
      }
    );
    
    if (!response.data || !response.data.results) {
      return { results: [], query: searchQuery };
    }
    
    // Map Tavily results to our recipe format with enhanced video information
    const mappedResults = response.data.results.map((result: any) => {
      // Extract video ID from URL
      const videoId = extractVideoId(result.url);
      
      // Construct high-quality thumbnail URL using the videoId
      const thumbnailUrl = videoId 
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` 
        : result.image;
      
      return {
        title: result.title,
        description: result.content.substring(0, 200) + '...',
        url: result.url,
        thumbnail_url: thumbnailUrl,
        source_name: 'YouTube',
        cuisine_type: filters.cuisineType || undefined,
        meal_type: filters.mealType || undefined,
        videoId: videoId,
        tags: dietaryTerms
      };
    });
    
    return { 
      results: mappedResults,
      query: searchQuery,
      answer: response.data.answer
    };
    
  } catch (error) {
    console.error('Error searching cooking videos with Tavily:', error);
    throw new Error('Failed to search for cooking videos');
  }
}

export default {
  searchRecipes,
  searchCookingVideos
};