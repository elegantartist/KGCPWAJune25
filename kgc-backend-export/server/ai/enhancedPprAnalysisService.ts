import { db } from "../db";
import { healthMetrics, patientScores, patientBadges, featureUsage, chatMemory, progressMilestones } from "@shared/schema";
import { eq, and, between, desc, gte, lte, avg, count, max, min } from "drizzle-orm";
import { generateSystemRecommendations } from "./mcpService";
import OpenAI from "openai";

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Helper functions for date handling in database queries
function dateToISOString(date: Date): string {
  return date.toISOString();
}

// Function to safely use Date objects with between operator
function betweenDates(column: any, startDate: Date, endDate: Date) {
  return and(
    gte(column, startDate),
    lte(column, endDate)
  );
}

/**
 * Enhanced PPR Analysis Service
 * Provides advanced analytical capabilities for Patient Progress Reports
 */

// Analyze patterns in patient's self-scores
export async function analyzeScorePatterns(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    // Get all self scores in the period
    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          betweenDates(patientScores.scoreDate, startDate, endDate)
        )
      )
      .orderBy(patientScores.scoreDate);
    
    if (!scores.length) {
      return {
        patternFound: false,
        description: "Insufficient data to identify patterns",
        consistency: 0,
        dayOfWeekAnalysis: {},
        weekendVsWeekday: { weekend: 0, weekday: 0 },
        volatility: 0
      };
    }

    // Calculate score statistics
    const medicationScores = scores.map(s => s.medicationSelfScore).filter(Boolean) as number[];
    const dietScores = scores.map(s => s.mealPlanSelfScore).filter(Boolean) as number[];
    const exerciseScores = scores.map(s => s.exerciseSelfScore).filter(Boolean) as number[];
    
    // Process the scores to identify patterns
    const dayOfWeekAnalysis = calculateDayOfWeekScores(scores);
    const weekendVsWeekday = compareWeekendWeekdayScores(scores);
    const volatility = calculateScoreVolatility([...medicationScores, ...dietScores, ...exerciseScores]);
    const consistency = calculateConsistency(scores);
    
    // Deeper pattern analysis 
    const trends = identifyScoreTrends(scores);
    const patternFound = volatility < 2.0 || trends.hasConsistentPattern;
    
    return {
      patternFound,
      description: generatePatternDescription(trends, volatility, consistency, dayOfWeekAnalysis, weekendVsWeekday),
      consistency,
      dayOfWeekAnalysis,
      weekendVsWeekday,
      volatility,
      trends
    };
  } catch (error) {
    console.error("Error analyzing score patterns:", error);
    throw error;
  }
}

// Calculate average scores by day of week
function calculateDayOfWeekScores(scores: any[]) {
  const dayScores: Record<string, { count: number, total: Record<string, number>, avg: Record<string, number> }> = {
    "Sunday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } },
    "Monday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } },
    "Tuesday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } },
    "Wednesday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } },
    "Thursday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } },
    "Friday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } },
    "Saturday": { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } }
  };
  
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  scores.forEach(score => {
    const date = new Date(score.scoreDate);
    const day = days[date.getDay()];
    
    dayScores[day].count++;
    
    if (score.medicationSelfScore) {
      dayScores[day].total.medication += score.medicationSelfScore;
    }
    if (score.mealPlanSelfScore) {
      dayScores[day].total.diet += score.mealPlanSelfScore;
    }
    if (score.exerciseSelfScore) {
      dayScores[day].total.exercise += score.exerciseSelfScore;
    }
  });
  
  // Calculate averages
  days.forEach(day => {
    const dayData = dayScores[day];
    if (dayData.count > 0) {
      dayData.avg.medication = dayData.total.medication / dayData.count;
      dayData.avg.diet = dayData.total.diet / dayData.count;
      dayData.avg.exercise = dayData.total.exercise / dayData.count;
    }
  });
  
  return dayScores;
}

