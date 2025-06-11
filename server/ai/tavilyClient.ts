import axios from 'axios';
import { RecipeSearchFilters, RecipeSearchResult } from '../types/recipe';
import { enhanceRecipeSearchResults, enhanceExerciseSearchResults, enhanceProviderSearchResults } from './openaiEnhancer';

// Define enhanced TavilySearchResult interface with our additional fields
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  image?: string | null;
  videoId?: string | null;
  category?: string;
  intensity?: string;
  duration?: string;
  relevanceScore?: number;
}

/**
 * Generate a placeholder image URL for a recipe when no thumbnail is available
 */
function generatePlaceholderUrl(title: string, domain: string): string {
  // Generate colors based on the domain name to create visually distinct placeholders
  const getColorForDomain = (domain: string): string => {
    const domains: Record<string, string> = {
      'allrecipes.com': '4299e1',
      'eatingwell.com': '38a169',
      'foodnetwork.com': 'e53e3e',
      'bbcgoodfood.com': '805ad5',
      'epicurious.com': 'dd6b20',
      'delish.com': 'ed8936',
      'taste.com.au': '3182ce',
      'yummly.com': 'd53f8c'
    };

    return domains[domain] || '718096'; // Default color if domain not in list
  };

  const bgColor = getColorForDomain(domain);
  const textColor = 'ffffff';
  const shortTitle = encodeURIComponent(title.substring(0, 30) + '...');

  return `https://placehold.co/600x400/${bgColor}/${textColor}?text=${shortTitle}`;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
function extractYoutubeVideoId(url: string): string | null {
  if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
    return null;
  }

  try {
    // Handle different YouTube URL formats
    let videoId: string | null = null;

    // youtu.be format
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length > 1) {
        videoId = parts[1].split('?')[0].split('&')[0];
      }
    } 
    // youtube.com/watch?v= format
    else if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v');
    } 
    // youtube.com/v/ or /embed/ format
    else if (url.includes('/v/') || url.includes('/embed/')) {
      const regex = /\/(?:v|embed)\/([^/?&]+)/;
      const match = url.match(regex);
      videoId = match ? match[1] : null;
    }

    return videoId;
  } catch (error) {
    console.error('Error extracting YouTube video ID:', error);
    return null;
  }
}

// Interface for the Tavily search API response
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  description?: string;  // Added for compatibility
  image?: string | null;
  videoId?: string | null;
  category?: string;
  intensity?: string;
  duration?: string;
  relevanceScore?: number;
}

/**
 * Search for health content using Tavily API
 * @param query The search query
 * @param contentType Optional content type/category for the search
 * @param maxResults Optional maximum number of results to return
 * @param userLocation Optional location to add to the query
 */
export async function searchHealthContent(
  query: string, 
  contentType?: string, 
  maxResults: number = 10, 
  userLocation?: string
): Promise<{ query: string, answer?: string, results: TavilySearchResult[] }> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY is not set in the environment');
      return { query, results: [] };
    }

    let searchQuery = query;

    // Add content type if provided
    if (contentType) {
      searchQuery = `${contentType} ${searchQuery}`;
    }

    // Add location if provided
    if (userLocation) {
      searchQuery += ` near ${userLocation}`;
    }

    console.log('Tavily health search query:', searchQuery);

    // Call Tavily API
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: maxResults,
        include_images: true
      }
    );

    if (!response.data) {
      return { query: searchQuery, results: [] };
    }

    return { 
      query: searchQuery, 
      answer: response.data.answer,
      results: response.data.results || [] 
    };

  } catch (error) {
    console.error('Error searching health content with Tavily:', error);
    return { query, results: [] };
  }
}

/**
 * Search for recipes using Tavily API
 */
