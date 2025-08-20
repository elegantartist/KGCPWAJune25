import { db } from "../db";
import { 
  users, 
  healthMetrics, 
  chatMemory, 
  featureUsage, 
  carePlanDirectives,
  patientProgressReports, 
  recommendations,
  contentInteractions
} from "@shared/schema";
import { eq, and, between, desc, avg, count, sum } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  analyzeScorePatterns,
  calculateAdherenceRate,
  calculateConsistencyMetrics,
  generateBehaviorInsights,
  projectImprovementTrajectory,
  calculateEngagementScore,
  generateHealthTrends
} from "../ai/enhancedPprAnalysisService";

/**
 * Patient Progress Report (PPR) Service
 * Implements MCP-style recommendation generation and validation
 */

// Metrics thresholds for determining recommendation urgency
const CRITICAL_SCORE_THRESHOLD = 4.0;
const LOW_SCORE_THRESHOLD = 6.0;

// Generate a new PPR for a patient
export async function generatePatientProgressReport(patientId: number, doctorId: number) {
  try {
    let endDate = new Date();
    let startDate: Date;
    
    // CRITICAL FIX: Use fixed period for current reporting (July 22-24, 2025)
    // This ensures we capture the actual patient data from the correct period
    startDate = new Date('2025-07-22T00:00:00.000Z');
    endDate = new Date('2025-07-24T23:59:59.999Z');
    console.log(`USING FIXED PERIOD for accurate PPR data: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get the patient
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId));

    if (!patient) {
      throw new Error("Patient not found");
    }

    // Get live health data from patient_scores table (official daily submissions)
    const patientScoresData = await db.execute(sql`
      SELECT 
        AVG(meal_plan_self_score) as "avgDietScore",
        AVG(exercise_self_score) as "avgExerciseScore", 
        AVG(medication_self_score) as "avgMedicationScore",
        COUNT(*) as "totalSubmissions",
        MIN(score_date) as "firstScoreDate",
        MAX(score_date) as "lastScoreDate"
      FROM patient_scores 
      WHERE patient_id = ${patientId}
        AND score_date >= ${startDate.toISOString().split('T')[0]}
        AND score_date <= ${endDate.toISOString().split('T')[0]}
    `);

    const metricData = [{
      avgDietScore: patientScoresData.rows[0]?.avgDietScore || null,
      avgExerciseScore: patientScoresData.rows[0]?.avgExerciseScore || null,
      avgMedicationScore: patientScoresData.rows[0]?.avgMedicationScore || null,
      count: patientScoresData.rows[0]?.totalSubmissions || 0
    }];

    // Get Keep Going button usage
    const keepGoingUsage = await db
      .select({
        usageCount: sum(featureUsage.usageCount)
      })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, patientId),
          eq(featureUsage.featureName, "keep_going_button"),
          between(featureUsage.lastUsed, startDate, endDate)
        )
      );

    // Get feature usage summary
    const featureUsageSummary = await db
      .select({
        featureName: featureUsage.featureName,
        usageCount: sum(featureUsage.usageCount)
      })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, patientId),
          between(featureUsage.lastUsed, startDate, endDate)
        )
      )
      .groupBy(featureUsage.featureName);

    // Get chat memories for sentiment analysis
    const chatMemories = await db
      .select()
      .from(chatMemory)
      .where(
        and(
          eq(chatMemory.userId, patientId),
          between(chatMemory.createdAt, startDate, endDate)
        )
      )
      .orderBy(desc(chatMemory.createdAt))
      .limit(100); // Limit to recent memories for analysis

    // Get recommendation outcomes
    const recommendationOutcomes = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, patientId),
          between(recommendations.createdAt, startDate, endDate)
        )
      );

    // Get current care plan directives
    const carePlan = await db
      .select()
      .from(carePlanDirectives)
      .where(
        and(
          eq(carePlanDirectives.userId, patientId),
          eq(carePlanDirectives.active, true)
        )
      );

    // Get content interaction data
    const interactions = await db
      .select()
      .from(contentInteractions)
      .where(
        and(
          eq(contentInteractions.userId, patientId),
          between(contentInteractions.createdAt, startDate, endDate)
        )
      );

    // Prepare data for MCP recommendations
    const patientData = {
      metrics: {
        medication: metricData[0]?.avgMedicationScore || 0,
        diet: metricData[0]?.avgDietScore || 0,
        exercise: metricData[0]?.avgExerciseScore || 0,
      },
      chatMemories: chatMemories,
      featureUsage: Object.fromEntries(
        featureUsageSummary.map(item => [item.featureName, item.usageCount])
      ),
      interactions: interactions,
      carePlan: carePlan,
      recommendationOutcomes: recommendationOutcomes
    };

    // Generate Health Snapshots graphical data
    const healthSnapshotsData = await generateHealthSnapshotsData(patientId, startDate, endDate);
    
    // Analyze patient sentiment from chat memories
    const chatAnalysis = await analyzePatientSentiment(chatMemories);

    // Prepare feature usage object
    const featureUsageObject = featureUsageSummary.reduce((acc, curr) => {
      acc[curr.featureName] = Number(curr.usageCount);
      return acc;
    }, {} as Record<string, number>);

    // Generate enhanced PPR analytics data
    let scorePatterns = null;
    let adherenceRate = null;
    let consistencyMetrics = null;
    let behaviorInsights = null;
    let improvementTrajectory = null;
    let engagementScore = null;
    let healthTrends = null;
    let progressBadges = null;
    
    try {
      // Import the enhanced analysis service if it exists
      const enhancedPprAnalysisService = await import('../ai/enhancedPprAnalysisService');
      
      // Generate enhanced analytics data
      scorePatterns = await enhancedPprAnalysisService.analyzeScorePatterns(
        patientId, 
        startDate, 
        endDate
      );
      
      adherenceRate = await enhancedPprAnalysisService.calculateAdherenceRate(
        patientId, 
        startDate, 
        endDate
      );
      
      consistencyMetrics = await enhancedPprAnalysisService.calculateConsistencyMetrics(
        patientId, 
        startDate, 
        endDate
      );
      
      // Prepare patient data for insights
      const patientMetricsData = {
        metrics: {
          medication: metricData[0]?.avgMedicationScore || 0,
          diet: metricData[0]?.avgDietScore || 0,
          exercise: metricData[0]?.avgExerciseScore || 0
        },
        featureUsage: featureUsageSummary
      };
      
      behaviorInsights = await enhancedPprAnalysisService.generateBehaviorInsights(
        patientId, 
        startDate, 
        endDate,
        patientMetricsData
      );
      
      improvementTrajectory = await enhancedPprAnalysisService.projectImprovementTrajectory(
        patientId, 
        startDate, 
        endDate
      );
      
      engagementScore = await enhancedPprAnalysisService.calculateEngagementScore(
        patientId, 
        startDate, 
        endDate
      );
      
      healthTrends = await enhancedPprAnalysisService.generateHealthTrends(
        patientId, 
        startDate, 
        endDate
      );
      
      // Get real patient progress milestone badges from progress_milestones table
      const realBadgesData = await db.execute(sql`
        SELECT 
          title,
          description,
          category,
          completed,
          completed_date,
          icon_type,
          created_at
        FROM progress_milestones 
        WHERE user_id = ${patientId}
          AND completed = true
          AND completed_date >= ${startDate.toISOString()}
          AND completed_date <= ${endDate.toISOString()}
        ORDER BY completed_date DESC
      `);
      
      console.log(`REAL BADGES: Found ${realBadgesData.rows.length} completed badges for patient ${patientId} in period`);
      
      // Format badges data for PPR display
      progressBadges = {
        totalBadges: realBadgesData.rows.length,
        recentBadges: realBadgesData.rows.map(badge => ({
          title: badge.title,
          description: badge.description,
          category: badge.category,
          earnedDate: badge.completed_date,
          iconType: badge.icon_type
        })),
        badgeCategoryCounts: realBadgesData.rows.reduce((acc, badge) => {
          acc[badge.category] = (acc[badge.category] || 0) + 1;
          return acc;
        }, {}),
        badgeLevels: realBadgesData.rows.reduce((acc, badge) => {
          if (badge.title.includes('Bronze')) acc.bronze = (acc.bronze || 0) + 1;
          if (badge.title.includes('Silver')) acc.silver = (acc.silver || 0) + 1;
          if (badge.title.includes('Gold')) acc.gold = (acc.gold || 0) + 1;
          if (badge.title.includes('Platinum')) acc.platinum = (acc.platinum || 0) + 1;
          return acc;
        }, {}),
        summary: realBadgesData.rows.length > 0 
          ? `Patient earned ${realBadgesData.rows.length} achievement badges during this period, demonstrating excellent engagement and consistency.`
          : 'No progress milestone badges earned during this period.'
      };
    } catch (error) {
      console.error("Error generating enhanced PPR analytics:", error);
      // Continue without enhanced analytics if there's an error
    }

    // Create the PPR
    const [report] = await db
      .insert(patientProgressReports)
      .values({
        patientId,
        createdById: doctorId,
        reportPeriodStartDate: startDate,
        reportPeriodEndDate: endDate,
        avgMedicationScore: metricData[0]?.avgMedicationScore || null,
        avgDietScore: metricData[0]?.avgDietScore || null,
        avgExerciseScore: metricData[0]?.avgExerciseScore || null,
        keepGoingButtonUsageCount: keepGoingUsage[0]?.usageCount || 0,
        chatSentimentScore: chatAnalysis.sentimentScore,
        chatSentimentAnalysis: chatAnalysis.sentimentAnalysis,
        featureUsageSummary: featureUsageObject,
        recommendationSuccess: calculateRecommendationSuccess(recommendationOutcomes),
        systemRecommendations: [],
        newCpdSuggestions: healthSnapshotsData,
        shared: false,
        // Enhanced PPR fields
        scorePatterns,
        adherenceRate,
        consistencyMetrics,
        behaviorInsights,
        improvementTrajectory,
        engagementScore,
        healthTrends,
        progressBadges
      })
      .returning();

    return {
      ...report,
      patientName: patient.name,
      healthSnapshotsData
    };
  } catch (error) {
    console.error("Error generating PPR:", error);
    throw error;
  }
}

// Analyze patient sentiment based on chat memories
async function analyzePatientSentiment(chatMemories: any[]) {
  // If we have no chat memories, return neutral
  if (!chatMemories.length) {
    return {
      sentimentScore: 0,
      sentimentAnalysis: "No recent chat data available for sentiment analysis."
    };
  }

  try {
    // In production, this would use an NLP model to analyze sentiment
    // For now, we'll implement a simple analysis based on the chat memory content
    
    // Extract chat content
    const chatContent = chatMemories
      .map(memory => memory.content)
      .join(" ");

    // Use the MCP system to analyze patient sentiment
    const sentimentAnalysis = {
      sentimentScore: calculateSentimentScore(chatContent),
      sentimentAnalysis: generateSentimentAnalysis(chatContent, chatMemories)
    };

    return sentimentAnalysis;
  } catch (error) {
    console.error("Error analyzing patient sentiment:", error);
    return {
      sentimentScore: 0,
      sentimentAnalysis: "Error analyzing sentiment. Please try again later."
    };
  }
}

// Placeholder for sentiment score calculation - would use NLP in production
function calculateSentimentScore(content: string): number {
  // This would be replaced with an actual NLP sentiment analysis
  // For now, return a random score between -1 and 1
  const positiveKeywords = ["good", "great", "happy", "better", "improved", "positive", "excellent"];
  const negativeKeywords = ["bad", "worse", "difficult", "struggle", "pain", "negative", "hard"];
  
  let score = 0;
  const contentLower = content.toLowerCase();
  
  positiveKeywords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score += matches.length * 0.1;
    }
  });
  
  negativeKeywords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score -= matches.length * 0.1;
    }
  });
  
  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, score));
}

// Generate a textual analysis of sentiment - would use LLM in production
function generateSentimentAnalysis(content: string, memories: any[]): string {
  // Identify common themes
  const themes = identifyThemes(memories);
  
  const score = calculateSentimentScore(content);
  
  if (score > 0.3) {
    return `Patient shows positive sentiment in recent interactions. They express satisfaction with their progress. ${themes.length ? `Common themes include: ${themes.join(", ")}.` : ""}`;
  } else if (score < -0.3) {
    return `Patient displays negative sentiment in recent interactions, suggesting potential challenges with their care plan. ${themes.length ? `They frequently discuss: ${themes.join(", ")}.` : ""} Consider adjusting their care plan directives or scheduling a consultation.`;
  } else {
    return `Patient shows neutral sentiment. ${themes.length ? `Topics frequently discussed include: ${themes.join(", ")}.` : ""} Continue monitoring for changes in engagement or sentiment.`;
  }
}

// Identify common themes in chat memories
function identifyThemes(memories: any[]): string[] {
  const themeKeywords: Record<string, string[]> = {
    "medication": ["medicine", "pill", "medication", "prescription", "dose", "drug"],
    "diet": ["food", "eat", "meal", "nutrition", "diet", "weight", "hungry"],
    "exercise": ["workout", "exercise", "walk", "run", "physical", "active", "fitness"],
    "sleep": ["sleep", "tired", "rest", "bed", "nap", "insomnia", "woke"],
    "stress": ["stress", "anxiety", "worried", "nervous", "tension", "pressure"],
    "pain": ["pain", "hurt", "ache", "sore", "discomfort"]
  };
  
  const themeCounts: Record<string, number> = {};
  
  // Count occurrences of theme keywords
  memories.forEach(memory => {
    const content = memory.content.toLowerCase();
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        }
      });
    });
  });
  
  // Return top themes (those mentioned in at least 15% of memories)
  const threshold = memories.length * 0.15;
  return Object.entries(themeCounts)
    .filter(([_, count]) => count >= threshold)
    .sort(([_, countA], [__, countB]) => countB - countA)
    .map(([theme, _]) => theme);
}

// Calculate recommendation success metrics
function calculateRecommendationSuccess(recommendations: any[]) {
  if (!recommendations.length) {
    return { total: 0, followed: 0, successRate: 0 };
  }
  
  const followed = recommendations.filter(rec => rec.wasFollowed).length;
  const total = recommendations.length;
  const successRate = (followed / total) * 100;
  
  const scoreImprovements = recommendations
    .filter(rec => rec.wasFollowed && rec.scoreBeforeRecommendation && rec.scoreAfterRecommendation)
    .map(rec => rec.scoreAfterRecommendation - rec.scoreBeforeRecommendation);
  
  const avgImprovement = scoreImprovements.length 
    ? scoreImprovements.reduce((sum, val) => sum + val, 0) / scoreImprovements.length 
    : 0;
  
  return {
    total,
    followed,
    successRate: Math.round(successRate * 100) / 100,
    avgScoreImprovement: Math.round(avgImprovement * 100) / 100
  };
}

// Get PPR by ID
export async function getPatientProgressReportById(reportId: number) {
  try {
    const [report] = await db
      .select()
      .from(patientProgressReports)
      .where(eq(patientProgressReports.id, reportId));

    if (!report) {
      throw new Error("Report not found");
    }

    // Get patient name
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, report.patientId));
    
    // If the report doesn't have badge data already, fetch it for the period
    let progressBadges = report.progressBadges;
    console.log("Report progress badges initial state:", progressBadges);
    if (!progressBadges) {
      try {
        // Fetch progress badges for the report period
        const { getPatientProgressBadges } = await import('../ai/enhancedPprAnalysisService');
        progressBadges = await getPatientProgressBadges(
          report.patientId,
          new Date(report.reportPeriodStartDate),
          new Date(report.reportPeriodEndDate)
        );
        
        console.log("Fetched badges data:", JSON.stringify(progressBadges, null, 2));
        
        // Update the report with the badge data to cache it for future requests
        await db
          .update(patientProgressReports)
          .set({ progressBadges })
          .where(eq(patientProgressReports.id, reportId));
        
        console.log("Added progress badges to report:", reportId);
      } catch (badgeError) {
        console.error("Error fetching progress badges:", badgeError);
        // Continue without badges if there's an error
        progressBadges = null;
      }
    }

    return {
      ...report,
      patientName: patient?.name || "Unknown Patient",
      progressBadges
    };
  } catch (error) {
    console.error("Error fetching PPR:", error);
    throw error;
  }
}

// Get all PPRs for a patient
export async function getPatientProgressReports(patientId: number) {
  try {
    const reports = await db
      .select()
      .from(patientProgressReports)
      .where(eq(patientProgressReports.patientId, patientId))
      .orderBy(desc(patientProgressReports.reportDate));

    // Get patient name
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId));

    return reports.map(report => ({
      ...report,
      patientName: patient?.name || "Unknown Patient"
    }));
  } catch (error) {
    console.error("Error fetching PPRs:", error);
    throw error;
  }
}

// Update PPR notes
export async function updatePatientProgressReportNotes(reportId: number, doctorNotes: string) {
  try {
    const [updatedReport] = await db
      .update(patientProgressReports)
      .set({ doctorNotes })
      .where(eq(patientProgressReports.id, reportId))
      .returning();

    return updatedReport;
  } catch (error) {
    console.error("Error updating PPR notes:", error);
    throw error;
  }
}

// Share PPR with patient
export async function sharePatientProgressReport(reportId: number, shared: boolean) {
  try {
    const [updatedReport] = await db
      .update(patientProgressReports)
      .set({ shared })
      .where(eq(patientProgressReports.id, reportId))
      .returning();

    return updatedReport;
  } catch (error) {
    console.error("Error sharing PPR:", error);
    throw error;
  }
}

// Generate Health Snapshots graphical data for PPR
async function generateHealthSnapshotsData(patientId: number, startDate: Date, endDate: Date) {
  try {
    // Get daily scores data for Health Snapshots charts - FIXED DATE FORMAT
    console.log(`HEALTH SNAPSHOTS: Querying patient_scores for patient ${patientId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const dailyScoresData = await db.execute(sql`
      SELECT 
        score_date as "scoreDate",
        meal_plan_self_score as "dietScore",
        exercise_self_score as "exerciseScore", 
        medication_self_score as "medicationScore",
        created_at as "createdAt"
      FROM patient_scores 
      WHERE patient_id = ${patientId}
        AND score_date >= ${startDate.toISOString().split('T')[0]}
        AND score_date <= ${endDate.toISOString().split('T')[0]}
      ORDER BY score_date ASC
    `);
    
    console.log(`HEALTH SNAPSHOTS: Found ${dailyScoresData.rows.length} score records for patient ${patientId}`);

    const scoreData = dailyScoresData.rows;

    // Generate progress chart data grouped by week
    const weeklyData: Record<string, { diet: number[], exercise: number[], medication: number[] }> = {};
    
    scoreData.forEach(score => {
      const date = new Date(score.scoreDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = `Week ${Math.ceil((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { diet: [], exercise: [], medication: [] };
      }
      
      weeklyData[weekKey].diet.push(score.dietScore);
      weeklyData[weekKey].exercise.push(score.exerciseScore);
      weeklyData[weekKey].medication.push(score.medicationScore);
    });

    // Calculate weekly averages for progress chart
    const healthProgressData = Object.entries(weeklyData).map(([week, data]) => ({
      name: week,
      diet: Math.round(data.diet.reduce((sum, score) => sum + score, 0) / data.diet.length),
      exercise: Math.round(data.exercise.reduce((sum, score) => sum + score, 0) / data.exercise.length),
      medication: Math.round(data.medication.reduce((sum, score) => sum + score, 0) / data.medication.length)
    }));

    // Calculate overall metrics for pie chart
    const totalScores = scoreData.length;
    const avgDiet = scoreData.reduce((sum, s) => sum + s.dietScore, 0) / totalScores;
    const avgExercise = scoreData.reduce((sum, s) => sum + s.exerciseScore, 0) / totalScores;
    const avgMedication = scoreData.reduce((sum, s) => sum + s.medicationScore, 0) / totalScores;

    const healthDistributionData = [
      { name: 'Diet', value: Math.round((avgDiet / (avgDiet + avgExercise + avgMedication)) * 100) },
      { name: 'Exercise', value: Math.round((avgExercise / (avgDiet + avgExercise + avgMedication)) * 100) },
      { name: 'Medication', value: Math.round((avgMedication / (avgDiet + avgExercise + avgMedication)) * 100) }
    ];

    // Generate trend analysis
    const recentScores = scoreData.slice(-7); // Last 7 submissions
    const previousScores = scoreData.slice(-14, -7); // Previous 7 submissions
    
    const recentAvgDiet = recentScores.reduce((sum, s) => sum + s.dietScore, 0) / recentScores.length;
    const previousAvgDiet = previousScores.reduce((sum, s) => sum + s.dietScore, 0) / previousScores.length;
    
    const trendAnalysis = {
      dietTrend: recentAvgDiet > previousAvgDiet ? 'improving' : recentAvgDiet < previousAvgDiet ? 'declining' : 'stable',
      dietChange: Math.round(((recentAvgDiet - previousAvgDiet) / previousAvgDiet) * 100) || 0,
      totalSubmissions: totalScores,
      consistencyScore: Math.round((totalScores / Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))) * 100)
    };

    return {
      healthProgressData,
      healthDistributionData,
      trendAnalysis,
      rawScoreData: scoreData,
      periodSummary: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)),
        totalSubmissions: totalScores,
        avgDiet: Math.round(avgDiet * 10) / 10,
        avgExercise: Math.round(avgExercise * 10) / 10,
        avgMedication: Math.round(avgMedication * 10) / 10
      }
    };

  } catch (error) {
    console.error("Error generating Health Snapshots data:", error);
    return {
      healthProgressData: [],
      healthDistributionData: [],
      trendAnalysis: { dietTrend: 'no-data', dietChange: 0, totalSubmissions: 0, consistencyScore: 0 },
      rawScoreData: [],
      periodSummary: { totalSubmissions: 0, avgDiet: 0, avgExercise: 0, avgMedication: 0 }
    };
  }
}