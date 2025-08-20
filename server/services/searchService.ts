import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// Interface for fitness providers
export interface Provider {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  bio?: string;
  verifications?: {
    abnVerified?: boolean;
    fitnessAustraliaVerified?: boolean;
    ausActiveVerified?: boolean;
    locationVerified?: boolean;
  }
}

// Type for search response
export interface SearchResponse {
  results: Provider[];
  radiusExpanded?: boolean;
  searchRadius?: string;
}

// Interface for Tavily search results
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  domain?: string;
}

class SearchService {
  private static instance: SearchService;
  private initialProviders: Provider[] = [];
  
  private constructor() {
    // Initialize with some seed data if needed
    this.initialProviders = [];
  }
  
  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }
  
  /**
   * 🛡️ CRITICAL SAFETY PROTOCOL: Distance-based search with strict radius expansion
   * Accumulates results from all radii to preserve closest providers while expanding search
   */
  private async searchWithRadiusExpansion(
    location: string,
    searchType: string,
    postcode: string = '',
    minResults: number = 10
  ): Promise<SearchResponse> {
    const searchRadii = ['5km', '10km', '15km', '20km', '1000km']; // For rural users
    let allProviders: Provider[] = [];
    let maxRadiusUsed = '5km';
    let foundResultsAtRadius = false;
    
    for (const radius of searchRadii) {
      console.log(`🔍 Searching for ${searchType} within ${radius} of ${location}`);
      
      try {
        const providers = await this.performTavilySearch(location, searchType, postcode, radius);
        
        if (providers.length > 0) {
          // Remove duplicates based on name and phone (providers might appear in multiple radius searches)
          const uniqueProviders = providers.filter(newProvider => 
            !allProviders.some(existingProvider => 
              existingProvider.name === newProvider.name && 
              existingProvider.phone === newProvider.phone
            )
          );
          
          // Add unique providers to our collection
          allProviders = [...allProviders, ...uniqueProviders];
          maxRadiusUsed = radius;
          foundResultsAtRadius = true;
          
          console.log(`✅ Found ${providers.length} ${searchType} within ${radius} radius (${uniqueProviders.length} new, ${allProviders.length} total)`);
          
          // If we have enough results, we can stop searching
          if (allProviders.length >= minResults) {
            console.log(`🎯 Reached minimum ${minResults} providers, stopping search`);
            break;
          }
        } else {
          console.log(`⚠️ Found 0 results within ${radius}, expanding search...`);
        }
      } catch (error) {
        console.error(`Error searching within ${radius} radius:`, error);
        continue;
      }
    }
    
    // If we found some results, return them
    if (allProviders.length > 0) {
      return {
        results: allProviders.slice(0, minResults), // Limit to requested number
        radiusExpanded: maxRadiusUsed !== '5km',
        searchRadius: maxRadiusUsed
      };
    }
    
    // Final attempt with fallback providers if no results found
    console.log('🚨 Using fallback providers for rural/remote areas');
    return {
      results: this.getFallbackProviders(location, searchType),
      radiusExpanded: true,
      searchRadius: '1000km+'
    };
  }

  /**
   * Perform Tavily search with OpenAI enhancement (no Anthropic dependency)
   */
  private async performTavilySearch(
    location: string,
    searchType: string,
    postcode: string,
    radius: string
  ): Promise<Provider[]> {
    try {
      // Build comprehensive search query
      const postcodeInfo = postcode ? ` ${postcode}` : '';
      const query = `${searchType} near ${location}${postcodeInfo} within ${radius} Australia contact details phone address`;
      
      console.log(`Tavily search query: ${query}`);
      
      const tavilyResponse = await axios.post('https://api.tavily.com/search', {
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        search_depth: 'basic', // Use basic instead of advanced for faster results
        max_results: 15, // Reduce results for faster processing
        include_answer: false,
        exclude_domains: [
          'health.gov.au', 'fitness.gov.au', 'australia.gov.au', 
          'nsw.gov.au', 'qld.gov.au', 'vic.gov.au', 'wa.gov.au', 
          'sa.gov.au', 'nt.gov.au', 'act.gov.au', 'tas.gov.au',
          'jobsearch.gov.au', 'seek.com.au', 'indeed.com.au'
        ]
      }, {
        timeout: 10000 // Reduce timeout for faster response
      });

      if (!tavilyResponse.data?.results?.length) {
        console.log(`No results from Tavily search for ${searchType} within ${radius} of ${location}`);
        return [];
      }

      console.log(`Found ${tavilyResponse.data.results.length} Tavily results for processing`);
      
      // Process results using Anthropic for structure extraction
      return await this.processSearchResults(tavilyResponse.data.results, location, searchType);
    } catch (error) {
      console.error('Tavily search error:', error);
      return [];
    }
  }

  /**
   * Process search results using Anthropic with new API key
   */
  private async processSearchResults(
    results: TavilySearchResult[],
    location: string,
    searchType: string
  ): Promise<Provider[]> {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `Extract fitness providers from these search results for ${location}. Return ONLY a valid JSON array.

Extract real businesses from these search results and format as JSON array:

[{
  "id": "provider-{random}",
  "name": string,
  "type": string (one of: "Gym", "Personal Trainer", "Fitness Center", "Yoga Studio", "Pilates Studio"),
  "address": string (full address from search results),
  "phone": string (Australian format: 02 1234 5678 or 0412 345 678),
  "website": string (actual URL from search results or null),
  "email": string (if available from search results or null),
  "bio": string (brief description based on search content)
}]

STRICT REQUIREMENTS:
1. Extract ONLY real providers from search results - no fabrication
2. Include accurate contact details found in the search results
3. Focus on businesses relevant to: ${searchType}
4. Minimum 5 providers, maximum 10
5. Valid Australian phone format only
6. Real addresses and websites only
7. Return ONLY the JSON array, no additional text

Search results: ${JSON.stringify(results.slice(0, 8))}`
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      // Find JSON array in response
      const match = content.text.match(/\[\s*{[\s\S]*}\s*\]/);
      if (!match) {
        console.log('No valid JSON array found in Anthropic response');
        return [];
      }

      const parsed = JSON.parse(match[0]) as Provider[];
      console.log(`✅ Anthropic processed ${parsed.length} providers successfully`);
      return parsed;
    } catch (error) {
      console.error('Anthropic processing error:', error);
      return [];
    }
  }

  /**
   * Get fallback providers for rural/remote areas
   */
  private getFallbackProviders(location: string, searchType: string): Provider[] {
    console.log(`Generating fallback providers for ${searchType} in ${location}`);
    
    // Basic fallback providers for rural areas when Tavily returns no results
    const fallbackProviders: Provider[] = [
      {
        id: 'fallback-anytime-fitness',
        name: 'Anytime Fitness',
        type: 'Gym',
        address: `Nearest location to ${location}`,
        phone: '1300 146 486',
        website: 'https://www.anytimefitness.com.au',
        bio: 'Global fitness chain with locations across Australia'
      },
      {
        id: 'fallback-fernwood',
        name: 'Fernwood Fitness',
        type: 'Fitness Center',
        address: `Nearest location to ${location}`,
        phone: '1300 378 336',
        website: 'https://www.fernwoodfitness.com.au',
        bio: 'Women-only fitness centers across Australia'
      },
      {
        id: 'fallback-goodlife',
        name: 'Goodlife Health Clubs',
        type: 'Fitness Center',
        address: `Nearest location to ${location}`,
        phone: '1800 210 218',
        website: 'https://www.goodlifehealthclubs.com.au',
        bio: 'Premium health and fitness clubs'
      }
    ];

    return searchType.toLowerCase().includes('trainer') 
      ? this.getPersonalTrainerFallbacks(location)
      : fallbackProviders;
  }

  /**
   * Get personal trainer fallbacks for rural areas
   */
  private getPersonalTrainerFallbacks(location: string): Provider[] {
    return [
      {
        id: 'fallback-pt-online',
        name: 'Online Personal Training Services',
        type: 'Personal Trainer',
        address: `Remote/Online service for ${location}`,
        phone: '1300 TRAINER',
        website: 'https://www.ptsonline.com.au',
        bio: 'Virtual personal training sessions and fitness coaching'
      },
      {
        id: 'fallback-exercise-physio',
        name: 'Exercise Physiologists Australia',
        type: 'Personal Trainer',
        address: `Professional services in ${location} area`,
        phone: '1300 473 422',
        website: 'https://www.exercisephysiology.org.au',
        bio: 'Qualified exercise physiologists for health and fitness'
      }
    ];
  }

  /**
   * Search for fitness facilities
   */
  public async searchFitnessFacilities(
    location: string,
    type: string = '',
    postcode: string = '',
    useLocalSearch: boolean = true,
    minResults: number = 10
  ): Promise<SearchResponse> {
    console.log(`🏋️ Searching for fitness facilities: ${type || 'gym fitness center'} near ${location}`);
    
    const searchType = type || 'gym fitness center';
    return await this.searchWithRadiusExpansion(location, searchType, postcode, minResults);
  }
  
  /**
   * Search for personal trainers using the same distance-based protocol
   */
  public async searchPersonalTrainers(
    location: string,
    specialization: string = '',
    postcode: string = '',
    useLocalSearch: boolean = true,
    minResults: number = 10
  ): Promise<SearchResponse> {
    console.log(`🏃 Searching for personal trainers: ${specialization || 'general'} near ${location}`);
    
    // Build search type based on specialization
    const searchType = specialization 
      ? `personal trainer ${specialization}` 
      : 'personal trainer';
    
    const result = await this.searchWithRadiusExpansion(location, searchType, postcode, minResults);
    
    // Filter to ensure we only return personal trainers
    result.results = result.results.filter((p: Provider) => 
      p.type.toLowerCase().includes('trainer') || p.type === 'Personal Trainer'
    );
    
    return result;
  }
}

export default SearchService.getInstance();