// Compare weekend vs weekday scores
function compareWeekendWeekdayScores(scores: any[]) {
  const weekend = { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } };
  const weekday = { count: 0, total: { medication: 0, diet: 0, exercise: 0 }, avg: { medication: 0, diet: 0, exercise: 0 } };
  
  scores.forEach(score => {
    const date = new Date(score.scoreDate);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6; // Sunday or Saturday
    
    const category = isWeekend ? weekend : weekday;
    category.count++;
    
    if (score.medicationSelfScore) {
      category.total.medication += score.medicationSelfScore;
    }
    if (score.mealPlanSelfScore) {
      category.total.diet += score.mealPlanSelfScore;
    }
    if (score.exerciseSelfScore) {
      category.total.exercise += score.exerciseSelfScore;
    }
  });
  
  // Calculate averages
  if (weekend.count > 0) {
    weekend.avg.medication = weekend.total.medication / weekend.count;
    weekend.avg.diet = weekend.total.diet / weekend.count;
    weekend.avg.exercise = weekend.total.exercise / weekend.count;
  }
  
  if (weekday.count > 0) {
    weekday.avg.medication = weekday.total.medication / weekday.count;
    weekday.avg.diet = weekday.total.diet / weekday.count;
    weekday.avg.exercise = weekday.total.exercise / weekday.count;
  }
  
  return { weekend: weekend.avg, weekday: weekday.avg };
}

// Calculate volatility in scores
function calculateScoreVolatility(scores: number[]) {
  if (scores.length < 2) return 0;
  
  let totalChange = 0;
  
  for (let i = 1; i < scores.length; i++) {
    totalChange += Math.abs(scores[i] - scores[i-1]);
  }
  
  return totalChange / (scores.length - 1);
}

// Calculate consistency of scoring (how regularly the patient records scores)
function calculateConsistency(scores: any[]) {
  if (scores.length < 2) return 0;
  
  // Get date range
  const startDate = new Date(scores[0].scoreDate);
  const endDate = new Date(scores[scores.length - 1].scoreDate);
  
  // Calculate total days in range
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate percentage of days with scores
  return Math.min(1, scores.length / daysDiff);
}

// Identify trends in scores over time
function identifyScoreTrends(scores: any[]) {
  if (scores.length < 7) {
    return {
      medicationTrend: "insufficient_data",
      dietTrend: "insufficient_data", 
      exerciseTrend: "insufficient_data",
      hasConsistentPattern: false
    };
  }
  
  // Simple linear regression for each score type
  const medicationTrend = calculateScoreTrend(scores.map((s, i) => ({ index: i, score: s.medicationSelfScore })));
  const dietTrend = calculateScoreTrend(scores.map((s, i) => ({ index: i, score: s.mealPlanSelfScore })));
  const exerciseTrend = calculateScoreTrend(scores.map((s, i) => ({ index: i, score: s.exerciseSelfScore })));
  
  // Check if there's a consistent pattern across all three categories
  const hasConsistentPattern = 
    (medicationTrend === dietTrend && dietTrend === exerciseTrend) ||
    (medicationTrend !== "flat" && dietTrend !== "flat" && exerciseTrend !== "flat");
  
  return {
    medicationTrend,
    dietTrend,
    exerciseTrend,
    hasConsistentPattern
  };
}

// Calculate trend for a specific score type
function calculateScoreTrend(data: { index: number, score: number | null }[]) {
  // Filter out null scores
  const filteredData = data.filter(d => d.score !== null);
  
  if (filteredData.length < 5) return "insufficient_data";
  
  // Calculate means
  const n = filteredData.length;
  const meanX = filteredData.reduce((sum, d) => sum + d.index, 0) / n;
  const meanY = filteredData.reduce((sum, d) => sum + (d.score || 0), 0) / n;
  
  // Calculate slope (m) using least squares
  let numerator = 0;
  let denominator = 0;
  
  filteredData.forEach(d => {
    numerator += (d.index - meanX) * ((d.score || 0) - meanY);
    denominator += Math.pow(d.index - meanX, 2);
  });
  
  if (denominator === 0) return "flat";
  
  const slope = numerator / denominator;
  
  // Determine trend based on slope
  if (Math.abs(slope) < 0.05) return "flat";
  return slope > 0 ? "improving" : "declining";
}

