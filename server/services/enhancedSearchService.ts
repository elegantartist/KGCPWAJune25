// server/services/enhancedSearchService.ts
import Anthropic from '@anthropic-ai/sdk';
import { auditLogger } from '../auditLogger';

// Initialize clients using environment variables
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Define the Provider interface as specified
export interface Provider {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  website?: string;
  // ... other fields
}

export async function performEnhancedSearch(location: string, type: string): Promise<Provider[]> {
  // 1. Proactive Prerequisite Check
  if (!TAVILY_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    await auditLogger.logSecurityEvent({
      eventType: 'UNAUTHORIZED_ACCESS',
      severity: 'CRITICAL',
      ipAddress: 'system',
      userAgent: 'server',
      details: { error: 'Tavily or Anthropic API key is not configured' }
    });
    throw new Error('Search feature is not configured correctly.');
  }

  // 2. Comprehensive try...catch Error Insulation
  try {
    const query = `${type} in ${location}`;
    await auditLogger.logSecurityEvent({
      eventType: 'DATA_ACCESS',
      severity: 'LOW',
      ipAddress: 'system',
      userAgent: 'server',
      details: { action: 'enhanced_search', query }
    });

    // 3. Tavily API Call
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: 'advanced',
        max_results: 20
      })
    });

    if (!tavilyResponse.ok) {
      throw new Error(`Tavily API request failed with status: ${tavilyResponse.status}`);
    }
    const tavilyData = await tavilyResponse.json();
    if (!tavilyData.results?.length) {
      return []; // Return empty if no search results
    }

    // 4. Anthropic Claude API Call for Synthesis & Structuring
    const claudeMessage = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229', // Using the specified model family
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `From the following search results, extract up to 10 entities matching the search for "${type}" in "${location}". Structure the output as a JSON array of objects. Each object should have these keys: "id", "name", "type", "address", "phone", "website". Only return data found in the search results. Search Results: ${JSON.stringify(tavilyData.results)}`
        }
      ]
    });
    
    // Extract and parse the JSON from the response
    const content = claudeMessage.content[0];
    if ('text' in content) {
      const providers = JSON.parse(content.text);
      return providers;
    } else {
      throw new Error('Unexpected response type from Claude API');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await auditLogger.logSecurityEvent({
      eventType: 'DATA_ACCESS',
      severity: 'HIGH',
      ipAddress: 'system',
      userAgent: 'server',
      details: { error: errorMessage, action: 'enhanced_search_failed' }
    });
    // In case of any failure, return an empty array to prevent crashes.
    return [];
  }
}