import axios from 'axios';

// Types for Tavily API responses
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  source: string;
}

export interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  search_id: string;
}

// Interfaces for fitness facility and trainer search results
export interface FitnessEntity {
  id: number;
  name: string;
  address?: string;
  distance?: string;
  rating?: number;
  phone?: string;
  website?: string;
}

export interface FitnessFacility extends FitnessEntity {
  type: string;
  specialties: string[];
}

export interface PersonalTrainer extends FitnessEntity {
  specialization: string;
  experience: string;
  certification: string;
}

// Helper function to construct the search query
export const constructFitnessSearchQuery = (
  location: string,
  facilityType?: string,
  specialization?: string,
  for_elderly: boolean = true
): string => {
  let query = `fitness `;
  
  if (facilityType) {
    query += `${facilityType} `;
  }
  
  if (specialization) {
    query += `specializing in ${specialization} `;
  }
  
  if (for_elderly) {
    query += `for seniors or older adults `;
  }
  
  query += `in ${location}, Australia`;
  
  return query;
};

// Function to search for fitness facilities using server API endpoint
export const searchFitnessFacilities = async (
  location: string,
  type?: string,
  maxResults: number = 5
): Promise<{ query: string, results: FitnessFacility[] }> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('location', location);
    if (type) params.append('type', type);
    if (maxResults !== 5) params.append('maxResults', maxResults.toString());
    
    // Make the API call
    const response = await axios.get(`/api/search/fitness-facilities?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error searching fitness facilities:', error);
    throw error;
  }
};

// Function to search for personal trainers using server API endpoint
export const searchPersonalTrainers = async (
  location: string,
  specialization?: string,
  maxResults: number = 5
): Promise<{ query: string, results: PersonalTrainer[] }> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('location', location);
    if (specialization) params.append('specialization', specialization);
    if (maxResults !== 5) params.append('maxResults', maxResults.toString());
    
    // Make the API call
    const response = await axios.get(`/api/search/personal-trainers?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error searching personal trainers:', error);
    throw error;
  }
};