// Generate a human-readable description of the patterns
function generatePatternDescription(
  trends: any, 
  volatility: number, 
  consistency: number, 
  dayAnalysis: any, 
  weekendComparison: any
) {
  let description = "";
  
  // Add trends info
  if (trends.medicationTrend === "improving" && trends.dietTrend === "improving" && trends.exerciseTrend === "improving") {
    description += "The patient is showing consistent improvement across all health metrics. ";
  } else if (trends.medicationTrend === "declining" && trends.dietTrend === "declining" && trends.exerciseTrend === "declining") {
    description += "The patient is showing a concerning decline across all health metrics. ";
  } else if (trends.hasConsistentPattern) {
    description += "The patient is showing some consistent patterns in their health metrics. ";
  } else {
    description += "The patient's health metrics show mixed trends. ";
  }
  
  // Add volatility info
  if (volatility < 1.0) {
    description += "Their scores are very stable with minimal day-to-day fluctuations. ";
  } else if (volatility < 2.0) {
    description += "Their scores show moderate fluctuations. ";
  } else {
    description += "Their scores show significant volatility, suggesting inconsistent adherence. ";
  }
  
  // Add consistency info
  if (consistency > 0.9) {
    description += "The patient is exceptionally consistent in recording their daily scores. ";
  } else if (consistency > 0.7) {
    description += "The patient is quite regular in recording their scores. ";
  } else if (consistency > 0.5) {
    description += "The patient records their scores with moderate consistency. ";
  } else {
    description += "The patient is inconsistent in recording their daily scores. ";
  }
  
  // Add day of week patterns if significant
  const dayScores = Object.entries(dayAnalysis).map(([day, data]) => ({ 
    day, 
    avg: (data as any).avg 
  }));
  
  const bestDay = dayScores.reduce((best, current) => {
    const currentAvg = (current.avg.medication + current.avg.diet + current.avg.exercise) / 3;
    const bestAvg = (best.avg.medication + best.avg.diet + best.avg.exercise) / 3;
    return currentAvg > bestAvg ? current : best;
  }, dayScores[0]);
  
  const worstDay = dayScores.reduce((worst, current) => {
    if ((current.avg.medication + current.avg.diet + current.avg.exercise) === 0) return worst; // Skip days with no data
    const currentAvg = (current.avg.medication + current.avg.diet + current.avg.exercise) / 3;
    const worstAvg = (worst.avg.medication + worst.avg.diet + worst.avg.exercise) / 3;
    return currentAvg < worstAvg && currentAvg > 0 ? current : worst;
  }, dayScores.find(d => (d.avg.medication + d.avg.diet + d.avg.exercise) > 0) || dayScores[0]);
  
  const bestDayAvg = (bestDay.avg.medication + bestDay.avg.diet + bestDay.avg.exercise) / 3;
  const worstDayAvg = (worstDay.avg.medication + worstDay.avg.diet + worstDay.avg.exercise) / 3;
  
  if (bestDayAvg > 0 && worstDayAvg > 0 && (bestDayAvg - worstDayAvg) > 1.5) {
    description += `Their best day tends to be ${bestDay.day} (avg: ${bestDayAvg.toFixed(1)}), while they struggle most on ${worstDay.day} (avg: ${worstDayAvg.toFixed(1)}). `;
  }
  
  // Add weekend vs weekday comparison if significant
  const weekendAvg = (weekendComparison.weekend.medication + weekendComparison.weekend.diet + weekendComparison.weekend.exercise) / 3;
  const weekdayAvg = (weekendComparison.weekday.medication + weekendComparison.weekday.diet + weekendComparison.weekday.exercise) / 3;
  
  if (weekendAvg > 0 && weekdayAvg > 0 && Math.abs(weekendAvg - weekdayAvg) > 1.0) {
    const better = weekendAvg > weekdayAvg ? "weekends" : "weekdays";
    description += `They tend to score higher during ${better}. `;
  }
  
  return description;
}

// Calculate overall CPD adherence rate
export async function calculateAdherenceRate(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          betweenDates(patientScores.scoreDate, startDate, endDate)
        )
      );
    
    if (!scores.length) return 0;
    
    let totalScores = 0;
    let totalPossibleScores = scores.length * 3; // 3 categories per day
    let scoreSum = 0;
    
    scores.forEach(score => {
      if (score.medicationSelfScore) {
        totalScores++;
        scoreSum += score.medicationSelfScore;
      }
      if (score.mealPlanSelfScore) {
        totalScores++;
        scoreSum += score.mealPlanSelfScore;
      }
      if (score.exerciseSelfScore) {
        totalScores++;
        scoreSum += score.exerciseSelfScore;
      }
    });
    
    if (totalScores === 0) return 0;
    
    // Calculate adherence: average score / 10 (max score) * reporting consistency
    const averageScore = scoreSum / totalScores;
    const reportingConsistency = totalScores / totalPossibleScores;
    
    return (averageScore / 10) * reportingConsistency;
  } catch (error) {
    console.error("Error calculating adherence rate:", error);
    throw error;
  }
}

