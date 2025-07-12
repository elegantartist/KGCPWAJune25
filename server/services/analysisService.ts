import { db } from '../db';
// Changed import path for @shared/schema
import { patientScores, carePlanDirectives as cpdSchema, patients } from '../src/shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { AIContextService } from './aiContextService';
import { SELF_SCORE_ANALYSIS_PROMPT } from './prompt_templates';
import OpenAI from 'openai';
import { secureLog, redactPiiFromText } from './privacyMiddleware';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateScoreAnalysis(userId: number) {
  const functionName = "generateScoreAnalysis";
  secureLog(`[${functionName}] Starting for user`, { userId });

  const N_DAYS_AGO = 14;
  const nDaysAgoDate = new Date();
  nDaysAgoDate.setDate(nDaysAgoDate.getDate() - N_DAYS_AGO);

  const recentScores = await db
    .select({
      date: patientScores.scoreDate,
      dietScore: patientScores.mealPlanSelfScore,
      exerciseScore: patientScores.exerciseSelfScore,
      medicationScore: patientScores.medicationSelfScore,
    })
    .from(patientScores)
    .where(and(eq(patientScores.patientId, userId), gte(patientScores.scoreDate, nDaysAgoDate.toISOString().split('T')[0])))
    .orderBy(desc(patientScores.scoreDate))
    .limit(N_DAYS_AGO);

  if (recentScores.length < 1) {
    secureLog(`[${functionName}] Not enough recent score data for analysis for user.`, { userId });
    return { summary: "Not enough recent data for an analysis. Keep logging your scores daily!", recommendations: [] };
  }

  let mcpBundle;
  try {
    const contextResponse = await AIContextService.prepareSecureContext({
      userId,
      includeHealthMetrics: true,
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

  const latestScoresForPrompt = recentScores[0];
  const historicalScoresText = recentScores.map(s =>
    `Date: ${s.date}, Diet: ${s.dietScore}, Exercise: ${s.exerciseScore}, Meds: ${s.medicationScore}`
  ).join('\n');

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

  try {
    secureLog(`[${functionName}] Calling OpenAI for user.`, { userId });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SELF_SCORE_ANALYSIS_PROMPT },
        { role: 'user', content: userPromptForLLM }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const llmResponse = completion.choices[0]?.message?.content;
    if (!llmResponse) {
      secureLog(`[${functionName}] LLM returned empty response for user.`, { userId });
      throw new Error("LLM returned empty response.");
    }

    const validatedResponse = await AIContextService.validateAIResponse(llmResponse, "score-analysis-session");
    if (!validatedResponse.isSecure) {
        secureLog(`[${functionName}] PII found in LLM response for user, returning sanitized.`, { userId, violations: validatedResponse.violations });
    }

    secureLog(`[${functionName}] Successfully generated analysis for user.`, { userId });
    return JSON.parse(validatedResponse.sanitizedResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    secureLog(`[${functionName}] Error generating or parsing score analysis for user.`, { userId, error: errorMessage });
    console.error("Error generating or parsing score analysis:", error);
    return {
      summary: "I was unable to generate a detailed analysis at this time. Your scores have been recorded.",
      recommendations: ["Please try again later or discuss your scores with me in the chat."],
      trendAnalysis: "Unavailable",
      isImproving: false,
    };
  }
}
