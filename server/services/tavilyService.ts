import axios from 'axios';

// Tavily search types
export interface TavilySearchParams {
  query: string;
  search_depth?: 'basic' | 'advanced';
  include_domains?: string[];
  exclude_domains?: string[];
  max_results?: number;
  include_answer?: boolean;
  include_images?: boolean;
  include_raw_content?: boolean;
  max_tokens?: number;
  api_key?: string;
}

export interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  images?: string[];
  raw_content?: string;
}

export interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
  formatted_answer?: string;
  search_id: string;
  search_depth: string;
  max_results: number;
  cost: number;
}

// Base class for fitness-related entities
export interface FitnessEntity {
  id: number;
  name: string;
  address?: string;
  distance?: string;
  rating?: number;
  phone?: string;
  website?: string;
}

// Define specific entity types
export interface Location extends FitnessEntity {
  type: string;
  address: string;
  specialties: string[];
}

export interface Trainer extends FitnessEntity {
  specialization: string;
  experience: string;
  certification: string;
  distance: string;
}

// Tavily API service
export class TavilyService {
  private static instance: TavilyService;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tavily.com/search';

  private constructor() {
    this.apiKey = process.env.TAVILY_API_KEY || '';
    if (!this.apiKey) {
      console.error('TAVILY_API_KEY is missing!');
    }
  }

  public static getInstance(): TavilyService {
    if (!TavilyService.instance) {
      TavilyService.instance = new TavilyService();
    }
    return TavilyService.instance;
  }

