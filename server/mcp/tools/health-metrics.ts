/**
 * Health Metrics MCP Tool
 * 
 * Provides access to patient daily self-scores and health tracking data
 * with KGC-specific analysis and recommendations.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for health metrics tool
const healthMetricsInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['get_latest', 'get_history', 'get_trends']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['7days', '30days', '90days']).optional()
});

/**
 * Health Metrics Tool Implementation
 */
export const healthMetricsTool: MCPTool = {
  name: 'health-metrics',
  description: 'Access patient daily self-scores and health tracking data with trend analysis',
  inputSchema: healthMetricsInputSchema,
  handler: async (params: z.infer<typeof healthMetricsInputSchema>, context: MCPContext) => {
    const { userId, action, startDate, endDate, period } = params;

    // Ensure user can only access their own data (unless admin/doctor with proper access)
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s health metrics');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      accessedBy: context.userId,
      dataType: 'health_metrics',
      action: 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'get_latest':
          return await getLatestHealthMetrics(userId, context);
        
        case 'get_history':
          return await getHistoricalHealthMetrics(userId, startDate, endDate, context);
        
        case 'get_trends':
          return await getHealthTrends(userId, period || '30days', context);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Health Metrics Tool] Error:', error);
      throw new Error(`Failed to retrieve health metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Get latest health metrics with context
 */
async function getLatestHealthMetrics(userId: number, context: MCPContext) {
  const latestMetrics = await storage.getLatestHealthMetricsForUser(userId);
  const historicalMetrics = await storage.getHealthMetricsForUser(userId); // All metrics
  
  if (!latestMetrics) {
    return {
      message: "No health metrics found. Encourage the patient to submit their daily self-scores to track progress.",
      suggestion: "Visit the Daily Self-Scores feature to begin tracking your health journey.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Start tracking your health progress and earn rewards",
        urgency: "high"
      }]
    };
  }

  // Calculate averages and streaks
  const averages = calculateAverages(historicalMetrics);
  const streaks = calculateStreaks(historicalMetrics);
  
  // Check for concerning patterns
  const concerns = detectConcerns(latestMetrics, historicalMetrics);
  
  // Provide CPD-aligned insights
  const insights = generateCPDAlignedInsights(latestMetrics, context.carePlanDirectives);

  return {
    currentMetrics: {
      medicationScore: latestMetrics.medicationScore,
      dietScore: latestMetrics.dietScore,
      exerciseScore: latestMetrics.exerciseScore,
      date: latestMetrics.date,
      submittedAt: latestMetrics.date
    },
    averages,
    streaks,
    insights,
    concerns,
    recommendations: generateRecommendations(latestMetrics, context.carePlanDirectives),
    kgcFeatureSuggestions: suggestKGCFeatures(latestMetrics, context.carePlanDirectives)
  };
}

/**
 * Get historical health metrics with analysis
 */
async function getHistoricalHealthMetrics(userId: number, startDate?: string, endDate?: string, context?: MCPContext) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
  const end = endDate ? new Date(endDate) : new Date(); // Default: today
  
  const allMetrics = await storage.getHealthMetricsForUser(userId);
  const metrics = allMetrics.filter(m => m.date >= start && m.date <= end);
  
  if (metrics.length === 0) {
    return {
      message: "No health metrics found for the specified period.",
      suggestion: "Regular daily self-score submissions help track progress and earn rewards.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Start consistent health tracking",
        urgency: "medium"
      }]
    };
  }

  const summary = {
    totalEntries: metrics.length,
    averageScores: calculateAverages(metrics),
    improvementTrend: calculateImprovementTrend(metrics),
    consistencyScore: calculateConsistencyScore(metrics),
    dataCompleteness: metrics.length / daysBetween(start, end)
  };

  return {
    metrics: metrics.map((m: any) => ({
      date: m.date,
      medicationScore: m.medicationScore,
      dietScore: m.dietScore,
      exerciseScore: m.exerciseScore
    })),
    summary,
    period: {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalDays: daysBetween(start, end)
    }
  };
}

/**
 * Get health trends with AI-powered analysis
 */
async function getHealthTrends(userId: number, period: string, context: MCPContext) {
  const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
  const metrics = await storage.getHealthMetricsForUser(userId, days);
  
  if (metrics.length < 3) {
    return {
      message: "Insufficient data for trend analysis. At least 3 days of data required.",
      suggestion: "Continue submitting daily self-scores to unlock trend insights and progress tracking.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Build enough data for meaningful trend analysis",
        urgency: "medium"
      }]
    };
  }

  const trends = {
    medication: analyzeTrend(metrics.map(m => m.medicationScore)),
    diet: analyzeTrend(metrics.map(m => m.dietScore)),
    exercise: analyzeTrend(metrics.map(m => m.exerciseScore))
  };

  const insights = generateTrendInsights(trends, context.carePlanDirectives);
  const recommendations = generateTrendRecommendations(trends, context.carePlanDirectives);

  return {
    period,
    dataPoints: metrics.length,
    trends,
    insights,
    recommendations,
    overallProgress: calculateOverallProgress(trends),
    nextSteps: suggestNextSteps(trends, context.carePlanDirectives),
    kgcFeatureSuggestions: suggestKGCFeaturesFromTrends(trends)
  };
}

/**
 * Helper Functions
 */

function calculateAverages(metrics: any[]) {
  if (metrics.length === 0) return null;
  
  return {
    medicationScore: Number((metrics.reduce((sum, m) => sum + m.medicationScore, 0) / metrics.length).toFixed(1)),
    dietScore: Number((metrics.reduce((sum, m) => sum + m.dietScore, 0) / metrics.length).toFixed(1)),
    exerciseScore: Number((metrics.reduce((sum, m) => sum + m.exerciseScore, 0) / metrics.length).toFixed(1)),
    period: `last_${metrics.length}_days`
  };
}

function calculateStreaks(metrics: any[]) {
  if (metrics.length === 0) return { currentStreak: 0, longestStreak: 0 };
  
  // Sort by date ascending
  const sortedMetrics = metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  // Calculate current streak (from most recent backwards)
  for (let i = sortedMetrics.length - 1; i >= 0; i--) {
    const metricDate = new Date(sortedMetrics[i].date);
    const expectedDate = new Date(today.getTime() - (sortedMetrics.length - 1 - i) * 24 * 60 * 60 * 1000);
    
    if (isSameDay(metricDate, expectedDate) || isSameDay(metricDate, yesterday)) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Calculate longest streak
  for (let i = 0; i < sortedMetrics.length; i++) {
    tempStreak++;
    
    if (i === sortedMetrics.length - 1 || !isConsecutiveDay(sortedMetrics[i].date, sortedMetrics[i + 1].date)) {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    lastSubmission: sortedMetrics[sortedMetrics.length - 1]?.date || null
  };
}

function detectConcerns(latestMetrics: any, historicalMetrics: any[]) {
  const concerns = [];
  
  // Check for low scores
  if (latestMetrics.medicationScore <= 3) {
    concerns.push({
      type: 'low_medication_score',
      severity: 'high',
      message: 'Medication adherence score is concerning. Consider speaking with your doctor.',
      action: 'Contact healthcare provider'
    });
  }
  
  if (latestMetrics.dietScore <= 3) {
    concerns.push({
      type: 'low_diet_score',
      severity: 'medium',
      message: 'Diet score indicates challenges with nutrition goals.',
      action: 'Consider using Inspiration Machine D for meal planning'
    });
  }
  
  if (latestMetrics.exerciseScore <= 3) {
    concerns.push({
      type: 'low_exercise_score',
      severity: 'medium',
      message: 'Exercise score shows room for improvement.',
      action: 'Explore E&W Support for local fitness options'
    });
  }
  
  // Check for declining trends
  if (historicalMetrics.length >= 7) {
    const recent = historicalMetrics.slice(-3);
    const earlier = historicalMetrics.slice(-7, -3);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.medicationScore, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + m.medicationScore, 0) / earlier.length;
    
    if (recentAvg < earlierAvg - 2) {
      concerns.push({
        type: 'declining_trend',
        severity: 'medium',
        message: 'Recent scores show a declining trend. Let\'s work together to get back on track.',
        action: 'Review care plan directives and consider additional support'
      });
    }
  }
  
  return concerns;
}

function generateCPDAlignedInsights(metrics: any, cpds: any[]) {
  const insights = [];
  
  // Medication CPD insights
  const medicationCPD = cpds.find(cpd => cpd.category.toLowerCase() === 'medication');
  if (medicationCPD && metrics.medicationScore >= 8) {
    insights.push(`Excellent medication adherence! You're successfully following "${medicationCPD.directive}"`);
  } else if (medicationCPD && metrics.medicationScore <= 5) {
    insights.push(`Your medication score suggests challenges with "${medicationCPD.directive}". Consider setting reminders or discussing barriers with your doctor.`);
  }
  
  // Diet CPD insights
  const dietCPD = cpds.find(cpd => cpd.category.toLowerCase() === 'diet');
  if (dietCPD && metrics.dietScore >= 8) {
    insights.push(`Great nutrition progress! You're doing well with "${dietCPD.directive}"`);
  } else if (dietCPD && metrics.dietScore <= 5) {
    insights.push(`Your diet score indicates room for improvement with "${dietCPD.directive}". The Inspiration Machine D can help with meal planning.`);
  }
  
  // Exercise CPD insights
  const exerciseCPD = cpds.find(cpd => cpd.category.toLowerCase() === 'exercise');
  if (exerciseCPD && metrics.exerciseScore >= 8) {
    insights.push(`Outstanding exercise consistency! You're excelling at "${exerciseCPD.directive}"`);
  } else if (exerciseCPD && metrics.exerciseScore <= 5) {
    insights.push(`Your exercise score shows potential for growth with "${exerciseCPD.directive}". E&W Support can help find local fitness options.`);
  }
  
  return insights;
}

