/**
 * Inspiration Machines - Specialized Sub-Agents for Diet and Exercise & Wellness
 * Phase 3: The Tools - Implements intelligent meal and wellness inspiration
 */

import OpenAI from 'openai';
import { secureLog } from './privacyMiddleware';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MCPBundle {
  user_id_pseudonym: string;
  care_plan_directives: string;
  redacted_chat_history: Array<{ role: string; content: string }>;
  health_metrics: Record<string, any>;
}

/**
 * Inspiration Machine D: Diet and Meal Inspiration
 * Generates personalized meal ideas aligned with patient Care Plan Directives
 */
export async function getMealInspiration(mcpBundle: MCPBundle): Promise<string> {
  try {
    secureLog('Meal inspiration machine activated', { 
      userPseudonym: mcpBundle.user_id_pseudonym 
    });

    const systemPrompt = `You are a specialized meal inspiration assistant for patients with metabolic syndrome and chronic health conditions. You provide evidence-based, practical meal suggestions that align with medical care plans.

GUIDELINES:
- Focus on metabolic-friendly foods (low glycemic index, anti-inflammatory)
- Consider portion control and balanced macronutrients
- Suggest simple, achievable meals that patients can realistically prepare
- Be encouraging and positive while staying within dietary boundaries
- Never contradict specific medical dietary restrictions
- Emphasize whole foods, lean proteins, complex carbohydrates, and healthy fats
- Consider budget-friendly and time-efficient options

RESPONSE FORMAT:
- Provide one specific meal suggestion
- Include brief preparation guidance
- Mention key nutritional benefits
- Keep tone supportive and motivational`;

    const userPrompt = `Patient's Personalized Care Plan Context:
${mcpBundle.care_plan_directives}

Current Health Metrics Context:
${JSON.stringify(mcpBundle.health_metrics, null, 2)}

Recent Conversation Context (for personalization):
${mcpBundle.redacted_chat_history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Generate a specific, appealing meal idea that aligns with this patient's care plan directives and current health status.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.8, // Slightly creative for variety
      top_p: 0.9
    });

    const mealSuggestion = response.choices[0]?.message?.content || 
      'I recommend focusing on a balanced meal with lean protein, vegetables, and complex carbohydrates as outlined in your care plan.';

    secureLog('Meal inspiration generated successfully', { 
      userPseudonym: mcpBundle.user_id_pseudonym,
      responseLength: mealSuggestion.length 
    });

    return mealSuggestion;

  } catch (error) {
    secureLog('Meal inspiration machine error', { 
      userPseudonym: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return `Based on your care plan focusing on balanced nutrition, I recommend a simple meal combining lean protein (like grilled chicken or fish), colorful vegetables, and a moderate portion of whole grains. This combination supports stable blood sugar and provides sustained energy. Please consult with your healthcare provider for specific dietary adjustments.`;
  }
}

/**
 * Inspiration Machine E&W: Exercise and Wellness Inspiration
 * Generates personalized wellness activities aligned with patient Care Plan Directives
 */
export async function getWellnessInspiration(mcpBundle: MCPBundle): Promise<string> {
  try {
    secureLog('Wellness inspiration machine activated', { 
      userPseudonym: mcpBundle.user_id_pseudonym 
    });

    const systemPrompt = `You are a specialized wellness and exercise inspiration assistant for patients with chronic health conditions. You provide safe, evidence-based wellness activities that complement medical care plans.

GUIDELINES:
- Focus on low-impact, accessible activities suitable for various fitness levels
- Consider both physical and mental wellness approaches
- Suggest activities that can be modified based on patient limitations
- Emphasize consistency over intensity
- Include mindfulness, stress management, and social connection opportunities
- Never recommend activities that could contradict medical restrictions
- Consider time constraints and realistic patient capabilities
- Integrate behavioral change principles for sustainable habits

RESPONSE FORMAT:
- Provide one specific wellness activity suggestion
- Include practical implementation tips
- Mention key health benefits
- Keep tone encouraging and achievable`;

    const userPrompt = `Patient's Personalized Care Plan Context:
${mcpBundle.care_plan_directives}

Current Health Metrics Context:
${JSON.stringify(mcpBundle.health_metrics, null, 2)}

Recent Conversation Context (for personalization):
${mcpBundle.redacted_chat_history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Generate a specific, achievable wellness activity that aligns with this patient's care plan and current wellness level.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.8, // Slightly creative for variety
      top_p: 0.9
    });

    const wellnessSuggestion = response.choices[0]?.message?.content || 
      'I recommend starting with gentle movement activities like a 10-minute walk or light stretching as outlined in your wellness plan.';

    secureLog('Wellness inspiration generated successfully', { 
      userPseudonym: mcpBundle.user_id_pseudonym,
      responseLength: wellnessSuggestion.length 
    });

    return wellnessSuggestion;

  } catch (error) {
    secureLog('Wellness inspiration machine error', { 
      userPseudonym: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return `Based on your wellness plan emphasizing gentle movement, I recommend starting with a 10-15 minute activity you enjoy - perhaps a short walk, light stretching, or deep breathing exercises. The key is consistency and listening to your body. These activities can help improve energy, mood, and overall well-being when done regularly.`;
  }
}

/**
 * Advanced Meal Planning Tool - Enhanced inspiration with weekly planning
 */
export async function getWeeklyMealPlan(mcpBundle: MCPBundle): Promise<string> {
  try {
    secureLog('Weekly meal planning tool activated', { 
      userPseudonym: mcpBundle.user_id_pseudonym 
    });

    const systemPrompt = `You are an advanced meal planning specialist for patients with metabolic conditions. Create practical weekly meal suggestions that support consistent health management.

GUIDELINES:
- Provide 3-4 diverse meal ideas for the week
- Focus on meal prep efficiency and ingredient overlap
- Consider budget and time constraints
- Emphasize nutritional variety while maintaining care plan compliance
- Include simple preparation methods
- Suggest batch cooking opportunities`;

    const userPrompt = `Patient's Care Plan Context:
${mcpBundle.care_plan_directives}

Health Metrics for Planning:
${JSON.stringify(mcpBundle.health_metrics, null, 2)}

Create a week's worth of meal inspiration that this patient can realistically prepare and enjoy.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || 
      'Focus on building a weekly routine with 2-3 simple, repeatable meals that align with your care plan directives.';

  } catch (error) {
    secureLog('Weekly meal planning error', { 
      userPseudonym: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return 'For weekly planning, focus on simple, repeatable meals that align with your care plan. Consider batch cooking proteins and vegetables on weekends to support consistent healthy eating throughout the week.';
  }
}

/**
 * Comprehensive Wellness Program Tool - Enhanced inspiration with structured programs
 */
export async function getWellnessProgram(mcpBundle: MCPBundle): Promise<string> {
  try {
    secureLog('Wellness program tool activated', { 
      userPseudonym: mcpBundle.user_id_pseudonym 
    });

    const systemPrompt = `You are a wellness program designer for patients with chronic conditions. Create structured, progressive wellness programs that integrate physical, mental, and social health components.

GUIDELINES:
- Design 2-4 week progressive programs
- Include physical activity, stress management, and social connection
- Provide clear daily/weekly structure
- Consider patient limitations and gradual progression
- Integrate mindfulness and behavioral change techniques
- Make programs sustainable and enjoyable`;

    const userPrompt = `Patient's Care Plan Context:
${mcpBundle.care_plan_directives}

Current Wellness Status:
${JSON.stringify(mcpBundle.health_metrics, null, 2)}

Design a structured wellness program that this patient can follow to improve their overall health and well-being.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || 
      'Start with a simple daily routine combining gentle movement, mindfulness, and one social connection activity per week.';

  } catch (error) {
    secureLog('Wellness program error', { 
      userPseudonym: mcpBundle.user_id_pseudonym,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return 'Begin with a structured approach: 15 minutes of daily movement, 5 minutes of mindfulness, and one meaningful social interaction per week. Build consistency before increasing intensity.';
  }
}