// Calculate consistency metrics across different dimensions
export async function calculateConsistencyMetrics(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          betweenDates(patientScores.scoreDate, startDate, endDate)
        )
      )
      .orderBy(patientScores.scoreDate);
    
    // Get feature usage
    const featureUsageData = await db
      .select()
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, patientId),
          betweenDates(featureUsage.lastUsed, startDate, endDate)
        )
      );
    
    // Calculate days between app logins
    const loginDates = Array.from(new Set(featureUsageData.map(f => {
      const date = new Date(f.lastUsed);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    })));
    
    const daysBetweenScores = calculateDaysBetweenEntries(scores.map(s => new Date(s.scoreDate)));
    const daysBetweenLogins = calculateDaysBetweenEntries(loginDates.map(d => new Date(d)));
    
    // Calculate standard deviation of self-scores to measure consistency
    const medicationScores = scores.map(s => s.medicationSelfScore).filter(Boolean) as number[];
    const dietScores = scores.map(s => s.mealPlanSelfScore).filter(Boolean) as number[];
    const exerciseScores = scores.map(s => s.exerciseSelfScore).filter(Boolean) as number[];
    
    const medicationStdDev = calculateStandardDeviation(medicationScores);
    const dietStdDev = calculateStandardDeviation(dietScores);
    const exerciseStdDev = calculateStandardDeviation(exerciseScores);
    
    return {
      scoringConsistency: scores.length / countDaysBetween(startDate, endDate),
      loginConsistency: loginDates.length / countDaysBetween(startDate, endDate),
      averageDaysBetweenScores: daysBetweenScores,
      averageDaysBetweenLogins: daysBetweenLogins,
      scoreVariability: {
        medication: medicationStdDev,
        diet: dietStdDev,
        exercise: exerciseStdDev
      }
    };
  } catch (error) {
    console.error("Error calculating consistency metrics:", error);
    throw error;
  }
}