function generateRecommendations(metrics: any, cpds: any[]) {
  const recommendations = [];
  
  // Score-based recommendations
  if (metrics.medicationScore >= 8) {
    recommendations.push("Keep up the excellent medication routine!");
  } else if (metrics.medicationScore <= 5) {
    recommendations.push("Consider setting medication reminders or pill organizers to improve adherence.");
  }
  
  if (metrics.dietScore <= 5) {
    recommendations.push("Try the Inspiration Machine D for personalized meal ideas aligned with your care plan.");
  }
  
  if (metrics.exerciseScore <= 5) {
    recommendations.push("Explore the E&W Support feature to find local gyms and fitness classes.");
  }
  
  // Overall wellness recommendations
  const avgScore = (metrics.medicationScore + metrics.dietScore + metrics.exerciseScore) / 3;
  if (avgScore >= 8) {
    recommendations.push("You're doing fantastic! Consider sharing your success strategies in the Journaling feature.");
  } else if (avgScore <= 5) {
    recommendations.push("Focus on one area at a time for sustainable improvement. Small consistent steps lead to big changes.");
  }
  
  return recommendations;
}

function suggestKGCFeatures(metrics: any, cpds: any[]) {
  const suggestions = [];
  
  if (metrics.dietScore <= 6) {
    suggestions.push({
      feature: "Inspiration Machine D",
      reason: "Get personalized meal ideas aligned with your care plan directives",
      urgency: "medium"
    });
  }
  
  if (metrics.exerciseScore <= 6) {
    suggestions.push({
      feature: "E&W Support",
      reason: "Find local fitness options and exercise programs",
      urgency: "medium"
    });
  }
  
  if (metrics.medicationScore <= 6) {
    suggestions.push({
      feature: "MBP Wizard",
      reason: "Find best prices for your medications and track adherence",
      urgency: "high"
    });
  }
  
  suggestions.push({
    feature: "Progress Milestones",
    reason: "Track your achievements and earn rewards for consistent health scores",
    urgency: "low"
  });
  
  return suggestions;
}

