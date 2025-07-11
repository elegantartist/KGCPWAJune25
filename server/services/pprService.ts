import { db } from "../db";
import { 
  users, 
  // healthMetrics, // No longer used directly for average scores
  patientScores, // Use this for scores
  chatMemory, 
  featureUsage, 
  carePlanDirectives,
  patientProgressReports, 
  recommendations,
  contentInteractions,
  keepGoingLogs
} from "@shared/schema";
import { eq, and, between, desc, avg, count, sum } from "drizzle-orm";
import { 
  generateSystemRecommendations,
  validateRecommendations,
  generateNewCpdSuggestions
} from "../ai/mcpService";
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
    const endDate = new Date();
    let startDate: Date;
    
    // Check for previous reports to set the period to "since last report"
    const previousReports = await db
      .select({
        reportDate: patientProgressReports.reportDate
      })
      .from(patientProgressReports)
      .where(eq(patientProgressReports.patientId, patientId))
      .orderBy(desc(patientProgressReports.reportDate))
      .limit(1);
    
    if (previousReports.length > 0) {
      // Use the date of the most recent report as the start date
      startDate = new Date(previousReports[0].reportDate);
      console.log(`Using previous report date as start: ${startDate.toISOString()}`);
    } else {
      // Default: last 14 days if no previous report
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
      console.log(`No previous report, using default 14-day period: ${startDate.toISOString()}`);
    }

    // Get the patient
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId));

    if (!patient) {
      throw new Error("Patient not found");
    }

    // Gather metrics for the period using patientScores table
    const metricData = await db
      .select({
        avgMedicationScore: avg(patientScores.medicationSelfScore),
        avgDietScore: avg(patientScores.mealPlanSelfScore),
        avgExerciseScore: avg(patientScores.exerciseSelfScore),
        count: count()
      })
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId), // patientScores.patientId refers to users.id
          between(patientScores.scoreDate, startDate, endDate)
        )
      );

    // Get specific Keep Going sequence logs
    const keepGoingSequenceLogs = await db
      .select()
      .from(keepGoingLogs)
      .where(
        and(
          eq(keepGoingLogs.userId, patientId), // Assuming patientId here is users.id
          between(keepGoingLogs.timestamp, startDate, endDate)
        )
      )
      .orderBy(desc(keepGoingLogs.timestamp));

    const keepGoingUsageCount = keepGoingSequenceLogs.length;


    // Get feature usage summary (can still be useful for other features)
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
      metrics: { // This is used for MCP recommendations context
        medication: parseFloat(metricData[0]?.avgMedicationScore || "0"),
        diet: parseFloat(metricData[0]?.avgDietScore || "0"),
        exercise: parseFloat(metricData[0]?.avgExerciseScore || "0"),
      },
      chatMemories: chatMemories,
      featureUsage: Object.fromEntries(
        featureUsageSummary.map(item => [item.featureName, item.usageCount])
      ),
      interactions: interactions,
      carePlan: carePlan,
      recommendationOutcomes: recommendationOutcomes
    };

    // Use MCP system to generate recommendations
    const chatAnalysis = await analyzePatientSentiment(chatMemories);
    const systemRecommendations = await generateSystemRecommendations(patientData);
    
    // Validate recommendations through the MCP validation system
    const validatedRecommendations = await validateRecommendations(
      systemRecommendations, 
      patientData
    );
    
    // Generate new CPD suggestions based on latest patient data
    const newCpdSuggestions = await generateNewCpdSuggestions(patientData);

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
      const patientMetricsData = { // This is for enhancedPprAnalysisService context
        metrics: {
          medication: parseFloat(metricData[0]?.avgMedicationScore || "0"),
          diet: parseFloat(metricData[0]?.avgDietScore || "0"),
          exercise: parseFloat(metricData[0]?.avgExerciseScore || "0")
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
      
      // Get patient progress milestone badges
      progressBadges = await enhancedPprAnalysisService.getPatientProgressBadges(
        patientId,
        startDate,
        endDate
      );
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
        avgMedicationScore: metricData[0]?.avgMedicationScore ? parseFloat(metricData[0].avgMedicationScore) : null,
        avgDietScore: metricData[0]?.avgDietScore ? parseFloat(metricData[0].avgDietScore) : null,
        avgExerciseScore: metricData[0]?.avgExerciseScore ? parseFloat(metricData[0].avgExerciseScore) : null,
        keepGoingButtonUsageCount: keepGoingUsageCount,
        chatSentimentScore: chatAnalysis.sentimentScore,
        chatSentimentAnalysis: chatAnalysis.sentimentAnalysis,
        featureUsageSummary: featureUsageObject, // This can stay for general feature usage
        recommendationSuccess: calculateRecommendationSuccess(recommendationOutcomes),
        systemRecommendations: validatedRecommendations,
        newCpdSuggestions: newCpdSuggestions,
        shared: false,
        // Enhanced PPR fields
        scorePatterns,
        adherenceRate,
        consistencyMetrics,
        behaviorInsights,
        improvementTrajectory,
        engagementScore,
        healthTrends,
      progressBadges,
      // Add detailed keepGoingLogs if needed for the report, or just the count
      // For now, count is included. Details could be added to patientData for AI.
      // keepGoingLogs: keepGoingSequenceLogs,
      })
      .returning();

    return {
      ...report,
    patientName: patient.name,
    // Optionally, pass back keepGoingSequenceLogs if the doctor needs detailed view
    // keepGoingSequenceLogs
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