// Count days between two dates
function countDaysBetween(startDate: Date, endDate: Date) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// Calculate average days between entries
function calculateDaysBetweenEntries(dates: Date[]) {
  if (dates.length < 2) return 0;
  
  // Sort dates
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  
  let totalDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const days = Math.floor((sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
    totalDays += days;
  }
  
  return totalDays / (sortedDates.length - 1);
}

// Calculate standard deviation
function calculateStandardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

// Generate behavior insights using AI
export async function generateBehaviorInsights(
  patientId: number, 
  startDate: Date, 
  endDate: Date,
  patientData?: any
) {
  try {
    // Get chat memories for the period
    const memories = await db
      .select()
      .from(chatMemory)
      .where(
        and(
          eq(chatMemory.userId, patientId),
          betweenDates(chatMemory.createdAt, startDate, endDate)
        )
      )
      .orderBy(desc(chatMemory.createdAt))
      .limit(50); // Limit to most recent memories
    
    // If patientData is not provided, calculate it here
    if (!patientData) {
      // Calculate average scores from patient_scores table
      const scores = await db
        .select()
        .from(patientScores)
        .where(
          and(
            eq(patientScores.patientId, patientId),
            betweenDates(patientScores.scoreDate, startDate, endDate)
          )
        );
        
      const avgMedicationScore = scores.reduce((sum, s) => sum + (s.medicationSelfScore || 0), 0) / (scores.length || 1);
      const avgDietScore = scores.reduce((sum, s) => sum + (s.mealPlanSelfScore || 0), 0) / (scores.length || 1);
      const avgExerciseScore = scores.reduce((sum, s) => sum + (s.exerciseSelfScore || 0), 0) / (scores.length || 1);
      
      // Get feature usage data
      const features = await db
        .select()
        .from(featureUsage)
        .where(
          and(
            eq(featureUsage.userId, patientId),
            betweenDates(featureUsage.lastUsed, startDate, endDate)
          )
        );
        
      patientData = {
        metrics: {
          medication: avgMedicationScore,
          diet: avgDietScore,
          exercise: avgExerciseScore
        },
        featureUsage: features
      };
    }
    
    // Prepare contextual information for the AI
    const behaviorContext = {
      scorePatterns: await analyzeScorePatterns(patientId, startDate, endDate),
      adherenceRate: await calculateAdherenceRate(patientId, startDate, endDate),
      consistencyMetrics: await calculateConsistencyMetrics(patientId, startDate, endDate),
      recentChatMemories: memories.map(m => m.content).join("\n"),
      patientMetrics: {
        avgMedicationScore: patientData.metrics.medication,
        avgDietScore: patientData.metrics.diet,
        avgExerciseScore: patientData.metrics.exercise
      },
      featureUsage: patientData.featureUsage || []
    };
    
    const systemPrompt = `
      You are an AI health analytics assistant for Keep Going Care, analyzing patient behavior patterns.
      Generate insightful observations about the patient's health behaviors, focusing on:
      1. Behavioral patterns related to medication, diet, and exercise adherence
      2. Engagement patterns with the app and specific features
      3. Potential barriers to adherence based on the data
      4. Motivators and demotivators for the patient
      5. Recommendations for the doctor to help improve patient outcomes
      
      Provide your analysis in JSON format with the following structure:
      {
        "keyBehaviorPatterns": [list of 3-5 key behavior patterns identified],
        "adherenceFactors": {
          "facilitators": [factors that help the patient adhere to their care plan],
          "barriers": [factors that hinder adherence]
        },
        "engagementInsights": [insights about how the patient engages with their care],
        "recommendationsForDoctor": [actionable recommendations]
      }
    `;
    
    // Call OpenAI for analysis
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt + "\nRespond in valid JSON format." },
        { role: "user", content: JSON.stringify(behaviorContext, null, 2) }
      ]
    });
    
    const insightsText = response.choices[0].message.content;
    
    // Parse the response
    try {
      // Log the response for debugging
      console.log("AI Response:", insightsText);
      
      // Remove any markdown code block syntax that OpenAI might be adding
      let cleanedText = insightsText || "{}";
      cleanedText = cleanedText.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '');
      
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Error parsing AI response:", e);
      console.error("Raw response:", insightsText);
      return {
        keyBehaviorPatterns: ["Error generating behavior insights"],
        adherenceFactors: {
          facilitators: [],
          barriers: []
        },
        engagementInsights: [],
        recommendationsForDoctor: []
      };
    }
  } catch (error) {
    console.error("Error generating behavior insights:", error);
    throw error;
  }
}

// Project improvement trajectory
export async function projectImprovementTrajectory(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    // Get health metrics sorted by date
    const metrics = await db
      .select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.userId, patientId),
          betweenDates(healthMetrics.date, startDate, endDate)
        )
      )
      .orderBy(healthMetrics.date);
    
    if (metrics.length < 7) {
      return {
        projectionBasis: "insufficient_data",
        medicationProjection: null,
        dietProjection: null,
        exerciseProjection: null,
        projectedOverallTrend: "unable_to_determine"
      };
    }
    
    // Calculate linear regression for each metric
    const medicationProjection = calculateMetricProjection(
      metrics.map(m => ({ date: new Date(m.date), score: m.medicationScore })),
      30 // Project 30 days into the future
    );
    
    const dietProjection = calculateMetricProjection(
      metrics.map(m => ({ date: new Date(m.date), score: m.dietScore })),
      30
    );
    
    const exerciseProjection = calculateMetricProjection(
      metrics.map(m => ({ date: new Date(m.date), score: m.exerciseScore })),
      30
    );
    
    // Determine overall projected trend
    const projectedOverallTrend = determineOverallTrend(
      medicationProjection,
      dietProjection,
      exerciseProjection
    );
    
    return {
      projectionBasis: "linear_regression",
      medicationProjection,
      dietProjection,
      exerciseProjection,
      projectedOverallTrend
    };
  } catch (error) {
    console.error("Error projecting improvement trajectory:", error);
    throw error;
  }
}