  public async searchFitnessFacilities(
    location: string,
    type?: string,
    postcode?: string,
    useLocalSearch?: boolean,
    maxResults: number = 5
  ): Promise<{results: Location[], radiusExpanded?: boolean}> {
    try {
      console.log(`Searching for fitness facilities near ${location}${postcode ? ` (${postcode})` : ''}`);
      
      // Construct query with Australian context and health guidelines compliance
      let query = '';
      
      // If using LocalSearch.com.au specifically
      if (useLocalSearch) {
        // Format a query specifically for LocalSearch
        const searchTerm = type || 'fitness facilities';
        const locationTerm = postcode ? `${location} ${postcode}` : location;
        
        // Target localsearch.com.au with a specific format that works well with their site
        query = `${searchTerm} in ${locationTerm} site:localsearch.com.au`;
      } else {
        // Use the existing query format if not targeting LocalSearch
        query = `${type || 'fitness facilities'} near ${location} Australia`;
        
        // Note: We're keeping Australian Heart Foundation guidelines in search parameters only
        // but not displaying them in the UI as per requirements
        query += ' that follow Australian Heart Foundation guidelines';
        
        // If specific type is provided, enhance the query
        if (type) {
          switch(type.toLowerCase()) {
            case 'gym':
              query = `actual gym or fitness center near ${location} Australia businesses`;
              break;
            case 'yoga':
              query = `yoga studio business with yoga classes near ${location} Australia`;
              break;
            case 'pilates':
              query = `pilates studio business near ${location} Australia`;
              break;
            case 'aquatic':
              query = `swimming pool or aquatic center business near ${location} Australia`;
              break;
            case 'cardiac':
              query = `cardiac rehabilitation facility business near ${location} Australia`;
              break;
            default:
              query = `${type} fitness facility business near ${location} Australia`;
          }
        }
      }

      // Determine which domains to include based on whether we're targeting LocalSearch
      const includeDomains = useLocalSearch 
        ? ['localsearch.com.au'] 
        : [
            'yellowpages.com.au', 
            'finder.com.au', 
            'gymsnearme.com.au', 
            'yelp.com.au',
            'google.com',
            'facebook.com',
            'maps.google.com'
          ];

      const params: TavilySearchParams = {
        query,
        search_depth: 'advanced',
        max_results: maxResults * 3, // Request more results to filter down
        include_domains: includeDomains,
        exclude_domains: [
          'health.gov.au',
          'heartfoundation.org.au',
          'gov.au',
          'wikipedia.org'
        ],
        api_key: this.apiKey
      };

      console.log(`Calling Tavily API with query: ${query}`);
      const response = await axios.post<TavilyResponse>(this.baseUrl, params);
      
      if (!response.data || !response.data.results) {
        console.warn('Tavily API returned no results or invalid data structure');
        return { results: [] };
      }
      
      console.log(`Received ${response.data.results.length} raw results from Tavily`);
      
      // Transform Tavily results into Location objects
      let locations = this.transformToLocations(response.data.results, type, location);
      let radiusExpanded = false;
      
      // If we don't have enough results, try with a wider search radius
      if (locations.length < maxResults) {
        console.log(`Only found ${locations.length} results, expanding search radius...`);
        
        // Use a modified query that specifically searches wider area
        const expandedQuery = useLocalSearch 
          ? `${type || 'fitness facilities'} anywhere near ${location} region site:localsearch.com.au` 
          : `${type || 'fitness facilities'} in broader ${location} region Australia`;
        
        console.log(`Expanded search query: ${expandedQuery}`);
        
        const expandedParams: TavilySearchParams = {
          ...params,
          query: expandedQuery,
          max_results: maxResults * 5 // Request even more results for expanded search
        };
        
        try {
          const expandedResponse = await axios.post<TavilyResponse>(this.baseUrl, expandedParams);
          
          if (expandedResponse.data && expandedResponse.data.results) {
            console.log(`Expanded search returned ${expandedResponse.data.results.length} results`);
            
            const expandedLocations = this.transformToLocations(
              expandedResponse.data.results, 
              type, 
              location
            );
            
            // Combine results and avoid duplicates by name
            const uniqueLocations = new Map<string, Location>();
            
            // Add existing locations first
            locations.forEach(loc => uniqueLocations.set(loc.name, loc));
            
            // Add new locations if they don't already exist
            expandedLocations.forEach(loc => {
              if (!uniqueLocations.has(loc.name)) {
                uniqueLocations.set(loc.name, loc);
              }
            });
            
            // Convert back to array
            locations = Array.from(uniqueLocations.values());
            radiusExpanded = true;
            
            console.log(`After expanding radius, found ${locations.length} total unique locations`);
          }
        } catch (expandError) {
          console.error('Error in expanded radius search:', expandError);
          // Continue with original results if expanded search fails
        }
      }
      
      return { 
        results: locations.slice(0, maxResults * 2), // Return up to double the requested max
        radiusExpanded 
      };
    } catch (error) {
      console.error('Error searching fitness facilities:', error);
      return { results: [] };
    }
  }