export async function searchRecipes(filters: RecipeSearchFilters): Promise<{ query: string, answer?: string, results: RecipeSearchResult[] }> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY is not set in the environment');
      throw new Error('Tavily API key is missing. Please configure the TAVILY_API_KEY environment variable.');
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

    if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) {
      searchQuery += ` ${filters.dietaryPreferences.join(' ')}`;
    }

    // Add health-focused terms
    searchQuery += ' nutritious with full ingredients and instructions';

    console.log('Tavily recipe search query:', searchQuery);

    // Call Tavily API with timeout and better error handling
    try {
      const response = await axios({
        method: 'post',
        url: 'https://api.tavily.com/search',
        data: {
          api_key: process.env.TAVILY_API_KEY,
          query: searchQuery,
          search_depth: 'advanced',
          include_domains: ['allrecipes.com', 'eatingwell.com', 'foodnetwork.com', 'tasty.co', 'bbcgoodfood.com', 'delish.com', 'taste.com.au', 'yummly.com', 'epicurious.com'],
          include_answer: true,
          include_raw_content: false,
          max_results: 10, // Updated max_results to 10
          include_images: true
        },
        timeout: 15000 // 15 second timeout
      });

      if (!response.data || !response.data.results) {
        console.warn('Tavily API returned no results or invalid data structure');
        return { query: searchQuery, results: [] };
      }

      // Map Tavily results to our recipe format
      const recipeResults = response.data.results.map((result: any) => {
        try {
          // Get domain for recipe site
          const domain = new URL(result.url).hostname.replace('www.', '');

          return {
            title: result.title || 'Recipe',
            description: result.content ? (result.content.substring(0, 200) + '...') : 'No description available',
            url: result.url,
            thumbnail_url: result.image || generatePlaceholderUrl(result.title || 'Recipe', domain),
            source_name: domain,
            cuisine_type: filters.cuisineType || undefined,
            meal_type: filters.mealType || undefined
          };
        } catch (err) {
          console.error('Error processing recipe result:', err);
          return null;
        }
      }).filter(Boolean) as RecipeSearchResult[];

      return { 
        query: searchQuery, 
        answer: response.data.answer,
        results: recipeResults
      };
    } catch (axiosError) {
      // Handle Axios-specific errors
      if (axios.isAxiosError(axiosError)) {
        if (axiosError.response) {
          // The request was made and the server responded with a status code outside of 2xx
          console.error('Tavily API error response:', axiosError.response.status, axiosError.response.data);
          throw new Error(`Tavily API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error('Tavily API no response received:', axiosError.request);
          throw new Error('No response received from Tavily API. Check your network connection.');
        } else {
          // Something happened in setting up the request
          console.error('Tavily API request setup error:', axiosError.message);
          throw new Error(`Error setting up Tavily API request: ${axiosError.message}`);
        }
      }
      throw axiosError; // Re-throw if it's not an Axios error
    }
  } catch (error) {
    console.error('Error searching recipes with Tavily:', error);
    // Return a more informative error that will be handled by the API route
    throw error;
  }
}

/**
 * Search for cooking videos using Tavily API with enhanced configuration
 */
export async function searchCookingVideos(filters: RecipeSearchFilters): Promise<{ query: string, answer?: string, videos: RecipeSearchResult[], message?: string }> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY is not set in the environment');
      return { query: 'cooking videos', videos: [], message: "API key missing" };
    }

    // Build cuisine prefix - use "authentic {cuisineType}" if available, otherwise "healthy"
    const cuisinePrefix = filters.cuisineType 
      ? `authentic ${filters.cuisineType}` 
      : 'healthy';

    // Build primary ingredients list
    const ingredientsList = filters.ingredients && filters.ingredients.length > 0
      ? `using ${filters.ingredients.join(', ')}`
      : '';

    // Build search query in the requested format
    let searchQuery = `${cuisinePrefix} recipes ${ingredientsList} site:youtube.com`;

    // Add meal type if provided (not in the main query format but helpful for relevance)
    if (filters.mealType) {
      searchQuery += ` for ${filters.mealType}`;
    }

    // Add dietary preferences if provided
    if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) {
      searchQuery += ` ${filters.dietaryPreferences.join(' ')}`;
    }

    console.log('Tavily video search query:', searchQuery);

    // Call Tavily API with the specified configuration
    const response = await axios({
      method: 'post',
      url: 'https://api.tavily.com/search',
      data: {
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'advanced',
        include_domains: ['youtube.com'],
        include_answer: true,
        include_raw_content: false,
        max_results: 20, // As specified in requirements
        include_images: true
      },
      timeout: 15000 // 15 second timeout for reliability
    });

    if (!response.data || !response.data.results) {
      console.warn('Tavily API returned no results or invalid data structure');
      return { query: searchQuery, videos: [], message: "No results returned from API" };
    }

    // Map Tavily results to our recipe format
    const videoResults = response.data.results.map((result: any) => {
      // Extract YouTube video ID for thumbnail generation
      const videoId = extractYoutubeVideoId(result.url);

      return {
        title: result.title || 'Recipe Video',
        description: result.content ? result.content.substring(0, 200) + '...' : 'No description available',
        url: result.url,
        // Use high-quality YouTube thumbnail URL as specified in requirements
        thumbnail_url: videoId 
          ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` 
          : (result.image || null),
        videoId: videoId, // Add videoId directly to the result
        source_name: 'YouTube',
        cuisine_type: filters.cuisineType || undefined,
        meal_type: filters.mealType || undefined
      };
    }).filter((result: RecipeSearchResult): boolean => result.videoId !== null); // Filter out non-YouTube results

    // Enhance results with OpenAI analysis for intelligent filtering
    try {
      const enhancedVideos = await enhanceRecipeSearchResults(
        videoResults.map((video: any) => ({
          title: video.title,
          url: video.url,
          content: video.description,
          image: video.thumbnail_url,
          videoId: video.videoId,
          category: 'recipe'
        })),
        filters
      );

      // Convert enhanced results back to recipe format
      const finalVideoResults = enhancedVideos.map(enhanced => ({
        title: enhanced.title,
        description: enhanced.content,
        url: enhanced.url,
        thumbnail_url: enhanced.image,
        videoId: enhanced.videoId,
        source_name: 'YouTube',
        cuisine_type: filters.cuisineType || undefined,
        meal_type: filters.mealType || undefined,
        relevanceScore: enhanced.relevanceScore,
        nutritionalAnalysis: enhanced.nutritionalAnalysis,
        enhancedMetadata: enhanced.enhancedMetadata
      }));

      return {
        query: searchQuery,
        answer: response.data.answer,
        videos: finalVideoResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      };
    } catch (enhancementError) {
      console.warn('OpenAI enhancement failed, returning original results:', enhancementError);
      return {
        query: searchQuery,
        answer: response.data.answer,
        videos: videoResults
      };
    }

  } catch (error) {
    console.error('Error searching cooking videos with Tavily:', error);
    return { query: 'cooking videos', videos: [], message: "Search error" };
  }
}

