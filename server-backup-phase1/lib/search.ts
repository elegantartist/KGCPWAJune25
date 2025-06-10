import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Interface for Tavily search results
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

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

/**
 * Enhances search results using the Tavily API and Anthropic's Claude model
 * Returns structured provider data with accurate contact information
 */
export async function enhanceSearchResults(
  location: string, 
  type: string = '',
  postcode: string = '', 
  initialProviders: Provider[] = []
): Promise<Provider[]> {
  console.log(`Starting enhanced search for ${type} in location: ${location} ${postcode}`);
  
  try {
    // 1. Get search results from Tavily
    console.log('Fetching results from Tavily...');
    const searchType = type ? type : 'fitness centers gyms trainers';
    const postcodeInfo = postcode ? ` ${postcode}` : '';
    const query = `${location}${postcodeInfo} ${searchType}`;
    
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: 'advanced',
        max_results: 20,
        exclude_domains: [
          'health.gov.au',
          'fitness.gov.au',
          'australia.gov.au', 
          'nsw.gov.au', 
          'qld.gov.au',
          'vic.gov.au', 
          'wa.gov.au', 
          'sa.gov.au',
          'nt.gov.au',
          'act.gov.au',
          'tas.gov.au'
        ]
      })
    });
    
    if (!tavilyResponse.ok) {
      console.error(`Tavily API error: ${tavilyResponse.status} ${tavilyResponse.statusText}`);
      return initialProviders;
    }
    
    const tavilyData = await tavilyResponse.json();
    console.log(`Received ${tavilyData.results?.length || 0} results from Tavily`);
    
    // If no results, return the initial providers
    if (!tavilyData.results?.length) {
      return initialProviders;
    }
    
    // 2. Process with Anthropic's Claude model
    console.log('Processing results with Anthropic...');
    const message = await anthropic.messages.create({
      // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Extract fitness providers from these search results for ${location}${postcode ? ` (${postcode})` : ''}.
Convert these search results into fitness providers. Return at least 5 providers (more if available) as a JSON array:

[{
  "id": string,
  "name": string,
  "type": string (one of: "Gym", "Personal Trainer", "Fitness Center", "Yoga Studio", "Pilates Studio"),
  "address": string,
  "phone": string,
  "website": string,
  "email": string (if available),
  "bio": string (brief description)
}]

Search results: ${JSON.stringify(tavilyData.results)}

Important guidelines:
1. ONLY extract real providers from the search results - don't fabricate anything
2. Extract accurate phone numbers, websites, and addresses from the search results
3. Ensure phone numbers are in valid Australian format (e.g., 02 1234 5678 or 0412 345 678)
4. For providers without websites, use null (don't make up URLs)
5. Include only fitness providers relevant to ${type || 'fitness'} near ${location}
6. Focus on real businesses with physical locations that users can visit
7. Exclude government websites, job boards, and generic directories
8. Generate random IDs like "provider-123" for each entry
9. Make sure to extract at least 5 unique providers if available in the search results`
        }
      ]
    });
    
    const content = message.content[0];
    if (content.type !== 'text') {
      console.error('Unexpected response type from Anthropic');
      return initialProviders;
    }
    
    // 3. Process and validate response
    try {
      // Find JSON array in response
      const match = content.text.match(/\[\s*{[\s\S]*}\s*\]/);
      if (!match) {
        console.error('No valid JSON array found in response');
        return initialProviders;
      }
      
      const parsedResults = JSON.parse(match[0]) as Provider[];
      console.log(`Parsed ${parsedResults.length} providers from Anthropic response`);
      
      // Combine results ensuring minimum 5 providers
      const combinedResults = [...parsedResults, ...initialProviders];
      
      // Remove duplicates based on name
      const uniqueResults = Array.from(
        new Map(combinedResults.map(item => [item.name, item])).values()
      );
      
      console.log(`Final provider count: ${uniqueResults.length}`);
      return uniqueResults.slice(0, Math.max(10, initialProviders.length));
    } catch (parseError) {
      console.error('Error processing Anthropic response:', parseError);
      return initialProviders;
    }
  } catch (error) {
    console.error('Search enhancement error:', error);
    return initialProviders;
  }
}