// Calculate projection for a specific metric
function calculateMetricProjection(data: { date: Date, score: number | null }[], daysAhead: number) {
  // Filter out null scores
  const filteredData = data.filter(d => d.score !== null);
  
  if (filteredData.length < 5) {
    return {
      currentValue: filteredData.length ? filteredData[filteredData.length - 1].score : null,
      projectedValue: null,
      trend: "insufficient_data",
      confidence: 0
    };
  }
  
  // Convert dates to numerical values (days since first date)
  const firstDate = filteredData[0].date.getTime();
  const numericalData = filteredData.map(d => ({
    x: (d.date.getTime() - firstDate) / (1000 * 60 * 60 * 24), // days since first date
    y: d.score || 0
  }));
  
  // Calculate linear regression
  const n = numericalData.length;
  const sumX = numericalData.reduce((sum, d) => sum + d.x, 0);
  const sumY = numericalData.reduce((sum, d) => sum + d.y, 0);
  const sumXY = numericalData.reduce((sum, d) => sum + (d.x * d.y), 0);
  const sumXX = numericalData.reduce((sum, d) => sum + (d.x * d.x), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate correlation coefficient to determine confidence
  const sumYY = numericalData.reduce((sum, d) => sum + (d.y * d.y), 0);
  const r = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  // Calculate projected value
  const lastDay = numericalData[numericalData.length - 1].x;
  const projectionDay = lastDay + daysAhead;
  const projectedValue = intercept + slope * projectionDay;
  
  // Determine trend
  let trend = "stable";
  if (Math.abs(slope) < 0.01) {
    trend = "stable";
  } else if (slope > 0) {
    trend = slope > 0.05 ? "strongly_improving" : "slightly_improving";
  } else {
    trend = slope < -0.05 ? "strongly_declining" : "slightly_declining";
  }
  
  return {
    currentValue: filteredData[filteredData.length - 1].score,
    projectedValue: Math.max(0, Math.min(10, projectedValue)), // Clamp between 0 and 10
    trend,
    confidence: Math.abs(r) // 0 to 1 range
  };
}

// Determine overall trend from individual metric projections
function determineOverallTrend(
  medicationProjection: any,
  dietProjection: any,
  exerciseProjection: any
) {
  // Count trends by category
  const trends: Record<string, number> = {
    "strongly_improving": 0,
    "slightly_improving": 0,
    "stable": 0,
    "slightly_declining": 0,
    "strongly_declining": 0,
    "insufficient_data": 0
  };
  
  if (medicationProjection.trend) trends[medicationProjection.trend]++;
  if (dietProjection.trend) trends[dietProjection.trend]++;
  if (exerciseProjection.trend) trends[exerciseProjection.trend]++;
  
  // Determine dominant trend
  if (trends.insufficient_data >= 2) return "insufficient_data";
  
  const improvingCount = trends.strongly_improving + trends.slightly_improving;
  const decliningCount = trends.strongly_declining + trends.slightly_declining;
  const stableCount = trends.stable;
  
  if (improvingCount > decliningCount && improvingCount > stableCount) {
    return "improving";
  } else if (decliningCount > improvingCount && decliningCount > stableCount) {
    return "declining";
  } else if (stableCount >= improvingCount && stableCount >= decliningCount) {
    return "stable";
  } else {
    return "mixed";
  }
}

// Calculate overall engagement score
export async function calculateEngagementScore(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    // Get all relevant data
    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          betweenDates(patientScores.scoreDate, startDate, endDate)
        )
      );
    
    const featureUsageData = await db
      .select()
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, patientId),
          betweenDates(featureUsage.lastUsed, startDate, endDate)
        )
      );
    
    const chatHistoryCount = await db
      .select({ count: count() })
      .from(chatMemory)
      .where(
        and(
          eq(chatMemory.userId, patientId),
          betweenDates(chatMemory.createdAt, startDate, endDate)
        )
      );
    
    // Calculate days in the period
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate score components
    
    // 1. Daily score reporting consistency (30 points max)
    const distinctScoreDates = new Set(scores.map(s => new Date(s.scoreDate).toISOString().split('T')[0])).size;
    const scoringConsistency = Math.min(1, distinctScoreDates / totalDays);
    const scoringScore = scoringConsistency * 30;
    
    // 2. Feature usage diversity and frequency (30 points max)
    const distinctFeatures = new Set(featureUsageData.map(f => f.featureName)).size;
    const totalFeatureUsage = featureUsageData.reduce((sum, f) => sum + f.usageCount, 0);
    const featureUsageScore = Math.min(30, distinctFeatures * 3 + Math.min(15, totalFeatureUsage / 10));
    
    // 3. Chatbot interaction frequency (20 points max)
    const chatFrequency = Math.min(20, chatHistoryCount[0]?.count || 0);
    
    // 4. Score levels (20 points max)
    let totalScoreValue = 0;
    let scoreCount = 0;
    
    scores.forEach(score => {
      if (score.medicationSelfScore) {
        totalScoreValue += score.medicationSelfScore;
        scoreCount++;
      }
      if (score.mealPlanSelfScore) {
        totalScoreValue += score.mealPlanSelfScore;
        scoreCount++;
      }
      if (score.exerciseSelfScore) {
        totalScoreValue += score.exerciseSelfScore;
        scoreCount++;
      }
    });
    
    const averageScore = scoreCount > 0 ? totalScoreValue / scoreCount : 0;
    const scoreValue = Math.min(20, averageScore * 2);
    
    // Calculate total engagement score (0-100)
    const engagementScore = scoringScore + featureUsageScore + chatFrequency + scoreValue;
    
    return Math.round(engagementScore);
  } catch (error) {
    console.error("Error calculating engagement score:", error);
    throw error;
  }
}

