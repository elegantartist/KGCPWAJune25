import { db } from '../db';
import { dailyScores, carePlanDirectives as cpdSchema, patients } from '@shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { AIContextService } from './aiContextService'; // For secure context
import { SELF_SCORE_ANALYSIS_PROMPT } from './prompt_templates'; // Standardized prompt
import OpenAI from 'openai'; // Direct OpenAI client
import { secureLog, redactPiiFromText } from './privacyMiddleware'; // For secure logging and redaction

// Initialize OpenAI client if not already available globally or via a dedicated service
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateScoreAnalysis(userId: number) {
  const functionName = "generateScoreAnalysis";
  secureLog(`[${functionName}] Starting for user`, { userId });

  // 1. Fetch last 7-14 days of scores for trend analysis (adjust as needed)
  const N_DAYS_AGO = 14;
  const nDaysAgoDate = new Date();
  nDaysAgoDate.setDate(nDaysAgoDate.getDate() - N_DAYS_AGO);

  const patientRecord = await db.query.patients.findFirst({ where: eq(patients.userId, userId) });
  if (!patientRecord) {
    secureLog(`[${functionName}] Patient record not found for user.`, { userId });
    return { summary: "Patient record not found.", recommendations: [] };
  }

  const recentScores = await db
    .select({
      date: dailyScores.scoreDate, // Assuming scoreDate is the correct column name
      dietScore: dailyScores.dietScore,
      exerciseScore: dailyScores.exerciseScore,
      medicationScore: dailyScores.medicationScore,
    })
    .from(dailyScores)
    .where(and(eq(dailyScores.userId, userId), gte(dailyScores.scoreDate, nDaysAgoDate.toISOString().split('T')[0])))
    .orderBy(desc(dailyScores.scoreDate))
    .limit(N_DAYS_AGO);

  if (recentScores.length < 1) {
    secureLog(`[${functionName}] Not enough recent score data for analysis for user.`, { userId });
    return { summary: "Not enough recent data for an analysis. Keep logging your scores daily!", recommendations: [] };
  }

  // 2. Get Secure Context (includes redacted CPDs, pseudonymized ID)
  // We don't need chat history for this specific analysis, but health metrics from context might be useful
  // The `AIContextService.prepareSecureContext` will provide pseudonymized user ID and redacted CPDs.
  let mcpBundle;
  try {
    const contextResponse = await AIContextService.prepareSecureContext({
      userId,
      includeHealthMetrics: true, // true, as latest_scores are part of the bundle
      includeChatHistory: false,
    });
    mcpBundle = contextResponse.secureBundle;
    if (!contextResponse.securityValidation.isSecure) {
      secureLog(`[${functionName}] MCP bundle security validation failed for user.`, { userId, violations: contextResponse.securityValidation.violations });
      throw new Error('MCP bundle failed security validation');
    }
  } catch (contextError) {
    secureLog(`[${functionName}] Error preparing secure context for user.`, { userId, error: contextError instanceof Error ? contextError.message : contextError });
    return { summary: "There was an issue preparing your data for analysis.", recommendations: [] };
  }

  // 3. Format recent scores data for the prompt (example)
  // The SELF_SCORE_ANALYSIS_PROMPT expects CURRENT_SELF_SCORES.
  // For a historical analysis, we might need to adapt the prompt or how we present this data.
  // For now, let's use the most recent score as "current" and provide historical as context.
  const latestScoresForPrompt = recentScores[0];
  const historicalScoresText = recentScores.map(s =>
    `Date: ${s.date}, Diet: ${s.dietScore}, Exercise: ${s.exerciseScore}, Meds: ${s.medicationScore}`
  ).join('\n');

  // 4. Construct the user part of the prompt using data from mcpBundle and recentScores
  // SELF_SCORE_ANALYSIS_PROMPT already defines the AI's role and desired JSON output.
  // We primarily need to fill in the patient-specific parts.
  const userPromptForLLM = `
PATIENT CONTEXT (anonymized and secure):
Patient ID: ${mcpBundle.user_id_pseudonym}

CARE PLAN DIRECTIVES (already PII-redacted by AIContextService):
${mcpBundle.care_plan_directives}

MOST RECENT SELF-SCORES (for immediate focus):
Diet: ${latestScoresForPrompt.dietScore}/10
Exercise: ${latestScoresForPrompt.exerciseScore}/10
Medication: ${latestScoresForPrompt.medicationScore}/10
Date: ${latestScoresForPrompt.date}

RECENT HEALTH METRICS (includes latest_scores from bundle, and historical for trend):
${JSON.stringify(mcpBundle.health_metrics, null, 2)}
Historical Scores (last ${N_DAYS_AGO} days, most recent first):
${historicalScoresText}

YOUR TASK: Analyze these self-scores (focusing on the MOST RECENT but considering trends from historical) and provide immediate, personalized feedback as per the system prompt's JSON structure.
Ensure recommendations are actionable and reference KGC features if applicable.
`;

  // 5. Call the AI model (OpenAI) directly with the standardized system prompt
  try {
    secureLog(`[${functionName}] Calling OpenAI for user.`, { userId });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using a capable model
      messages: [
        { role: 'system', content: SELF_SCORE_ANALYSIS_PROMPT },
        { role: 'user', content: userPromptForLLM }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5, // Slightly lower temp for more factual analysis
    });

    const llmResponse = completion.choices[0]?.message?.content;
    if (!llmResponse) {
      secureLog(`[${functionName}] LLM returned empty response for user.`, { userId });
      throw new Error("LLM returned empty response.");
    }

    // Validate AI response for PII before parsing/returning (final check)
    const validatedResponse = await AIContextService.validateAIResponse(llmResponse, "score-analysis-session"); // Placeholder session ID
    if (!validatedResponse.isSecure) {
        secureLog(`[${functionName}] PII found in LLM response for user, returning sanitized.`, { userId, violations: validatedResponse.violations });
    }

    secureLog(`[${functionName}] Successfully generated analysis for user.`, { userId });
    return JSON.parse(validatedResponse.sanitizedResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    secureLog(`[${functionName}] Error generating or parsing score analysis for user.`, { userId, error: errorMessage });
    console.error("Error generating or parsing score analysis:", error); // Keep console.error for dev visibility
    return {
      summary: "I was unable to generate a detailed analysis at this time. Your scores have been recorded.",
      recommendations: ["Please try again later or discuss your scores with me in the chat."],
      trendAnalysis: "Unavailable",
      isImproving: false,
    };
  }
}