function suggestKGCFeaturesFromTrends(trends: any) {
  const suggestions = [];
  
  if (trends.diet.direction === 'declining') {
    suggestions.push({
      feature: "Inspiration Machine D",
      reason: "Reverse declining diet trends with personalized meal planning",
      urgency: "high"
    });
  }
  
  if (trends.exercise.direction === 'declining') {
    suggestions.push({
      feature: "E&W Support",
      reason: "Find new fitness options to reignite exercise motivation",
      urgency: "high"
    });
  }
  
  if (trends.medication.direction === 'declining') {
    suggestions.push({
      feature: "MBP Wizard",
      reason: "Improve medication adherence with price comparisons and reminders",
      urgency: "high"
    });
  }
  
  return suggestions;
}

// Additional helper functions...

function analyzeTrend(scores: number[]) {
  if (scores.length < 2) return { direction: 'stable', changePercent: 0, consistency: 'unknown' };
  
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  let direction: 'improving' | 'declining' | 'stable';
  if (changePercent > 5) direction = 'improving';
  else if (changePercent < -5) direction = 'declining';
  else direction = 'stable';
  
  // Calculate consistency (lower standard deviation = higher consistency)
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  let consistency: 'high' | 'moderate' | 'low';
  if (stdDev < 1) consistency = 'high';
  else if (stdDev < 2) consistency = 'moderate';
  else consistency = 'low';
  
  return { direction, changePercent: Number(changePercent.toFixed(1)), consistency };
}