// Generate health trends data for visualizations
export async function generateHealthTrends(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    // Get all metrics for the period
    const metrics = await db
      .select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.userId, patientId),
          betweenDates(healthMetrics.date, startDate, endDate)
        )
      )
      .orderBy(healthMetrics.date);
    
    // Get all self-scores for the period
    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          betweenDates(patientScores.scoreDate, startDate, endDate)
        )
      )
      .orderBy(patientScores.scoreDate);
    
    // Get all feature usage for the period
    const featureUsageData = await db
      .select({
        featureName: featureUsage.featureName,
        usageCount: count(featureUsage.usageCount),
        lastUsedDate: max(featureUsage.lastUsed)
      })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, patientId),
          betweenDates(featureUsage.lastUsed, startDate, endDate)
        )
      )
      .groupBy(featureUsage.featureName);
    
    // Prepare daily scores trend data
    const dailyScoresTrend = scores.map(score => ({
      date: new Date(score.scoreDate).toISOString().split('T')[0],
      medication: score.medicationSelfScore,
      diet: score.mealPlanSelfScore,
      exercise: score.exerciseSelfScore
    }));
    
    // Prepare weekly averages trend data
    const weeklyAverages = calculateWeeklyAverages(scores);
    
    // Prepare feature usage data
    const featureUsageTrend = featureUsageData.map((usage: any) => ({
      feature: usage.featureName,
      count: Number(usage.usageCount),
      lastUsed: usage.lastUsedDate ? new Date(usage.lastUsedDate).toISOString().split('T')[0] : ''
    }));
    
    // Prepare score distributions data
    const scoreDistributions = calculateScoreDistributions(scores);
    
    return {
      dailyScoresTrend,
      weeklyAverages,
      featureUsageTrend,
      scoreDistributions
    };
  } catch (error) {
    console.error("Error generating health trends:", error);
    throw error;
  }
}

