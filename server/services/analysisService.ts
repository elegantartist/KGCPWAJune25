import { db } from '../db';
import { dailyScores, carePlanDirectives as cpdSchema } from '@shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { generateOpenAIResponse } from '../ai/openai';

const ANALYSIS_PROMPT_TEMPLATE = `
As a healthcare assistant using Australian English spelling and terminology, analyse these recent patient self-scores:

Medication adherence scores: {medicationScores}
Diet adherence scores: {dietScores}
Exercise adherence scores: {exerciseScores}

Relevant care directives: {carePlanDirectives}

Please provide:
1. A positive, encouraging 1-2 paragraph summary of the patient's adherence trends.
2. Specific observations about each area (medication, diet, exercise).
3. Two actionable recommendations for improvement, referencing specific KGC features where appropriate (e.g., "Inspiration Machine D", "E&W Support").
4. A note of recognition if scores are consistently high.

Use Australian English spelling (e.g., "recognised" not "recognized").
Format your response as a valid JSON object with keys: "summary", "medicationObservation", "dietObservation", "exerciseObservation", "recommendations", "recognition".
`;

export async function generateScoreAnalysis(userId: number) {
  // 1. Fetch last 30 days of scores
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const scores = await db
    .select()
    .from(dailyScores)
    .where(and(eq(dailyScores.userId, userId), gte(dailyScores.scoreDate, thirtyDaysAgo.toISOString().split('T')[0])))
    .orderBy(desc(dailyScores.scoreDate));

  if (scores.length < 1) {
    return { summary: "Not enough data for an analysis. Keep logging your scores daily!", recommendations: [] };
  }

  // 2. Fetch active Care Plan Directives
  const patientRecord = await db.query.patients.findFirst({ where: eq(cpdSchema.userId, userId) });
  const cpds = patientRecord ? await db.query.carePlanDirectives.findMany({
    where: and(eq(cpdSchema.patientId, patientRecord.id), eq(cpdSchema.active, true))
  }) : [];

  // 3. Format data for the prompt
  const formatScores = (key: 'dietScore' | 'exerciseScore' | 'medicationScore') => scores.map(s => s[key]).join(', ') || 'N/A';
  const cpdText = cpds.map(c => `${c.category}: ${c.directive}`).join('; ') || 'No specific directives set.';

  // 4. Construct the prompt
  const prompt = ANALYSIS_PROMPT_TEMPLATE
    .replace('{medicationScores}', formatScores('medicationScore'))
    .replace('{dietScores}', formatScores('dietScore'))
    .replace('{exerciseScores}', formatScores('exerciseScore'))
    .replace('{carePlanDirectives}', cpdText);

  // 5. Call the AI model and get a structured response
  try {
    const response = await generateOpenAIResponse(
      prompt,
      "You are an AI health assistant providing structured analysis of patient self-scores. Respond only with the requested JSON object.",
      { response_format: { type: "json_object" } }
    );
    return JSON.parse(response);
  } catch (error) {
    console.error("Error generating or parsing score analysis:", error);
    return {
      summary: "I was unable to generate a detailed analysis at this time, but I have recorded your scores.",
      medicationObservation: "Analysis unavailable.",
      dietObservation: "Analysis unavailable.",
      exerciseObservation: "Analysis unavailable.",
      recommendations: ["Please try again later or discuss your scores with me in the chat."],
      recognition: null
    };
  }
}