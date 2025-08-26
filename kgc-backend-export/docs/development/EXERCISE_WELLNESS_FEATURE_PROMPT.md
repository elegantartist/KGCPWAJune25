# Exercise & Wellness Search Feature Implementation Guide

This guide provides comprehensive instructions for recreating the Exercise & Wellness search functionality in the Keep Going Care (KGC) application.

## Feature Overview

The Exercise & Wellness search feature provides highly accurate video recommendations based on user preferences with the following capabilities:
- Returns exactly 10 relevant results for both exercise and wellness categories
- Uses multi-tiered search with specialized category matching
- Implements advanced tag-based relevance scoring
- Features smart fallback mechanisms for consistent result quality
- Displays custom user feedback messages based on result quality
- Integrates with Care Plan Directives (CPDs) for personalized recommendations

## Server-Side Implementation

### Routes and API Endpoints

Implement the following in `server/routes.ts`:

1. **Search Endpoint**: Create a GET endpoint at `/api/exercise-wellness/search` that accepts the following parameters:
   - `category`: "exercise" or "wellness"
   - `tags`: Array of relevant search tags
   - `intensity`: Optional exercise intensity level
   - `duration`: Optional duration preference
   - `useCPDs`: Boolean flag to incorporate user's Care Plan Directives

2. **Result Processing Logic**:
   - Fetch initial results using Tavily API with specialized category matching
   - Process results to extract video content details (title, description, URL, thumbnail)
   - Implement multi-tiered fallback search mechanism that broadens search if insufficient results
   - Calculate detailed relevance scores based on tag matching, intensity, and duration
   - Sort results by relevance score in descending order
   - Return exactly 10 results with appropriate feedback message

3. **Quality Assessment**:
   - Use OpenAI API to analyze video content for exercise appropriateness
   - Evaluate videos based on safety, difficulty level, and alignment with search criteria
   - Generate additional metadata such as calories burned, difficulty score, and equipment needed
   - Ensure "No results found" message displays as "Searching for Your Exercise and Wellness Guru"

### Key Code Sections

```javascript
// Multi-tiered search implementation
async function searchExerciseWellnessVideos(filters) {
  // Initial search with specific terms
  let videos = await tavilyService.search(constructPrimaryQuery(filters));
  
  // If fewer than 10 results, try broader search
  if (videos.length < 10) {
    const additionalVideos = await tavilyService.search(constructSecondaryQuery(filters));
    videos = [...videos, ...additionalVideos];
  }
  
  // Calculate relevance scores based on tag matching
  videos = videos.map(video => ({
    ...video,
    relevanceScore: calculateRelevanceScore(video, filters)
  }));
  
  // Sort by relevance score and limit to 10
  return videos
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

// Calculate relevance scoring
function calculateRelevanceScore(video, filters) {
  let score = 0;
  
  // Tag matching (up to 0.6 points)
  if (filters.tags && filters.tags.length > 0) {
    const matchedTags = filters.tags.filter(tag => 
      video.title.toLowerCase().includes(tag.toLowerCase()) || 
      video.description.toLowerCase().includes(tag.toLowerCase())
    );
    score += (matchedTags.length / filters.tags.length) * 0.6;
  }
  
  // Intensity matching (up to 0.2 points)
  if (filters.intensity && video.content.toLowerCase().includes(filters.intensity.toLowerCase())) {
    score += 0.2;
  }
  
  // Duration matching (up to 0.2 points)
  if (filters.duration && video.content.toLowerCase().includes(filters.duration.toLowerCase())) {
    score += 0.2;
  }
  
  return score;
}

// Result quality messaging
function getResultQualityMessage(results) {
  const goodMatches = results.filter(result => result.relevanceScore >= 0.5).length;
  
  if (results.length < 10) {
    return `Found ${results.length} videos matching your criteria. For more results, try broadening your search or using different tags.`;
  } else if (goodMatches < 7) {
    return `Found ${goodMatches} highly relevant videos plus ${10 - goodMatches} general recommendations. Try adjusting your search terms for more specific results.`;
  }
  
  return null; // No message needed for good result sets
}
```

## Client-Side Implementation

1. **Search Component**: Implement a form with the following fields:
   - Category selection (exercise/wellness)
   - Tag input (multi-select)
   - Optional intensity selection
   - Optional duration selection
   - Toggle for CPD integration

2. **Results Display**:
   - Create a responsive grid of video cards
   - Display thumbnail, title, source, and metadata
   - Show "Searching for Your Exercise and Wellness Guru" during loading and when no results
   - Display quality feedback message when available

3. **User Experience**:
   - Implement loading states during search
   - Create responsive design for mobile and desktop
   - Enable video filtering and sorting options
   - Allow users to save favorite videos

## Testing and Validation

1. Verify that the search consistently returns 10 results
2. Test the fallback mechanism by using very specific search terms
3. Ensure CPD integration properly filters and sorts results
4. Confirm that relevance scoring accurately prioritizes results
5. Check that feedback messages correctly reflect result quality

## Key Files

The core functionality is implemented in these files:
- `server/routes.ts`: Main API endpoint implementation
- `server/services/tavilyService.ts`: Integration with Tavily search API
- `server/services/openai.ts`: Video content analysis with OpenAI
- `client/src/pages/inspiration-ew.tsx`: Main Exercise & Wellness page
- `client/src/pages/ew-support.tsx`: Support page for Exercise & Wellness