// Calculate weekly averages
function calculateWeeklyAverages(scores: any[]) {
  if (!scores.length) return [];
  
  // Group scores by week
  const weekMap = new Map<string, any[]>();
  
  scores.forEach(score => {
    const date = new Date(score.scoreDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Move to Sunday
    
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    
    weekMap.get(weekKey)?.push(score);
  });
  
  // Calculate averages for each week
  const weeklyAverages = Array.from(weekMap.entries()).map(([weekStart, weekScores]) => {
    let medicationSum = 0;
    let medicationCount = 0;
    let dietSum = 0;
    let dietCount = 0;
    let exerciseSum = 0;
    let exerciseCount = 0;
    
    weekScores.forEach(score => {
      if (score.medicationSelfScore) {
        medicationSum += score.medicationSelfScore;
        medicationCount++;
      }
      if (score.mealPlanSelfScore) {
        dietSum += score.mealPlanSelfScore;
        dietCount++;
      }
      if (score.exerciseSelfScore) {
        exerciseSum += score.exerciseSelfScore;
        exerciseCount++;
      }
    });
    
    return {
      weekStarting: weekStart,
      medication: medicationCount > 0 ? medicationSum / medicationCount : null,
      diet: dietCount > 0 ? dietSum / dietCount : null,
      exercise: exerciseCount > 0 ? exerciseSum / exerciseCount : null
    };
  });
  
  return weeklyAverages;
}

// Calculate score distributions
function calculateScoreDistributions(scores: any[]) {
  // Initialize distribution counters
  const medicationDistribution: number[] = Array(11).fill(0); // 0-10 scores
  const dietDistribution: number[] = Array(11).fill(0);
  const exerciseDistribution: number[] = Array(11).fill(0);
  
  // Count occurrences of each score value
  scores.forEach(score => {
    if (score.medicationSelfScore !== null) {
      medicationDistribution[score.medicationSelfScore]++;
    }
    if (score.mealPlanSelfScore !== null) {
      dietDistribution[score.mealPlanSelfScore]++;
    }
    if (score.exerciseSelfScore !== null) {
      exerciseDistribution[score.exerciseSelfScore]++;
    }
  });
  
  return {
    medication: medicationDistribution,
    diet: dietDistribution,
    exercise: exerciseDistribution
  };
}

// Get patient progress milestone badges
export async function getPatientProgressBadges(
  patientId: number, 
  startDate: Date, 
  endDate: Date
) {
  try {
    // Get all badges for the patient
    const badges = await db
      .select()
      .from(patientBadges)
      .where(
        and(
          eq(patientBadges.patientId, patientId),
          betweenDates(patientBadges.earnedDate, startDate, endDate)
        )
      )
      .orderBy(patientBadges.earnedDate);
    
    if (!badges.length) {
      return {
        totalBadges: 0,
        recentBadges: [],
        badgeCategoryCounts: {},
        badgeLevels: {},
        summary: "No progress milestone badges have been earned in this period."
      };
    }
    
    // Count badges by type (category)
    const badgeCategoryCounts: Record<string, number> = {};
    badges.forEach(badge => {
      badgeCategoryCounts[badge.badgeType] = (badgeCategoryCounts[badge.badgeType] || 0) + 1;
    });
    
    // Count badges by level
    const badgeLevels: Record<string, number> = {};
    badges.forEach(badge => {
      badgeLevels[badge.badgeLevel] = (badgeLevels[badge.badgeLevel] || 0) + 1;
    });
    
    // Create a summary of badge achievements
    let summary = `Patient has earned ${badges.length} badge(s) during this period. `;
    
    // Add category breakdown
    if (Object.keys(badgeCategoryCounts).length > 0) {
      summary += "Badges by category: ";
      summary += Object.entries(badgeCategoryCounts)
        .map(([category, count]) => `${category} (${count})`)
        .join(", ");
      summary += ". ";
    }
    
    // Add level breakdown
    if (Object.keys(badgeLevels).length > 0) {
      summary += "Badges by level: ";
      summary += Object.entries(badgeLevels)
        .map(([level, count]) => `${level} (${count})`)
        .join(", ");
      summary += ".";
    }
    
    // Find the highest badge level achieved
    const badgeLevelOrder = { "bronze": 1, "silver": 2, "gold": 3, "platinum": 4 };
    const highestLevel = badges.reduce((highest, badge) => {
      const currentLevel = badgeLevelOrder[badge.badgeLevel.toLowerCase() as keyof typeof badgeLevelOrder] || 0;
      const highestLevelValue = badgeLevelOrder[highest.toLowerCase() as keyof typeof badgeLevelOrder] || 0;
      return currentLevel > highestLevelValue ? badge.badgeLevel : highest;
    }, "none");
    
    if (highestLevel !== "none") {
      summary += ` Highest badge level achieved: ${highestLevel}.`;
    }
    
    return {
      totalBadges: badges.length,
      recentBadges: badges.map(b => ({
        id: b.id,
        type: b.badgeType,
        level: b.badgeLevel,
        earnedDate: b.earnedDate
      })).slice(0, 5), // Get 5 most recent badges
      badgeCategoryCounts,
      badgeLevels,
      highestLevel,
      summary
    };
  } catch (error) {
    console.error("Error fetching patient badges:", error);
    return {
      totalBadges: 0,
      recentBadges: [],
      badgeCategoryCounts: {},
      badgeLevels: {},
      summary: "Error fetching badge information."
    };
  }
}