/**
 * Save user favorite content
 */
export async function saveUserFavorite(userId: number, favorite: any): Promise<any> {
  // This would typically save to a database, but for now it's just a stub
  console.log(`Saving favorite for user ${userId}:`, favorite);
  return { ...favorite, id: Date.now(), userId };
}

/**
 * Remove user favorite content
 */
export async function removeUserFavorite(userId: number, favoriteId: number): Promise<boolean> {
  // This would typically delete from a database, but for now it's just a stub
  console.log(`Removing favorite ${favoriteId} for user ${userId}`);
  return true;
}

/**
 * Search for exercise and wellness videos using Tavily API
 */
export async function searchExerciseWellnessVideos(
  category: 'exercise' | 'wellness',
  filters: { 
    intensity?: 'low' | 'moderate' | 'high',
    duration?: 'short' | 'medium' | 'long',
    tags?: string[]
  }
): Promise<{ 
  videos: TavilySearchResult[], 
  query: string, 
  answer?: string,
  message?: string
}> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY is not set in the environment');
      return { query: `${category} videos`, videos: [], message: "API key missing" };
    }

    console.log(`Starting ${category} search with filters:`, JSON.stringify(filters));
    const { intensity, duration, tags = [] } = filters;
    
    // Function to construct search query with varying specificity
    const constructSearchQuery = (isSpecific: boolean = true) => {
      let searchQuery = `best ${category} `;
      
      if (category === 'exercise') {
        searchQuery += 'workout tutorial video ';
        
        if (intensity && isSpecific) {
          const intensityTerms: Record<string, string> = {
            low: 'low impact gentle beginner easy accessible ',
            moderate: 'moderate intensity intermediate regular ',
            high: 'high intensity advanced HIIT challenging '
          };
          searchQuery += intensityTerms[intensity] || '';
        }
        
        if (duration && isSpecific) {
          const durationTerms: Record<string, string> = {
            short: 'short 5-15 minute quick ',
            medium: 'medium 15-30 minute ',
            long: 'long 30-60 minute extended '
          };
          searchQuery += durationTerms[duration] || '';
        }
        
        // Add tags if provided
        if (tags.length > 0 && isSpecific) {
          // Define exercise categories for better searching
          const exerciseCategories: Record<string, string> = {
            'cardio': 'cardiovascular aerobic endurance heart rate ',
            'strength': 'strength training weights resistance muscle building ',
            'flexibility': 'stretching flexibility range of motion mobility ',
            'balance': 'balance stability core strength coordination ',
            'pilates': 'pilates core control precision movement ',
            'yoga': 'yoga poses stretching flexibility mind-body ',
            'hiit': 'high intensity interval training HIIT quick workout ',
            'senior': 'senior elderly older adult gentle safe exercise ',
            'beginner': 'beginner starter introductory basic simple ',
            'rehabilitation': 'rehabilitation recovery injury therapy ',
            'walking': 'walking strolling ambulatory step count ',
            'chair': 'chair seated sitting limited mobility ',
            'water': 'water aquatic swimming pool hydrotherapy ',
            'low impact': 'low impact gentle joint-friendly arthritis '
          };
          
          // Check if any tag matches our predefined categories
          let categoryFound = false;
          for (const tag of tags) {
            const tagLower = tag.toLowerCase();
            if (Object.prototype.hasOwnProperty.call(exerciseCategories, tagLower)) {
              searchQuery += exerciseCategories[tagLower];
              categoryFound = true;
            }
          }
          
          // Always include all tags in the search query
          searchQuery += tags.join(' ') + ' ';
          
          // Add quoted version of multi-word tags for exact matching
          tags.forEach(tag => {
            if (tag.includes(' ')) {
              searchQuery += `"${tag}" `;
            }
          });
        }
      } else if (category === 'wellness') {
        // Wellness search query
        searchQuery += 'health mindfulness meditation relaxation tutorial video ';
        
        if (tags.length > 0 && isSpecific) {
          // Process tag categories for wellness
          const wellnessCategories: Record<string, string> = {
            'meditation': 'guided meditation focus calm mindfulness ',
            'yoga': 'yoga flow stretch flexibility gentle movement ',
            'breathing': 'breathing techniques stress relief relaxation deep breathing ',
            'stress relief': 'stress relief anxiety reduction calming relaxation techniques ',
            'sleep': 'sleep improvement relaxation bedtime routine insomnia relief ',
            'mindfulness': 'mindfulness awareness present moment mental health ',
            'relaxation': 'relaxation techniques tension relief calm peaceful '
          };
          
          // Check if any tag matches our predefined categories
          let categoryFound = false;
          for (const tag of tags) {
            const tagLower = tag.toLowerCase();
            if (Object.prototype.hasOwnProperty.call(wellnessCategories, tagLower)) {
              searchQuery += wellnessCategories[tagLower];
              categoryFound = true;
            }
          }
          
          // If no specific category was found, use all tags
          if (!categoryFound) {
            searchQuery += tags.join(' ') + ' ';
          }
          
          // Add quoted version of multi-word tags for exact matching
          tags.forEach(tag => {
            if (tag.includes(' ')) {
              searchQuery += `"${tag}" `;
            }
          });
        }
        
        if (duration && isSpecific) {
          const durationTerms: Record<string, string> = {
            short: 'short 5-15 minute quick ',
            medium: 'medium 15-30 minute ',
            long: 'long 30-60 minute extended '
          };
          searchQuery += durationTerms[duration] || '';
        }
      }
      
      // Include age-appropriate terms if tags suggest it
      if (tags.length > 0 && isSpecific && 
         (tags.some(tag => tag.toLowerCase().includes('senior')) || 
          tags.some(tag => tag.toLowerCase().includes('elder')))) {
        searchQuery += ' seniors older adults ';
      }
      
      // Always add YouTube domain and tutorial focus
      searchQuery += 'site:youtube.com tutorial health fitness';
      
      return searchQuery;
    };

    // Start with a specific, filtered search query
    const specificQuery = constructSearchQuery(true);
    console.log(`Tavily ${category}/wellness video search query: ${specificQuery}`);
    
    // Call Tavily API with specific query
    console.log('Making Tavily API request with:', {
      query: specificQuery,
      search_depth: 'advanced',
      include_domains: ['youtube.com'],
      max_results: 25
    });

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: specificQuery,
      search_depth: 'advanced',
      include_answer: true,
      include_domains: ['youtube.com'],
      max_results: 25 // Request more results to filter afterwards
    }, {
      timeout: 20000 // 20 second timeout for reliability
    });
    
    console.log('Tavily API response status:', response.status);
    console.log('Tavily API response data structure:', {
      hasData: !!response.data,
      hasResults: !!response.data?.results,
      resultsCount: response.data?.results?.length || 0,
      firstResult: response.data?.results?.[0] ? {
        title: response.data.results[0].title,
        url: response.data.results[0].url,
        hasContent: !!response.data.results[0].content
      } : null
    });
    
    if (!response.data || !response.data.results) {
      console.error('Tavily API returned invalid data structure');
      return { query: specificQuery, videos: [], message: "No results found" };
    }
    
    // Filter and transform results
    console.log('Processing Tavily results:', response.data.results.length, 'total results');
    
    let videoResults = response.data.results
      .map((result: any, index: number): TavilySearchResult | null => {
        console.log(`Processing result ${index + 1}:`, {
          title: result.title,
          url: result.url,
          hasContent: !!result.content
        });
        
        // Extract YouTube video ID
        const videoId = extractYoutubeVideoId(result.url);
        console.log(`Video ID extracted for result ${index + 1}:`, videoId);
        
        // Skip results without a valid YouTube video ID
        if (!videoId) {
          console.log(`Skipping result ${index + 1} - no valid YouTube video ID`);
          return null;
        }
        
        const processedResult = {
          title: result.title || 'Untitled Video',
          url: result.url,
          content: result.content?.substring(0, 200) + '...' || 'No description available',
          description: result.content?.substring(0, 200) + '...' || 'No description available',
          image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          videoId: videoId,
          category: category,
          intensity: intensity || 'moderate',
          duration: duration || 'short',
          relevanceScore: 0.5 // Default score, will be adjusted
        };
        
        console.log(`Successfully processed result ${index + 1}:`, {
          title: processedResult.title,
          videoId: processedResult.videoId,
          url: processedResult.url
        });
        
        return processedResult;
      })
      .filter((result: TavilySearchResult | null): result is TavilySearchResult => result !== null);
    
    console.log(`Filtered results: ${videoResults.length} valid YouTube videos from ${response.data.results.length} total results`);
    
    console.log(`Found ${videoResults.length} initial ${category} videos`);
    
    // Calculate relevance scores based on tags
    if (tags.length > 0) {
      videoResults.forEach((result: TavilySearchResult) => {
        let score = 0.3; // Base score
        const titleLower = result.title.toLowerCase();
        const contentLower = result.content.toLowerCase();
        
        // Weight factors for different match types
        const TAG_IN_TITLE_WEIGHT = 0.35;
        const TAG_IN_CONTENT_WEIGHT = 0.15;
        const INTENSITY_MATCH_WEIGHT = 0.25;
        const DURATION_MATCH_WEIGHT = 0.2;
        const EXACT_MATCH_BONUS = 0.1;
        
        // Match tags with title and content
        for (const tag of tags) {
          const tagLower = tag.toLowerCase();
          
          // Check for tag match in title (higher weight)
          if (titleLower.includes(tagLower)) {
            score += TAG_IN_TITLE_WEIGHT;
            
            // Bonus for exact phrase matches in title
            if (titleLower.includes(` ${tagLower} `)) {
              score += EXACT_MATCH_BONUS;
            }
          }
          
          // Check for tag match in content (lower weight)
          if (contentLower.includes(tagLower)) {
            score += TAG_IN_CONTENT_WEIGHT;
          }
        }
        
        // Add intensity match bonus with more nuanced matching
        if (intensity) {
          const intensityLower = intensity.toLowerCase();
          // Direct match in title
          if (titleLower.includes(intensityLower)) {
            score += INTENSITY_MATCH_WEIGHT;
          } 
          // Match intensity synonyms
          else if (
            (intensityLower === 'low' && (titleLower.includes('gentle') || titleLower.includes('beginner') || titleLower.includes('easy'))) ||
            (intensityLower === 'moderate' && (titleLower.includes('intermediate') || titleLower.includes('medium'))) ||
            (intensityLower === 'high' && (titleLower.includes('advanced') || titleLower.includes('intense') || titleLower.includes('hiit')))
          ) {
            score += INTENSITY_MATCH_WEIGHT * 0.7; // 70% weight for synonym matches
          }
          // Check content for intensity mention
          else if (contentLower.includes(intensityLower)) {
            score += INTENSITY_MATCH_WEIGHT * 0.5; // 50% weight for content matches
          }
        }
        
        // Add duration match bonus with more nuanced matching
        if (duration) {
          const durationLower = duration.toLowerCase();
          // Check for direct matches in title
          if (titleLower.includes(durationLower)) {
            score += DURATION_MATCH_WEIGHT;
          }
          // Match duration synonyms or minute ranges
          else if (
            (durationLower === 'short' && (titleLower.includes('quick') || titleLower.includes('5 min') || titleLower.includes('10 min'))) ||
            (durationLower === 'medium' && (titleLower.includes('15 min') || titleLower.includes('20 min') || titleLower.includes('25 min'))) ||
            (durationLower === 'long' && (titleLower.includes('30 min') || titleLower.includes('40 min') || titleLower.includes('45 min')))
          ) {
            score += DURATION_MATCH_WEIGHT * 0.7; // 70% weight for synonym matches
          }
          // Check content for duration mention
          else if (contentLower.includes(durationLower)) {
            score += DURATION_MATCH_WEIGHT * 0.5; // 50% weight for content matches
          }
        }
        
        // Ensure score is between 0 and 1
        result.relevanceScore = Math.min(1, Math.max(0, score));
      });
    }
    
    // Sort by relevance score
    videoResults.sort((a: TavilySearchResult, b: TavilySearchResult) => 
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
    
    // If we don't have enough results, try a broader search
    let combinedResults = [...videoResults];
    let message = '';
    let answer = response.data.answer;
    
    if (videoResults.length < 10) {
      try {
        console.log(`Only found ${videoResults.length} valid results, fewer than the 10 requested. Trying broader search...`);
        
        // Create a broader query without specific filters
        const broaderQuery = constructSearchQuery(false);
        console.log(`Tavily ${category}/wellness broader video search query: ${broaderQuery}`);
        
        // Call Tavily API with broader query
        const broaderResponse = await axios.post('https://api.tavily.com/search', {
          api_key: process.env.TAVILY_API_KEY,
          query: broaderQuery,
          search_depth: 'advanced',
          include_answer: true,
          include_domains: ['youtube.com'],
          max_results: 30 // Request more to ensure we get enough after filtering
        }, {
          timeout: 20000
        });
        
        // Process broader results
        const broaderResults = broaderResponse.data.results
          .map((result: any): TavilySearchResult | null => {
            const videoId = extractYoutubeVideoId(result.url);
            if (!videoId) return null;
            
            return {
              title: result.title || 'Untitled Video',
              url: result.url,
              content: result.content?.substring(0, 200) + '...' || 'No description available',
              description: result.content?.substring(0, 200) + '...' || 'No description available',
              image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              videoId: videoId,
              category: category,
              intensity: intensity || 'moderate',
              duration: duration || 'short',
              relevanceScore: 0.3 // Lower default score for broader results
            };
          })
          .filter((result: TavilySearchResult | null): result is TavilySearchResult => result !== null);
        
        console.log(`Found ${broaderResults.length} additional ${category} videos from broader search`);
        
        // Apply minimal relevance scoring to broader results
        if (tags.length > 0) {
          broaderResults.forEach((result: TavilySearchResult) => {
            let score = 0.3; // Base score for broader results
            const titleLower = result.title.toLowerCase();
            const contentLower = result.content.toLowerCase();
            
            // Simple tag matching for broad results (worth less)
            for (const tag of tags) {
              const tagLower = tag.toLowerCase();
              if (titleLower.includes(tagLower)) {
                score += 0.15; // Less than specific search
              }
              if (contentLower.includes(tagLower)) {
                score += 0.05; // Less than specific search
              }
            }
            
            // Simple intensity and duration matching
            if (intensity && titleLower.includes(intensity.toLowerCase())) {
              score += 0.15;
            }
            if (duration && titleLower.includes(duration.toLowerCase())) {
              score += 0.15;
            }
            
            // Assign final score
            result.relevanceScore = Math.min(0.8, score); // Cap at 0.8 to prioritize specific results
          });
        }
        
        // Filter out duplicates from broader results
        const existingVideoIds = new Set(combinedResults.map((r: TavilySearchResult) => r.videoId));
        const uniqueBroaderResults = broaderResults.filter((r: TavilySearchResult) => !existingVideoIds.has(r.videoId));
        
        console.log(`Found ${uniqueBroaderResults.length} unique additional videos`);
        
        // Combine results
        combinedResults = [...combinedResults, ...uniqueBroaderResults];
        
        // If we have an answer from the broader search and none from the specific search
        if (broaderResponse.data.answer && !answer) {
          answer = broaderResponse.data.answer;
        }
        
        // If still not enough results, try an even broader search as last resort
        if (combinedResults.length < 10) {
          try {
            console.log(`Still only have ${combinedResults.length} results after broader search. Trying final fallback search...`);
            
            // Create the most general query possible for this category
            const fallbackQuery = category === 'exercise' ? 
              'best exercise workout videos for beginners to advanced' : 
              'best wellness mindfulness relaxation videos';
              
            console.log(`Tavily ${category} fallback search query: ${fallbackQuery}`);
            
            // Call Tavily API with fallback query
            const fallbackResponse = await axios.post('https://api.tavily.com/search', {
              api_key: process.env.TAVILY_API_KEY,
              query: fallbackQuery,
              search_depth: 'advanced',
              include_domains: ['youtube.com'],
              max_results: 20
            }, {
              timeout: 15000
            });
            
            // Process fallback results
            if (fallbackResponse.data?.results) {
              const fallbackResults = fallbackResponse.data.results
                .map((result: any): TavilySearchResult | null => {
                  const videoId = extractYoutubeVideoId(result.url);
                  if (!videoId) return null;
                  
                  return {
                    title: result.title || 'Untitled Video',
                    url: result.url,
                    content: result.content?.substring(0, 200) + '...' || 'No description available',
                    description: result.content?.substring(0, 200) + '...' || 'No description available',
                    image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                    videoId: videoId,
                    category: category,
                    intensity: intensity || 'moderate',
                    duration: duration || 'short',
                    relevanceScore: 0.2 // Lowest priority for fallback results
                  };
                })
                .filter((result: TavilySearchResult | null): result is TavilySearchResult => result !== null);
              
              // Filter out any duplicates
              const updatedVideoIds = new Set(combinedResults.map((r: TavilySearchResult) => r.videoId));
              const uniqueFallbackResults = fallbackResults.filter((r: TavilySearchResult) => !updatedVideoIds.has(r.videoId));
              
              console.log(`Found ${uniqueFallbackResults.length} additional videos from fallback search`);
              
              // Add fallback results
              combinedResults = [...combinedResults, ...uniqueFallbackResults];
              
              message = "Few specific matches found. Showing some general results too.";
            }
          } catch (fallbackError) {
            console.error(`Error in fallback search:`, fallbackError);
            // Continue with what we have
          }
        }
      } catch (broadError) {
        console.error(`Error in broader search:`, broadError);
        // Continue with original results if broader search fails
      }
    }
    
    // Final sorting by relevance
    combinedResults.sort((a: TavilySearchResult, b: TavilySearchResult) => 
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
    
    // Limit to maximum 10 results
    const finalResults = combinedResults.slice(0, 10);
    
    console.log(`Selected ${finalResults.length} best ${category} videos after combining results`);
    
    // Check if we had to use fallback search (based on relevance scores)
    const hasFallbackResults = finalResults.some(r => r.relevanceScore !== undefined && r.relevanceScore <= 0.3);
    
    // Return search results with appropriate status message
    if (finalResults.length < 10) {
      message = `Found ${finalResults.length} videos matching your criteria. For more results, try broadening your search or using different tags.`;
    } else if (hasFallbackResults && !message) {
      message = `Found ${finalResults.length} videos, including some general recommendations that may not match all criteria perfectly.`;
    } else if (!message) {
      message = `Found ${finalResults.length} videos matching your criteria.`;
    }
    
    // Enhance results with OpenAI analysis for intelligent filtering
    try {
      const enhancedVideos = await enhanceExerciseSearchResults(
        finalResults,
        { category, intensity, duration, tags }
      );

      // Convert enhanced results back to the expected format
      const finalEnhancedResults = enhancedVideos.map(enhanced => ({
        ...enhanced,
        description: enhanced.content,
        thumbnail_url: enhanced.image,
        source_name: 'YouTube'
      }));

      return {
        videos: finalEnhancedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
        query: specificQuery,
        answer: answer,
        message
      };
    } catch (enhancementError) {
      console.warn('OpenAI enhancement failed, returning original results:', enhancementError);
      return {
        videos: finalResults,
        query: specificQuery,
        answer: answer,
        message
      };
    }

  } catch (error) {
    console.error(`Error searching ${category} videos with Tavily:`, error);
    return { query: `${category} videos`, videos: [], message: "Search error" };
  }
}

export default {
  searchHealthContent,
  searchRecipes,
  searchCookingVideos,
  searchExerciseWellnessVideos,
  saveUserFavorite,
  removeUserFavorite
};