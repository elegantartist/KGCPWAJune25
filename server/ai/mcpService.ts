import { OpenAI } from "openai";
import { CarePlanDirective } from "@shared/schema";

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Ensure API is properly initialized
if (!process.env.OPENAI_API_KEY) {
  console.warn("OpenAI API key not provided. MCP recommendation system will not function properly.");
}

console.log("OpenAI API initialized successfully");

// MCP (Model Context Protocol) Service
// Handles generating and validating care plan recommendations

interface PatientData {
  metrics: {
    medication: number | string;
    diet: number | string;
    exercise: number | string;
  };
  chatMemories: any[];
  featureUsage: Record<string, number | string | null>;
  interactions: any[];
  carePlan: CarePlanDirective[];
  recommendationOutcomes: any[];
}

// Main function to generate system recommendations based on patient data
export async function generateSystemRecommendations(patientData: PatientData): Promise<string[]> {
  try {
    // Construct a context prompt with the patient's data
    const contextPrompt = createContextPrompt(patientData);
    
    // Generate recommendations using the LLM
    const recommendations = await generateRecommendationsWithLLM(contextPrompt);
    
    return recommendations;
  } catch (error) {
    console.error("Error generating system recommendations:", error);
    return ["Error generating recommendations. Please try again later."];
  }
}

// Create a detailed context prompt for the LLM
function createContextPrompt(patientData: PatientData): string {
  // Extract key metrics
  const { medication, diet, exercise } = patientData.metrics;
  
  // Identify potential issues based on scores
  const issues = [];
  const medScore = Number(medication);
  const dietScore = Number(diet);
  const exScore = Number(exercise);
  
  if (!isNaN(medScore) && medScore < 6) issues.push(`Medication adherence score is low (${typeof medication === 'number' ? medication.toFixed(1) : medication}/10)`);
  if (!isNaN(dietScore) && dietScore < 6) issues.push(`Diet adherence score is low (${typeof diet === 'number' ? diet.toFixed(1) : diet}/10)`);
  if (!isNaN(exScore) && exScore < 6) issues.push(`Exercise adherence score is low (${typeof exercise === 'number' ? exercise.toFixed(1) : exercise}/10)`);
  
  // Extract most used and least used features
  const sortedFeatures = Object.entries(patientData.featureUsage)
    .map(([feature, count]) => [feature, typeof count === 'number' ? count : 0])
    .sort(([, countA], [, countB]) => (countB as number) - (countA as number));
  
  const mostUsedFeatures = sortedFeatures.slice(0, 3).map(([feature, count]) => `${feature} (${count} uses)`);
  const leastUsedFeatures = sortedFeatures.slice(-3).map(([feature, count]) => `${feature} (${count} uses)`);
  
  // Extract current care plan directives
  const currentDirectives = patientData.carePlan.map(directive => 
    `${directive.category.toUpperCase()}: ${directive.directive}`
  );
  
  // Extract chat sentiment
  const chatSentiment = extractChatSentiment(patientData.chatMemories);
  
  // Create the full prompt
  return `
As a healthcare AI assistant, analyze this patient's data and suggest care plan directive updates:

## Current Health Metrics
- Medication adherence: ${typeof medication === 'number' ? medication.toFixed(1) : medication}/10
- Diet adherence: ${typeof diet === 'number' ? diet.toFixed(1) : diet}/10
- Exercise adherence: ${typeof exercise === 'number' ? exercise.toFixed(1) : exercise}/10

## Potential Issues
${issues.length ? issues.map(issue => `- ${issue}`).join('\n') : '- No significant issues detected'}

## App Usage Patterns
- Most used features: ${mostUsedFeatures.length ? mostUsedFeatures.join(', ') : 'N/A'}
- Least used features: ${leastUsedFeatures.length ? leastUsedFeatures.join(', ') : 'N/A'}

## Current Care Plan Directives
${currentDirectives.length ? currentDirectives.join('\n') : 'No current directives'}

## Patient Sentiment From Chat
${chatSentiment}

## Task
Based on this information, suggest 2-3 specific, actionable updates to the patient's care plan directives in these categories:
1. Diet
2. Exercise and Wellness
3. Medication

For each suggestion, format as: "CATEGORY: Suggested change to directive - brief reasoning"
Be specific and focused on addressing the identified issues.
`;
}

