import { enhanceSearchResults, Provider } from '../lib/search';

// Type for search response
export interface SearchResponse {
  results: Provider[];
  radiusExpanded?: boolean;
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
   * Search for fitness facilities
   */
  public async searchFitnessFacilities(
    location: string,
    type: string = '',
    postcode: string = '',
    useLocalSearch: boolean = true,
    minResults: number = 5
  ): Promise<SearchResponse> {
    try {
      console.log(`SearchService: Searching for fitness facilities near ${location}`);
      
      // Initial search with provided parameters
      let providers = await enhanceSearchResults(
        location,
        type || 'gym fitness center',
        postcode,
        this.initialProviders
      );
      
      let radiusExpanded = false;
      
      // If we don't have enough results, expand the search radius
      if (providers.length < minResults) {
        console.log(`Initial search returned only ${providers.length} results, expanding search radius...`);
        radiusExpanded = true;
        
        // Try with a wider area search
        const expandedLocation = `${location} wider area`;
        const additionalProviders = await enhanceSearchResults(
          expandedLocation,
          type || 'gym fitness center',
          postcode,
          providers // Pass current providers to enhance
        );
        
        // Use the expanded results if they contain more providers
        if (additionalProviders.length > providers.length) {
          providers = additionalProviders;
        }
      }
      
      return {
        results: providers.slice(0, Math.max(minResults, providers.length)),
        radiusExpanded
      };
    } catch (error) {
      console.error('Error searching for fitness facilities:', error);
      return { results: [] };
    }
  }
  
  /**
   * Search for personal trainers
   */
  public async searchPersonalTrainers(
    location: string,
    specialization: string = '',
    postcode: string = '',
    useLocalSearch: boolean = true,
    minResults: number = 5
  ): Promise<SearchResponse> {
    try {
      console.log(`SearchService: Searching for personal trainers near ${location}`);
      
      // Build type string based on specialization
      const typeString = specialization 
        ? `personal trainer ${specialization}` 
        : 'personal trainer';
      
      // Initial search with provided parameters
      let providers = await enhanceSearchResults(
        location,
        typeString,
        postcode,
        this.initialProviders
      );
      
      let radiusExpanded = false;
      
      // If we don't have enough results, expand the search radius
      if (providers.length < minResults) {
        console.log(`Initial search returned only ${providers.length} results, expanding search radius...`);
        radiusExpanded = true;
        
        // Try with a wider area search
        const expandedLocation = `${location} wider area`;
        const additionalProviders = await enhanceSearchResults(
          expandedLocation,
          typeString,
          postcode,
          providers // Pass current providers to enhance
        );
        
        // Use the expanded results if they contain more providers
        if (additionalProviders.length > providers.length) {
          providers = additionalProviders;
        }
      }
      
      return {
        results: providers
          .filter(p => p.type.toLowerCase().includes('trainer') || p.type === 'Personal Trainer')
          .slice(0, Math.max(minResults, providers.length)),
        radiusExpanded
      };
    } catch (error) {
      console.error('Error searching for personal trainers:', error);
      return { results: [] };
    }
  }
}

export default SearchService.getInstance();