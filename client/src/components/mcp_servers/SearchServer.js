/**
 * Search Server - Specialist Chef for Local Search
 * 
 * This server handles all local search functionality, particularly for
 * exercise and wellness facilities, with CPD integration and Australian focus.
 */

import { apiRequest } from '@/lib/queryClient';

class SearchServer {
  constructor() {
    this.name = 'SearchServer';
    this.description = 'Handles local search for fitness facilities and wellness services';
  }

  /**
   * Execute search request with parameter extraction and intelligent search
   * @param {string} argument - Raw user input like "yoga studios in melbourne"
   * @param {object} context - User context including CPDs, location, etc.
   * @returns {Promise<string>} - Formatted search results
   */
  async execute(argument, context = {}) {
    console.log(`[SearchServer] Processing: "${argument}"`);
    
    try {
      // Stage 1: Extract search parameters using LLM
      const parameters = await this.extractSearchParameters(argument);
      
      // Stage 2: Perform intelligent search with extracted parameters
      const searchResults = await this.performSearch(parameters, context);
      
      // Stage 3: Format results for user display
      return this.formatResults(searchResults, parameters, context);
      
    } catch (error) {
      console.error('[SearchServer] Error:', error);
      return "I encountered an issue searching for local options. Please try rephrasing your request or check your internet connection.";
    }
  }

  /**
   * Extract specific search parameters from user input
   */
  async extractSearchParameters(argument) {
    try {
      // Use OpenAI to extract parameters from the search query
      const response = await apiRequest('/api/ai/extract-search-params', {
        method: 'POST',
        body: JSON.stringify({
          query: argument,
          prompt: `From the string "${argument}", extract the following parameters:
            - activity: The type of exercise or wellness activity
            - location: The geographical location
            - intensity: Any intensity level mentioned (beginner, intermediate, advanced)
            - duration: Any time duration mentioned
            - type: Whether this is "exercise", "wellness", or "fitness"
            
            Return as JSON: {"activity": "...", "location": "...", "intensity": "...", "duration": "...", "type": "..."}`
        })
      });

      return response.parameters || this.fallbackExtraction(argument);
    } catch (error) {
      console.warn('[SearchServer] Parameter extraction failed, using fallback:', error);
      return this.fallbackExtraction(argument);
    }
  }

  /**
   * Fallback parameter extraction using simple text analysis
   */
  fallbackExtraction(argument) {
    return {
      activity: this.extractActivity(argument),
      location: this.extractLocation(argument),
      type: this.extractType(argument)
    };
  }

  extractActivity(text) {
    const activities = ['yoga', 'pilates', 'gym', 'swimming', 'running', 'cycling', 'dance', 'martial arts', 'boxing', 'crossfit'];
    const found = activities.find(activity => text.toLowerCase().includes(activity));
    return found || 'fitness';
  }