// Extract sentiment from chat memories - simplified version
function extractChatSentiment(chatMemories: any[]): string {
  if (!chatMemories.length) {
    return "No recent chat data available";
  }
  
  // In a real implementation, this would use more sophisticated sentiment analysis
  const keywords = {
    positive: ["good", "great", "happy", "better", "improved", "positive", "excellent", "help", "useful"],
    negative: ["bad", "worse", "difficult", "struggle", "pain", "negative", "hard", "problem", "issue"]
  };
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  chatMemories.forEach(memory => {
    const content = memory.content.toLowerCase();
    
    keywords.positive.forEach(word => {
      if (content.includes(word)) positiveCount++;
    });
    
    keywords.negative.forEach(word => {
      if (content.includes(word)) negativeCount++;
    });
  });
  
  if (positiveCount > negativeCount * 1.5) {
    return "Patient generally expresses positive sentiment in conversations";
  } else if (negativeCount > positiveCount * 1.5) {
    return "Patient often expresses negative sentiment or frustration in conversations";
  } else {
    return "Patient shows mixed or neutral sentiment in conversations";
  }
}

// Generate recommendations using the LLM
async function generateRecommendationsWithLLM(contextPrompt: string): Promise<string[]> {
  try {
    // In production, this would use a more sophisticated prompt and potentially system messages
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert healthcare AI assistant that helps doctors analyze patient data and suggest care plan improvements. Your recommendations should be specific, actionable, and based on the patient data provided."
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      temperature: 0.4, // Lower temperature for more focused recommendations
      max_tokens: 800
    });
    
    // Extract and parse recommendations
    const content = response.choices[0].message.content || "";
    
    // Parse lines that match the format "CATEGORY: Recommendation"
    const recommendationLines = content
      .split('\n')
      .filter(line => line.match(/^(DIET|EXERCISE|MEDICATION):/i));
    
    // If we couldn't parse any recommendations in the expected format,
    // return the entire response
    if (recommendationLines.length === 0) {
      return [content.trim()];
    }
    
    return recommendationLines.map(line => line.trim());
  } catch (error) {
    console.error("Error calling LLM for recommendations:", error);
    return ["Unable to generate recommendations due to a technical issue."];
  }
}