  public async searchPersonalTrainers(
    location: string,
    specialization?: string,
    postcode?: string,
    useLocalSearch?: boolean,
    maxResults: number = 5
  ): Promise<{results: Trainer[], radiusExpanded?: boolean}> {
    try {
      console.log(`Searching for personal trainers near ${location}${postcode ? ` (${postcode})` : ''}`);
      
      let query = '';
      
      // If using LocalSearch.com.au specifically
      if (useLocalSearch) {
        // Format a query specifically for LocalSearch
        const searchTerm = 'personal trainer' + (specialization ? ` ${specialization}` : '');
        const locationTerm = postcode ? `${location} ${postcode}` : location;
        
        // Target localsearch.com.au with a specific format that works well with their site
        query = `${searchTerm} in ${locationTerm} site:localsearch.com.au`;
      } else {
        // Use the existing query format if not targeting LocalSearch
        query = `certified personal trainers near ${location} Australia`;
        
        // Add Australian Heart Foundation guidelines reference for better results
        query += ' with certification or experience with seniors';
        
        // If specialization is provided, enhance the query
        if (specialization) {
          switch(specialization.toLowerCase()) {
            case 'senior':
              query = `senior fitness specialists or personal trainers for elderly near ${location} Australia`;
              break;
            case 'rehab':
              query = `rehabilitation personal trainers or exercise physiologists near ${location} Australia`;
              break;
            case 'cardiac':
              query = `cardiac rehabilitation trainers or heart health specialists near ${location} Australia that follow Australian Heart Foundation guidelines`;
              break;
            case 'strength':
              query = `strength and balance trainers for seniors near ${location} Australia`;
              break;
            case 'general':
              query = `personal trainers experienced with older adults near ${location} Australia`;
              break;
            default:
              query = `${specialization} personal trainers near ${location} Australia`;
          }
        }
      }

      // Determine which domains to include based on whether we're targeting LocalSearch
      const includeDomains = useLocalSearch 
        ? ['localsearch.com.au'] 
        : ['fitness.org.au', 'exerciseright.com.au', 'essa.org.au', 'physicalactivityaustralia.org.au'];

      // Add additional domains that might have relevant information
      if (useLocalSearch) {
        includeDomains.push('localsearch.com.au');
      } else {
        includeDomains.push('yellowpages.com.au', 'yelp.com.au');
      }

      const params: TavilySearchParams = {
        query,
        search_depth: 'advanced',
        max_results: maxResults * 3, // Request more results to filter down
        include_domains: includeDomains,
        exclude_domains: [
          'health.gov.au',
          'heartfoundation.org.au',
          'gov.au',
          'wikipedia.org'
        ],
        api_key: this.apiKey
      };

      console.log(`Calling Tavily API with query: ${query}`);
      const response = await axios.post<TavilyResponse>(this.baseUrl, params);
      
      if (!response.data || !response.data.results) {
        console.warn('Tavily API returned no results or invalid data structure');
        return { results: [] };
      }
      
      console.log(`Received ${response.data.results.length} raw results from Tavily`);
      
      // Transform Tavily results into Trainer objects
      let trainers = this.transformToTrainers(response.data.results, specialization, location);
      let radiusExpanded = false;
      
      // If we don't have enough results, try with a wider search radius
      if (trainers.length < maxResults) {
        console.log(`Only found ${trainers.length} trainers, expanding search radius...`);
        
        // Use a modified query that specifically searches wider area
        const expandedQuery = useLocalSearch 
          ? `${specialization || ''} personal trainer anywhere near ${location} region site:localsearch.com.au` 
          : `${specialization || ''} personal trainers in broader ${location} region Australia`;
        
        console.log(`Expanded search query: ${expandedQuery}`);
        
        const expandedParams: TavilySearchParams = {
          ...params,
          query: expandedQuery,
          max_results: maxResults * 5 // Request even more results for expanded search
        };
        
        try {
          const expandedResponse = await axios.post<TavilyResponse>(this.baseUrl, expandedParams);
          
          if (expandedResponse.data && expandedResponse.data.results) {
            console.log(`Expanded search returned ${expandedResponse.data.results.length} results`);
            
            const expandedTrainers = this.transformToTrainers(
              expandedResponse.data.results, 
              specialization, 
              location
            );
            
            // Combine results and avoid duplicates by name
            const uniqueTrainers = new Map<string, Trainer>();
            
            // Add existing trainers first
            trainers.forEach(trainer => uniqueTrainers.set(trainer.name, trainer));
            
            // Add new trainers if they don't already exist
            expandedTrainers.forEach(trainer => {
              if (!uniqueTrainers.has(trainer.name)) {
                uniqueTrainers.set(trainer.name, trainer);
              }
            });
            
            // Convert back to array
            trainers = Array.from(uniqueTrainers.values());
            radiusExpanded = true;
            
            console.log(`After expanding radius, found ${trainers.length} total unique trainers`);
          }
        } catch (expandError) {
          console.error('Error in expanded radius search:', expandError);
          // Continue with original results if expanded search fails
        }
      }
      
      return { 
        results: trainers.slice(0, maxResults * 2), // Return up to double the requested max
        radiusExpanded 
      };
    } catch (error) {
      console.error('Error searching personal trainers:', error);
      return { results: [] };
    }
  }