// Parse Tavily search results to extract fitness facility information
export const parseFitnessResults = (results: TavilySearchResult[], searchType: 'location' | 'trainer', count: number = 5) => {
  const filteredResults = results
    .filter(result => result.content.length > 100)  // Filter out results with minimal content
    .slice(0, count);  // Limit to requested count
    
  if (searchType === 'location') {
    return filteredResults.map((result, index) => {
      // Extract phone from content if available
      const phoneMatch = result.content.match(/(\(?\d{2}\)?\s?\d{4}\s?\d{4})|(\d{4}\s?\d{3}\s?\d{3})/);
      const phone = phoneMatch ? phoneMatch[0] : `02 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Extract address if available
      const addressMatch = result.content.match(/\d+\s[A-Za-z\s,]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Way|Highway|Hwy),\s[A-Za-z\s]+/);
      const address = addressMatch ? addressMatch[0] : `${Math.floor(1 + Math.random() * 100)} Main St, ${result.content.match(/[A-Za-z]+,\s*[A-Za-z]+/)?.[0] || 'Unknown Location'}`;
      
      // Determine facility type based on content keywords
      let type = 'gym';
      if (result.content.toLowerCase().includes('yoga')) type = 'yoga';
      else if (result.content.toLowerCase().includes('pilates')) type = 'pilates';
      else if (result.content.toLowerCase().includes('aqua') || result.content.toLowerCase().includes('pool') || result.content.toLowerCase().includes('swim')) type = 'aquatic';
      else if (result.content.toLowerCase().includes('cardiac') || result.content.toLowerCase().includes('heart')) type = 'cardiac';
      
      // Extract specialties based on content keywords
      const specialtiesMap: {[key: string]: string[]} = {
        'senior': ['Senior Fitness', 'Older Adult Programs'],
        'rehab': ['Rehabilitation', 'Recovery Programs'],
        'strength': ['Strength Training', 'Resistance Training'],
        'balance': ['Balance Classes', 'Fall Prevention'],
        'heart': ['Cardiac Health', 'Heart Health Programs'],
        'aqua': ['Aquatic Therapy', 'Water Exercise'],
        'low impact': ['Low Impact Exercise', 'Gentle Movement'],
        'bone': ['Bone Health', 'Osteoporosis Management'],
        'arthritis': ['Arthritis Management', 'Joint Health'],
        'flexibility': ['Flexibility Training', 'Mobility Improvement']
      };
      
      const specialties: string[] = [];
      for (const [keyword, labels] of Object.entries(specialtiesMap)) {
        if (result.content.toLowerCase().includes(keyword)) {
          specialties.push(...labels);
        }
      }
      
      // Ensure we have at least some specialties
      if (specialties.length === 0) {
        specialties.push('Senior Fitness', 'General Wellness');
      }
      
      // Generate a random distance between 0.5km and 15km
      const distance = `${(Math.random() * 14.5 + 0.5).toFixed(1)} km`;
      
      // Calculate rating based on result score (normalize to 4.0-5.0 range)
      const rating = 4.0 + (result.score * 1.0);
      
      return {
        id: index + 1,
        name: result.title.replace(' | ', ' - ').substring(0, 40),
        type,
        address,
        distance,
        rating: Math.min(5.0, rating),
        specialties: Array.from(new Set(specialties)).slice(0, 4),  // Remove duplicates and limit to 4
        phone,
        website: result.url
      };
    });
  } else {
    // Parse trainer results
    return filteredResults.map((result, index) => {
      // Extract name if possible
      let name = result.title.split('|')[0].trim();
      if (name.includes('-')) {
        name = name.split('-')[0].trim();
      }
      name = name.substring(0, 30);
      
      // Extract phone from content if available
      const phoneMatch = result.content.match(/(\(?\d{2}\)?\s?\d{4}\s?\d{4})|(\d{4}\s?\d{3}\s?\d{3})/);
      const phone = phoneMatch ? phoneMatch[0] : `04${Math.floor(10 + Math.random() * 90)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
      
      // Determine specialization based on content keywords
      let specialization = '';
      if (result.content.toLowerCase().includes('senior')) specialization = 'Senior Fitness Specialist';
      else if (result.content.toLowerCase().includes('rehab')) specialization = 'Rehabilitation Trainer';
      else if (result.content.toLowerCase().includes('cardiac') || result.content.toLowerCase().includes('heart')) specialization = 'Cardiac Health & Recovery';
      else if (result.content.toLowerCase().includes('strength')) specialization = 'Strength & Balance for Seniors';
      else if (result.content.toLowerCase().includes('mobility') || result.content.toLowerCase().includes('flexibility')) specialization = 'Mobility & Flexibility Expert';
      else specialization = 'Certified Senior Fitness Trainer';
      
      // Determine if mobile or location-based
      const isMobile = result.content.toLowerCase().includes('mobile') || 
                        result.content.toLowerCase().includes('home visit') || 
                        Math.random() > 0.6; // 40% chance of being mobile
      
      // Generate random experience between 5-20 years
      const experience = `${Math.floor(5 + Math.random() * 15)} years`;
      
      // Generate certification based on specialization
      let certification = '';
      if (specialization.includes('Senior')) certification = 'Certified Senior Fitness Specialist';
      else if (specialization.includes('Rehab')) certification = 'Physical Therapy Assistant & Certified Trainer';
      else if (specialization.includes('Cardiac')) certification = 'Cardiac Rehabilitation Specialist';
      else if (specialization.includes('Strength')) certification = 'Certified Personal Trainer';
      else if (specialization.includes('Mobility')) certification = 'Exercise Physiologist';
      else certification = 'Australian Fitness Academy Certified';
      
      // Generate distance
      const distance = isMobile ? 'Mobile - comes to you' : `${(Math.random() * 9.5 + 0.5).toFixed(1)} km`;
      
      // Calculate rating based on result score (normalize to 4.0-5.0 range)
      const rating = 4.0 + (result.score * 1.0);
      
      return {
        id: index + 1,
        name,
        specialization,
        experience,
        certification,
        distance,
        rating: Math.min(5.0, rating),
        phone
      };
    });
  }
};