// Validate recommendations through a second LLM call to ensure quality
// Generate new CPD category suggestions based on latest patient data
export async function generateNewCpdSuggestions(patientData: PatientData): Promise<Record<string, string>> {
  try {
    // Create a prompt for generating new CPD suggestions
    const prompt = `
As a healthcare AI assistant, analyze this patient's data and generate one new specific, actionable suggestion for each CPD category. These will help doctors update the patient's care plan.

## Current Health Metrics
- Medication adherence: ${typeof patientData.metrics.medication === 'number' ? patientData.metrics.medication.toFixed(1) : patientData.metrics.medication}/10
- Diet adherence: ${typeof patientData.metrics.diet === 'number' ? patientData.metrics.diet.toFixed(1) : patientData.metrics.diet}/10
- Exercise adherence: ${typeof patientData.metrics.exercise === 'number' ? patientData.metrics.exercise.toFixed(1) : patientData.metrics.exercise}/10

## Current Care Plan Directives
${patientData.carePlan.map(dir => `${dir.category.toUpperCase()}: ${dir.directive}`).join('\n')}

## App Usage Patterns
${Object.entries(patientData.featureUsage)
  .map(([feature, count]) => [feature, typeof count === 'number' ? count : 0])
  .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
  .slice(0, 5)
  .map(([feature, count]) => `- ${feature}: ${count} uses`)
  .join('\n')}

## Task
Generate ONE new suggestion for EACH of these CPD categories based on latest patient data:
1. DIET
2. EXERCISE
3. MEDICATION

Format each suggestion as:
"CATEGORY: suggestion"

Make suggestions specific, achievable, and complementary to existing directives. Focus on small, impactful changes.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert healthcare AI assistant that helps doctors create personalized care plan suggestions for their patients."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800
    });
    
    const content = response.choices[0].message.content || "";
    
    // Parse the suggestions into a structured format using simpler regex patterns
    const dietRegex = /DIET:\s*([^]*?)(?=\n\s*EXERCISE:|\n\s*MEDICATION:|$)/i;
    const exerciseRegex = /EXERCISE:\s*([^]*?)(?=\n\s*DIET:|\n\s*MEDICATION:|$)/i;
    const medicationRegex = /MEDICATION:\s*([^]*?)(?=\n\s*DIET:|\n\s*EXERCISE:|$)/i;
    
    const dietMatch = content.match(dietRegex);
    const exerciseMatch = content.match(exerciseRegex);
    const medicationMatch = content.match(medicationRegex);
    
    return {
      diet: dietMatch ? dietMatch[1].trim() : "No new diet suggestion available",
      exercise: exerciseMatch ? exerciseMatch[1].trim() : "No new exercise suggestion available",
      medication: medicationMatch ? medicationMatch[1].trim() : "No new medication suggestion available"
    };
  } catch (error) {
    console.error("Error generating new CPD suggestions:", error);
    return {
      diet: "Unable to generate new diet suggestion due to a technical issue.",
      exercise: "Unable to generate new exercise suggestion due to a technical issue.",
      medication: "Unable to generate new medication suggestion due to a technical issue."
    };
  }
}

export async function validateRecommendations(
  recommendations: string[], 
  patientData: PatientData
): Promise<string[]> {
  if (!recommendations.length) {
    return [];
  }
  
  try {
    // Create a validation prompt
    const validationPrompt = `
As a healthcare validation AI, review these care plan directive recommendations and ensure they are appropriate for the patient:

## Patient Health Metrics
- Medication adherence: ${typeof patientData.metrics.medication === 'number' ? patientData.metrics.medication.toFixed(1) : patientData.metrics.medication}/10
- Diet adherence: ${typeof patientData.metrics.diet === 'number' ? patientData.metrics.diet.toFixed(1) : patientData.metrics.diet}/10
- Exercise adherence: ${typeof patientData.metrics.exercise === 'number' ? patientData.metrics.exercise.toFixed(1) : patientData.metrics.exercise}/10

## Current Care Plan Directives
${patientData.carePlan.map(dir => `${dir.category.toUpperCase()}: ${dir.directive}`).join('\n')}

## Recommendations to Validate
${recommendations.map((rec, i) => `${i+1}. ${rec}`).join('\n')}

For each recommendation, determine if it is:
1. Specific and actionable
2. Appropriate based on the patient's data
3. Likely to improve the relevant health metric

Return ONLY the valid recommendations, removing any that don't meet these criteria. You may rephrase recommendations to improve them.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a healthcare validation AI that ensures care plan recommendations are appropriate, specific, and likely to be effective."
        },
        {
          role: "user",
          content: validationPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });
    
    const content = response.choices[0].message.content || "";
    
    // Parse the validated recommendations
    const validatedRecommendations = content
      .split('\n')
      .filter(line => line.match(/^[0-9]+\.\s+(DIET|EXERCISE|MEDICATION):/i) || 
                      line.match(/^(DIET|EXERCISE|MEDICATION):/i))
      .map(line => {
        // Remove numeric prefixes if present
        return line.replace(/^[0-9]+\.\s+/, '').trim();
      });
    
    // If no valid recommendations were found, check if the content
    // has any useful information
    if (validatedRecommendations.length === 0) {
      const contentLines = content.split('\n').filter(line => line.trim().length > 0);
      
      if (contentLines.length > 0) {
        return [content.trim()];
      } else {
        // If still nothing useful, return a subset of the original recommendations
        return recommendations.slice(0, 3);
      }
    }
    
    return validatedRecommendations;
  } catch (error) {
    console.error("Error validating recommendations:", error);
    // In case of error, return the original recommendations
    return recommendations;
  }
}