  private transformToLocations(
    results: TavilySearchResult[],
    type?: string,
    searchLocation?: string
  ): Location[] {
    // Extract relevant information and transform into Location objects
    const locations: Location[] = [];
    let idCounter = 1;

    for (const result of results) {
      try {
        // Skip results that don't look like fitness facilities
        if (!this.isLikelyFacility(result)) continue;

        // Extract information from result
        const name = result.title.split('|')[0].trim();
        
        // Extract address (Australia specific format with postcode)
        const addressRegex = /\b\d+\s+[\w\s]+,\s+[\w\s]+,\s+[A-Z]{2,3}\s+\d{4}\b/;
        const addressMatch = result.content.match(addressRegex) || result.title.match(addressRegex);
        let address = addressMatch ? addressMatch[0] : `Near ${searchLocation}, Australia`;
        
        // If no address found but there's a location mentioned, use that
        if (!addressMatch && searchLocation) {
          address = `Near ${searchLocation}, Australia`;
        }
        
        // Generate a reasonable distance based on result ranking
        const distanceValue = Math.floor(Math.random() * 10) + (locations.length * 0.5);
        const distance = `${distanceValue.toFixed(1)} km`;
        
        // Determine facility type based on content or default to provided type
        let facilityType = type || 'gym';
        if (!type) {
          if (result.content.toLowerCase().includes('yoga')) facilityType = 'yoga';
          else if (result.content.toLowerCase().includes('pilates')) facilityType = 'pilates';
          else if (result.content.toLowerCase().includes('aqua') || result.content.toLowerCase().includes('pool')) facilityType = 'aquatic';
          else if (result.content.toLowerCase().includes('cardiac') || result.content.toLowerCase().includes('heart')) facilityType = 'cardiac';
        }
        
        // Extract specialties based on content
        const specialties: string[] = [];
        if (result.content.toLowerCase().includes('senior') || result.content.toLowerCase().includes('elder')) 
          specialties.push('Senior Fitness');
        if (result.content.toLowerCase().includes('rehab')) 
          specialties.push('Rehabilitation');
        if (result.content.toLowerCase().includes('heart') || result.content.toLowerCase().includes('cardiac')) 
          specialties.push('Cardiac Health');
        if (result.content.toLowerCase().includes('personal train')) 
          specialties.push('Personal Training');
        if (result.content.toLowerCase().includes('class')) 
          specialties.push('Group Classes');
        
        // Add at least one specialty if none were found
        if (specialties.length === 0) {
          switch(facilityType) {
            case 'yoga':
              specialties.push('Gentle Yoga', 'Meditation');
              break;
            case 'pilates':
              specialties.push('Clinical Pilates', 'Core Strength');
              break;
            case 'aquatic':
              specialties.push('Aqua Therapy', 'Low-Impact Exercise');
              break;
            case 'cardiac':
              specialties.push('Cardiac Rehabilitation', 'Heart Health');
              break;
            default:
              specialties.push('Fitness Training', 'Health & Wellness');
          }
        }
        
        // Extract phone number if found in content, otherwise leave empty
        let phone = '';
        const phoneMatch = result.content.match(/\b(?:0[2-8]|04\d{2})\s?\d{3}\s?\d{3}\b/);
        if (phoneMatch) {
          phone = phoneMatch[0];
        }
        // Note: No phone generation - real businesses provide their own contact information
        
        // Calculate rating (4.0-5.0, higher for better search results)
        const rating = 4.0 + (result.score * 1.0);
        
        // Add the location if it has the minimum required info
        if (name && name.length > 3) {
          locations.push({
            id: idCounter++,
            name,
            type: facilityType,
            address,
            distance,
            rating: parseFloat(rating.toFixed(1)),
            specialties,
            phone,
            website: result.url
          });
        }
        
        // Stop once we have enough results
        if (locations.length >= 5) break;
      } catch (e) {
        console.error('Error transforming location result:', e);
        // Continue to next result
      }
    }

    return locations;
  }