  extractLocation(text) {
    // First try to find major cities
    const majorCities = ['melbourne', 'sydney', 'brisbane', 'perth', 'adelaide', 'darwin', 'hobart', 'canberra'];
    const foundMajorCity = majorCities.find(city => text.toLowerCase().includes(city));
    if (foundMajorCity) {
      return foundMajorCity;
    }
    
    // If no major city found, try to extract any location name from the text
    // Look for common location patterns like "in [location]", "near [location]", "[location] area"
    const locationPatterns = [
      /(?:in|near|around|at)\s+([a-zA-Z\s]+?)(?:\s|$|,)/i,
      /([a-zA-Z\s]+?)\s+(?:area|region|suburb)/i,
      /find.*?(?:in|near|around|at)\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]{2,}?)(?:\s+gym|\s+fitness|\s+exercise)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Ensure it's not just a single letter or common word
        if (location.length > 2 && !['gym', 'fitness', 'exercise', 'find', 'me', 'my'].includes(location.toLowerCase())) {
          return location;
        }
      }
    }
    
    // Last resort: look for any capitalized words that might be locations
    const words = text.split(' ');
    for (const word of words) {
      if (word.length > 3 && /^[A-Z][a-z]+/.test(word) && 
          !['Gym', 'Fitness', 'Exercise', 'Find', 'Near'].includes(word)) {
        return word;
      }
    }
    
    return 'sydney'; // Default fallback to Sydney instead of Melbourne
  }

  extractType(text) {
    if (text.toLowerCase().includes('wellness') || text.toLowerCase().includes('therapy')) return 'wellness';
    if (text.toLowerCase().includes('exercise') || text.toLowerCase().includes('workout')) return 'exercise';
    return 'fitness';
  }

  /**
   * Perform the actual search using backend APIs
   */
  async performSearch(parameters, context) {
    try {
      const searchResponse = await apiRequest(`/api/search/fitness-facilities?location=${encodeURIComponent(parameters.location)}&type=${encodeURIComponent(parameters.activity)}&useLocalSearch=true&maxResults=10`);
      return searchResponse.results || [];
    } catch (error) {
      console.error('[SearchServer] Search API error:', error);
      throw new Error('Search service unavailable');
    }
  }

  /**
   * Format search results with CPD-driven messaging for 8-10 scoring
   */
  formatResults(results, parameters, context) {
    if (!results || results.length === 0) {
      return this.formatNoCPDResults(parameters, context);
    }

    let formattedResponse = `Here are ${parameters.activity} options I found in ${parameters.location}:\n\n`;

    results.slice(0, 5).forEach((result, index) => {
      formattedResponse += `${index + 1}. **${result.name || result.title}**\n`;
      formattedResponse += `   📍 ${result.address || result.location || parameters.location}\n`;
      
      if (result.phone) {
        formattedResponse += `   📞 ${result.phone}\n`;
      }
      
      if (result.type) {
        formattedResponse += `   🏋️ Type: ${result.type}\n`;
      }
      
      if (result.bio || result.description) {
        const description = result.bio || result.description;
        formattedResponse += `   ${description.substring(0, 100)}...\n`;
      }
      
      if (result.website || result.url) {
        formattedResponse += `   🔗 [More info](${result.website || result.url})\n`;
      }
      
      formattedResponse += '\n';
    });

    // CPD-Driven Compliance Messaging
    formattedResponse += this.generateCPDAlignmentMessage(context);
    
    // CBT/MI Techniques for 8-10 Scoring
    formattedResponse += this.generateMotivationalGuidance(context, parameters);

    return formattedResponse;
  }

  /**
   * Generate CPD-specific alignment messaging
   */
  generateCPDAlignmentMessage(context) {
    if (!context.carePlanDirectives || context.carePlanDirectives.length === 0) {
      return `\n💡 **Note**: Your doctor hasn't set exercise Care Plan Directives yet. Consider discussing physical activity goals during your next appointment.\n`;
    }

    const exerciseCPDs = context.carePlanDirectives.filter(cpd => 
      cpd.category.toLowerCase().includes('exercise') || 
      cpd.category.toLowerCase().includes('physical')
    );

    if (exerciseCPDs.length === 0) {
      return `\n💡 **Care Plan Focus**: While your doctor's current directives focus on other areas, regular exercise supports overall health goals.\n`;
    }

    const cpd = exerciseCPDs[0];
    return `\n💡 **Care Plan Alignment**: These options directly support your doctor's directive: "${cpd.directive}"\n`;
  }

  /**
   * Generate CBT/MI guidance for achieving 8-10 scores
   */
  generateMotivationalGuidance(context, parameters) {
    const currentScore = context.healthMetrics?.exerciseScore || 0;
    const approach = context.cpdGuidance?.cbt_mi_approach || 'both';

    let guidance = `\n🎯 **Path to 8-10 Exercise Scores**:\n`;

    if (currentScore >= 8) {
      guidance += `• You're already achieving excellent scores (${currentScore}/10)! These options can help maintain your success.\n`;
      guidance += `• **Consistency Question**: What has been working well in your current routine?\n`;
    } else if (currentScore >= 6) {
      guidance += `• You're making good progress (${currentScore}/10). These options can help you reach the 8-10 range.\n`;
      guidance += `• **CBT Reframe**: Instead of "I need to exercise more," try "I'm building a sustainable activity routine."\n`;
    } else {
      guidance += `• Starting your exercise journey is a powerful step toward better health.\n`;
      guidance += `• **MI Approach**: What type of physical activity have you enjoyed in the past?\n`;
    }

    if (approach.includes('motivational_interviewing')) {
      guidance += `• **Reflection**: On a scale of 1-10, how confident do you feel about trying one of these options?\n`;
    }

    if (approach.includes('cognitive_behavioral_therapy')) {
      guidance += `• **CBT Technique**: Notice any thoughts like "I don't have time" and replace with "I'm investing 30 minutes in my health."\n`;
    }

    return guidance;
  }

  /**
   * Handle no results with CPD-aware messaging
   */
  formatNoCPDResults(parameters, context) {
    let response = `I couldn't find specific ${parameters.activity} options in ${parameters.location} right now.\n\n`;
    
    if (context.carePlanDirectives && context.carePlanDirectives.length > 0) {
      const exerciseCPD = context.carePlanDirectives.find(cpd => 
        cpd.category.toLowerCase().includes('exercise')
      );
      
      if (exerciseCPD) {
        response += `**Care Plan Alternative**: Your doctor's directive "${exerciseCPD.directive}" can be supported through various activities. Try searching for "fitness centers" or "walking groups" in ${parameters.location}.\n\n`;
      }
    }

    response += `**Alternative Suggestions**:\n`;
    response += `• Try broader search terms like "fitness centers" or "community health"\n`;
    response += `• Consider home-based options that align with your care plan\n`;
    response += `• Remember: any movement toward your health goals counts as progress\n`;

    return response;
  }
}

export default new SearchServer();