function generateTrendInsights(trends: any, cpds: any[]) {
  const insights = [];
  
  Object.entries(trends).forEach(([category, trend]: [string, any]) => {
    const cpd = cpds.find(c => c.category.toLowerCase() === category);
    const cpdText = cpd ? ` aligned with your "${cpd.directive}" directive` : '';
    
    if (trend.direction === 'improving') {
      insights.push(`Your ${category} scores are improving${cpdText} - keep up the great work!`);
    } else if (trend.direction === 'declining') {
      insights.push(`Your ${category} scores are declining${cpdText}. Let's identify ways to get back on track.`);
    } else {
      insights.push(`Your ${category} scores are stable${cpdText}. Consider strategies to move toward your goals.`);
    }
  });
  
  return insights;
}

function generateTrendRecommendations(trends: any, cpds: any[]) {
  const recommendations = [];
  
  if (trends.medication.direction === 'declining') {
    recommendations.push("Consider reviewing your medication routine with your doctor or pharmacist");
  }
  
  if (trends.diet.direction === 'declining') {
    recommendations.push("Try meal planning with the Inspiration Machine D to improve nutrition consistency");
  }
  
  if (trends.exercise.direction === 'declining') {
    recommendations.push("Explore new fitness options through E&W Support to reignite your exercise motivation");
  }
  
  // Consistency recommendations
  Object.entries(trends).forEach(([category, trend]: [string, any]) => {
    if (trend.consistency === 'low') {
      recommendations.push(`Focus on building consistent ${category} habits - small daily actions create lasting change`);
    }
  });
  
  return recommendations;
}

function calculateOverallProgress(trends: any) {
  const improvements = Object.values(trends).filter((t: any) => t.direction === 'improving').length;
  const declines = Object.values(trends).filter((t: any) => t.direction === 'declining').length;
  const stable = Object.values(trends).filter((t: any) => t.direction === 'stable').length;
  
  if (improvements > declines) return 'positive';
  if (declines > improvements) return 'needs_attention';
  return 'stable';
}

function suggestNextSteps(trends: any, cpds: any[]) {
  const nextSteps = [];
  
  // Prioritize areas that are declining
  const decliningAreas = Object.entries(trends)
    .filter(([_, trend]: [string, any]) => trend.direction === 'declining')
    .map(([category, _]) => category);
  
  if (decliningAreas.includes('medication')) {
    nextSteps.push("Priority: Address medication adherence challenges - consider setting up automated reminders");
  }
  
  if (decliningAreas.includes('diet')) {
    nextSteps.push("Focus: Improve nutrition consistency - use Inspiration Machine D for meal planning");
  }
  
  if (decliningAreas.includes('exercise')) {
    nextSteps.push("Goal: Rebuild exercise routine - explore E&W Support for motivating fitness options");
  }
  
  if (nextSteps.length === 0) {
    nextSteps.push("Continue your excellent progress and consider setting new health goals");
  }
  
  return nextSteps;
}

// Utility functions
function calculateImprovementTrend(metrics: any[]) {
  if (metrics.length < 2) return 'insufficient_data';
  
  const firstQuarter = metrics.slice(0, Math.floor(metrics.length / 4));
  const lastQuarter = metrics.slice(-Math.floor(metrics.length / 4));
  
  const firstAvg = firstQuarter.reduce((sum, m) => sum + (m.medicationScore + m.dietScore + m.exerciseScore) / 3, 0) / firstQuarter.length;
  const lastAvg = lastQuarter.reduce((sum, m) => sum + (m.medicationScore + m.dietScore + m.exerciseScore) / 3, 0) / lastQuarter.length;
  
  const improvement = ((lastAvg - firstAvg) / firstAvg) * 100;
  
  if (improvement > 10) return 'strong_positive';
  if (improvement > 5) return 'positive';
  if (improvement > -5) return 'stable';
  if (improvement > -10) return 'negative';
  return 'concerning';
}

function calculateConsistencyScore(metrics: any[]) {
  if (metrics.length < 3) return 0;
  
  // Calculate how many days in a row the user submitted scores
  const dates = metrics.map(m => new Date(m.date)).sort((a, b) => a.getTime() - b.getTime());
  let consecutiveDays = 1;
  let maxConsecutive = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff === 1) {
      consecutiveDays++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
    } else {
      consecutiveDays = 1;
    }
  }
  
  return maxConsecutive / dates.length;
}

function daysBetween(date1: Date, date2: Date) {
  return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function isSameDay(date1: Date, date2: Date) {
  return date1.toDateString() === date2.toDateString();
}

function isConsecutiveDay(date1: string, date2: string) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}