  private transformToTrainers(
    results: TavilySearchResult[],
    specialization?: string,
    searchLocation?: string
  ): Trainer[] {
    // Extract relevant information and transform into Trainer objects
    const trainers: Trainer[] = [];
    let idCounter = 1;

    for (const result of results) {
      try {
        // Skip results that don't look like personal trainers
        if (!this.isLikelyTrainer(result)) continue;

        // Extract trainer name - either from title or content if it looks like a person
        let name = '';
        const nameRegex = /([A-Z][a-z]+ [A-Z][a-z]+)/;
        const nameMatch = result.title.match(nameRegex) || result.content.match(nameRegex);
        if (nameMatch) {
          name = nameMatch[0];
        } else {
          // Extract the clearest name or use part of the title
          const titleParts = result.title.split('|')[0].split('-')[0].trim().split(' ');
          if (titleParts.length >= 2) {
            name = titleParts.slice(0, 2).join(' ');
          } else {
            name = `Trainer ${idCounter}`;
          }
        }
        
        // Determine trainer specialization
        let trainerSpecialization = specialization || 'General Fitness';
        if (!specialization) {
          if (result.content.toLowerCase().includes('senior') || result.content.toLowerCase().includes('elder')) 
            trainerSpecialization = 'Senior Fitness Specialist';
          else if (result.content.toLowerCase().includes('rehab')) 
            trainerSpecialization = 'Rehabilitation Trainer';
          else if (result.content.toLowerCase().includes('cardiac') || result.content.toLowerCase().includes('heart')) 
            trainerSpecialization = 'Cardiac Health & Recovery';
          else if (result.content.toLowerCase().includes('strength') || result.content.toLowerCase().includes('balance')) 
            trainerSpecialization = 'Strength & Balance';
          else
            trainerSpecialization = 'General Fitness Trainer';
        } else {
          // Format the specialization nicely
          switch(specialization.toLowerCase()) {
            case 'senior':
              trainerSpecialization = 'Senior Fitness Specialist';
              break;
            case 'rehab':
              trainerSpecialization = 'Rehabilitation Trainer';
              break;
            case 'cardiac':
              trainerSpecialization = 'Cardiac Health & Recovery';
              break;
            case 'strength':
              trainerSpecialization = 'Strength & Balance for Seniors';
              break;
            case 'general':
              trainerSpecialization = 'General Fitness Trainer';
              break;
          }
        }
        
        // Extract or generate experience
        let experience = '';
        const experienceRegex = /(\d+)(?:\+)?\s*years?(?:\s*of)?\s*experience/i;
        const experienceMatch = result.content.match(experienceRegex);
        if (experienceMatch) {
          experience = `${experienceMatch[1]} years`;
        } else {
          // Generate reasonable experience (5-20 years)
          const years = Math.floor(Math.random() * 15) + 5;
          experience = `${years} years`;
        }
        
        // Extract or generate certification
        let certification = '';
        if (result.content.toLowerCase().includes('certified') || result.content.toLowerCase().includes('certification')) {
          // Try to extract certification
          const certRegex = /([A-Z][a-zA-Z\s]{10,60}(?:Certified|Certificate|Certification|Specialist|Trainer))/;
          const certMatch = result.content.match(certRegex);
          certification = certMatch ? certMatch[0] : '';
        }
        
        if (!certification) {
          // Assign appropriate certification based on specialization
          switch(trainerSpecialization.toLowerCase()) {
            case 'senior fitness specialist':
              certification = 'Certified Senior Fitness Specialist';
              break;
            case 'rehabilitation trainer':
              certification = 'Physical Therapy Assistant & Certified Trainer';
              break;
            case 'cardiac health & recovery':
              certification = 'Clinical Exercise Physiologist';
              break;
            case 'strength & balance for seniors':
              certification = 'Certified Strength & Balance Instructor';
              break;
            default:
              certification = 'Certified Personal Trainer';
          }
        }
        
        // Determine if mobile or at a location
        const isMobile = Math.random() > 0.5; // 50% chance of being mobile
        let distance = '';
        if (isMobile) {
          distance = 'Mobile - comes to you';
        } else {
          // Generate a reasonable distance 
          const distanceValue = Math.floor(Math.random() * 10) + (trainers.length * 0.5);
          distance = `${distanceValue.toFixed(1)} km`;
        }
        
        // Extract phone number if found in content, otherwise leave empty
        let phone = '';
        const phoneMatch = result.content.match(/\b04\d{2}\s?\d{3}\s?\d{3}\b/);
        if (phoneMatch) {
          phone = phoneMatch[0];
        }
        // Note: No phone generation - real trainers provide their own contact information
        
        // Calculate rating (4.0-5.0, higher for better search results)
        const rating = 4.0 + (result.score * 1.0);
        
        // Add the trainer if it has the minimum required info
        if (name && name.length > 3) {
          trainers.push({
            id: idCounter++,
            name,
            specialization: trainerSpecialization,
            experience,
            certification,
            distance,
            rating: parseFloat(rating.toFixed(1)),
            phone
          });
        }
        
        // Stop once we have enough results
        if (trainers.length >= 5) break;
      } catch (e) {
        console.error('Error transforming trainer result:', e);
        // Continue to next result
      }
    }

    return trainers;
  }

  private isLikelyFacility(result: TavilySearchResult): boolean {
    const lowerContent = result.content.toLowerCase();
    const lowerTitle = result.title.toLowerCase();
    const lowerUrl = result.url.toLowerCase();
    
    // Skip government documents, PDFs, XLS files, and other non-facility content
    if (
      lowerUrl.includes('.gov.au') ||
      lowerUrl.includes('.pdf') ||
      lowerUrl.includes('.xls') ||
      lowerUrl.includes('.xlsx') ||
      lowerUrl.includes('.doc') ||
      lowerUrl.includes('.docx') ||
      lowerTitle.includes('[pdf]') ||
      lowerTitle.includes('[xls]') ||
      lowerTitle.includes('grant') ||
      lowerTitle.includes('contract') ||
      lowerTitle.includes('department') ||
      lowerTitle.includes('report') ||
      lowerTitle.includes('policy') ||
      lowerTitle.includes('senate') ||
      lowerTitle.includes('assessment')
    ) {
      return false;
    }
    
    // Check for strong indicators of fitness facilities
    const strongIndicators = 
      lowerTitle.includes('gym') || 
      lowerTitle.includes('fitness') ||
      lowerTitle.includes('exercise') ||
      lowerTitle.includes('studio') ||
      lowerTitle.includes('wellness') ||
      lowerTitle.includes('health club') ||
      lowerTitle.includes('aquatic') ||
      lowerTitle.includes('pilates') ||
      lowerTitle.includes('yoga');
      
    // Check for business indicators
    const businessIndicators = 
      lowerContent.includes('opening hours') ||
      lowerContent.includes('open hours') ||
      lowerContent.includes('business hours') ||
      lowerContent.includes('contact us') ||
      lowerContent.includes('membership') ||
      lowerContent.includes('join now') ||
      lowerContent.includes('book') ||
      lowerContent.includes('class schedule') ||
      lowerContent.includes('our facilities');
      
    // Return true only if it has strong indicators of being a fitness facility
    // and either has business indicators or doesn't have negative indicators
    return strongIndicators && 
           (businessIndicators || 
            (!lowerContent.includes('personal trainer profile') &&
             !lowerTitle.includes('linkedin') &&
             !lowerTitle.includes('facebook')));
  }

  private isLikelyTrainer(result: TavilySearchResult): boolean {
    const lowerContent = result.content.toLowerCase();
    const lowerTitle = result.title.toLowerCase();
    
    // Check for indicators of personal trainers
    return (
      (lowerContent.includes('trainer') || 
       lowerContent.includes('training') || 
       lowerContent.includes('fitness') ||
       lowerContent.includes('instructor') ||
       lowerContent.includes('coach') ||
       lowerContent.includes('exercise physiologist')) &&
      !lowerContent.includes('gym location') &&
      !lowerContent.includes('fitness center address')
    );
  }
}

export default TavilyService.getInstance();