/**
 * Doctor Services - Supporting functions for Doctor Dashboard and MCA system
 * Implements your comprehensive doctor workflow and CPD hour tracking
 */

import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { secureLog } from '../middleware/security';

// ===== CPD COMPLIANCE CALCULATION =====

export interface CPDComplianceMetrics {
  overall: {
    compliance: number;
    trend: 'improving' | 'stable' | 'declining';
    riskLevel: 'low' | 'medium' | 'high';
  };
  byCategory: {
    diet: CategoryCompliance;
    exercise: CategoryCompliance;
    medication: CategoryCompliance;
  };
  recommendations: string[];
}

interface CategoryCompliance {
  compliance: number;
  targetValue: number;
  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
  daysOnTarget: number;
  totalDays: number;
}

export function calculateCPDCompliance(healthMetrics: any[], activeCPDs: any[]): CPDComplianceMetrics {
  if (healthMetrics.length === 0 || activeCPDs.length === 0) {
    return {
      overall: { compliance: 0, trend: 'stable', riskLevel: 'high' },
      byCategory: {
        diet: { compliance: 0, targetValue: 8, averageScore: 0, trend: 'stable', daysOnTarget: 0, totalDays: 0 },
        exercise: { compliance: 0, targetValue: 8, averageScore: 0, trend: 'stable', daysOnTarget: 0, totalDays: 0 },
        medication: { compliance: 0, targetValue: 8, averageScore: 0, trend: 'stable', daysOnTarget: 0, totalDays: 0 }
      },
      recommendations: ['Insufficient data for analysis']
    };
  }

  const cpdMap = new Map(activeCPDs.map(cpd => [cpd.category, cpd]));
  const categories = ['diet', 'exercise', 'medication'] as const;
  const byCategory: any = {};
  
  let overallCompliance = 0;
  let validCategories = 0;

  categories.forEach(category => {
    const cpd = cpdMap.get(category);
    const targetValue = cpd?.targetValue || 8;
    
    // Get scores for this category
    const scores = healthMetrics.map(metric => {
      switch(category) {
        case 'diet': return metric.dietScore;
        case 'exercise': return metric.exerciseScore;
        case 'medication': return metric.medicationScore;
        default: return 0;
      }
    }).filter(score => score > 0);

    if (scores.length > 0) {
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const daysOnTarget = scores.filter(score => score >= targetValue).length;
      const compliance = (daysOnTarget / scores.length) * 100;
      
      // Calculate trend (recent vs older scores)
      const recentScores = scores.slice(0, Math.min(7, scores.length));
      const olderScores = scores.slice(7, Math.min(14, scores.length));
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (olderScores.length > 0) {
        const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;
        
        if (recentAvg > olderAvg + 0.5) trend = 'improving';
        else if (recentAvg < olderAvg - 0.5) trend = 'declining';
      }

      byCategory[category] = {
        compliance,
        targetValue,
        averageScore: Math.round(averageScore * 10) / 10,
        trend,
        daysOnTarget,
        totalDays: scores.length
      };

      overallCompliance += compliance;
      validCategories++;
    } else {
      byCategory[category] = {
        compliance: 0,
        targetValue,
        averageScore: 0,
        trend: 'stable',
        daysOnTarget: 0,
        totalDays: 0
      };
    }
  });

  const finalOverallCompliance = validCategories > 0 ? overallCompliance / validCategories : 0;
  
  // Determine overall trend and risk level
  const trends = Object.values(byCategory).map((cat: any) => cat.trend);
  const improvingCount = trends.filter(t => t === 'improving').length;
  const decliningCount = trends.filter(t => t === 'declining').length;
  
  const overallTrend = improvingCount > decliningCount ? 'improving' : 
                     decliningCount > improvingCount ? 'declining' : 'stable';

  const riskLevel = finalOverallCompliance >= 80 ? 'low' : 
                   finalOverallCompliance >= 60 ? 'medium' : 'high';

  // Generate recommendations
  const recommendations = generateCPDRecommendations(byCategory, overallTrend, riskLevel);

  return {
    overall: {
      compliance: Math.round(finalOverallCompliance),
      trend: overallTrend,
      riskLevel
    },
    byCategory,
    recommendations
  };
}

function generateCPDRecommendations(byCategory: any, overallTrend: string, riskLevel: string): string[] {
  const recommendations: string[] = [];

  // Category-specific recommendations
  Object.entries(byCategory).forEach(([category, data]: [string, any]) => {
    if (data.compliance < 70) {
      switch(category) {
        case 'diet':
          recommendations.push(`Consider simplifying nutrition goals or providing meal planning support`);
          break;
        case 'exercise':
          recommendations.push(`Review exercise plan for feasibility and patient physical limitations`);
          break;
        case 'medication':
          recommendations.push(`Assess medication adherence barriers and consider reminder systems`);
          break;
      }
    }
  });

  // Overall recommendations
  if (riskLevel === 'high') {
    recommendations.push('Schedule patient check-in to address compliance challenges');
  }
  
  if (overallTrend === 'declining') {
    recommendations.push('Consider CPD modification or additional patient support');
  }

  if (overallTrend === 'improving') {
    recommendations.push('Maintain current approach - patient showing positive progress');
  }

  return recommendations.length > 0 ? recommendations : ['Continue current monitoring approach'];
}

// ===== PATIENT PROGRESS REPORT GENERATION =====

export interface PatientProgressReportData {
  averageScores: {
    diet: number;
    exercise: number;
    medication: number;
    overall: number;
  };
  chatSentiment: {
    overallScore: number;
    analysis: string;
  };
  featureUsage: {
    [featureName: string]: {
      usageCount: number;
      lastUsed: string;
      engagementLevel: 'high' | 'medium' | 'low';
    };
  };
  recommendationSuccess: number;
  systemRecommendations: string[];
  cpdSuggestions: string[];
  behaviorPatterns: string[];
  clinicalObservations: string[];
}

export async function generatePatientProgressReport(
  patientId: number, 
  reportPeriodDays: number = 30
): Promise<PatientProgressReportData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - reportPeriodDays);

  try {
    // Get health metrics for the period
    const healthMetrics = await db.select()
      .from(schema.healthMetrics)
      .where(and(
        eq(schema.healthMetrics.userId, patientId),
        gte(schema.healthMetrics.date, startDate.toISOString().split('T')[0])
      ))
      .orderBy(desc(schema.healthMetrics.date));

    // Calculate average scores
    const averageScores = calculateAverageScores(healthMetrics);

    // Get chat sentiment analysis
    const chatSentiment = await analyzeChatSentiment(patientId, startDate);

    // Get feature usage data
    const featureUsage = await analyzeFeatureUsage(patientId, startDate);

    // Calculate recommendation success
    const recommendationSuccess = await calculateRecommendationSuccess(patientId, startDate);

    // Generate system recommendations
    const systemRecommendations = generateSystemRecommendations(healthMetrics, featureUsage);

    // Generate CPD suggestions
    const cpdSuggestions = await generateCPDSuggestions(patientId, healthMetrics);

    // Analyze behavior patterns
    const behaviorPatterns = analyzeBehaviorPatterns(healthMetrics);

    // Generate clinical observations
    const clinicalObservations = generateClinicalObservations(healthMetrics, featureUsage, chatSentiment);

    return {
      averageScores,
      chatSentiment,
      featureUsage,
      recommendationSuccess,
      systemRecommendations,
      cpdSuggestions,
      behaviorPatterns,
      clinicalObservations
    };

  } catch (error) {
    secureLog('Error generating PPR', { patientId, error: error instanceof Error ? error.message : 'Unknown error' });
    throw new Error('Failed to generate Patient Progress Report');
  }
}

function calculateAverageScores(healthMetrics: any[]) {
  if (healthMetrics.length === 0) {
    return { diet: 0, exercise: 0, medication: 0, overall: 0 };
  }

  const totals = healthMetrics.reduce((acc, metric) => ({
    diet: acc.diet + metric.dietScore,
    exercise: acc.exercise + metric.exerciseScore,
    medication: acc.medication + metric.medicationScore
  }), { diet: 0, exercise: 0, medication: 0 });

  const count = healthMetrics.length;
  const diet = Math.round((totals.diet / count) * 10) / 10;
  const exercise = Math.round((totals.exercise / count) * 10) / 10;
  const medication = Math.round((totals.medication / count) * 10) / 10;
  const overall = Math.round(((diet + exercise + medication) / 3) * 10) / 10;

  return { diet, exercise, medication, overall };
}

async function analyzeChatSentiment(patientId: number, startDate: Date) {
  // Get chat history for the period
  const chatHistory = await db.select()
    .from(schema.chatMemory)
    .where(and(
      eq(schema.chatMemory.userId, patientId),
      gte(schema.chatMemory.createdAt, startDate)
    ))
    .orderBy(desc(schema.chatMemory.createdAt));

  if (chatHistory.length === 0) {
    return {
      overallScore: 5.0,
      analysis: 'No chat interactions during this period'
    };
  }

  // Simple sentiment analysis based on content keywords
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  const positiveKeywords = ['good', 'great', 'better', 'improved', 'happy', 'motivated', 'success'];
  const negativeKeywords = ['bad', 'worse', 'difficult', 'struggling', 'frustrated', 'tired', 'failed'];

  chatHistory.forEach(chat => {
    const content = chat.content.toLowerCase();
    const hasPositive = positiveKeywords.some(keyword => content.includes(keyword));
    const hasNegative = negativeKeywords.some(keyword => content.includes(keyword));

    if (hasPositive && !hasNegative) positiveCount++;
    else if (hasNegative && !hasPositive) negativeCount++;
    else neutralCount++;
  });

  const total = chatHistory.length;
  const positiveRatio = positiveCount / total;
  const negativeRatio = negativeCount / total;

  // Score from 1-10 (5 is neutral)
  const overallScore = Math.round((5 + (positiveRatio - negativeRatio) * 5) * 10) / 10;

  const analysis = `Based on ${total} chat interactions: ${Math.round(positiveRatio * 100)}% positive, ${Math.round(negativeRatio * 100)}% negative, ${Math.round((neutralCount / total) * 100)}% neutral sentiment.`;

  return { overallScore: Math.max(1, Math.min(10, overallScore)), analysis };
}

async function analyzeFeatureUsage(patientId: number, startDate: Date) {
  const featureUsage = await db.select()
    .from(schema.featureUsage)
    .where(and(
      eq(schema.featureUsage.userId, patientId),
      gte(schema.featureUsage.lastUsed, startDate)
    ));

  const usage: any = {};

  featureUsage.forEach(feature => {
    const engagementLevel = feature.usageCount > 10 ? 'high' : 
                           feature.usageCount > 3 ? 'medium' : 'low';

    usage[feature.featureName] = {
      usageCount: feature.usageCount,
      lastUsed: feature.lastUsed.toISOString(),
      engagementLevel
    };
  });

  return usage;
}

async function calculateRecommendationSuccess(patientId: number, startDate: Date): Promise<number> {
  // Get recommendations made during the period
  const recommendations = await db.select()
    .from(schema.recommendations)
    .where(and(
      eq(schema.recommendations.userId, patientId),
      gte(schema.recommendations.createdAt, startDate)
    ));

  if (recommendations.length === 0) return 0;

  const followedRecommendations = recommendations.filter(rec => rec.wasFollowed).length;
  return Math.round((followedRecommendations / recommendations.length) * 100);
}

function generateSystemRecommendations(healthMetrics: any[], featureUsage: any): string[] {
  const recommendations: string[] = [];

  // Analyze health metrics trends
  if (healthMetrics.length > 0) {
    const recentAvg = healthMetrics.slice(0, 7).reduce((sum, m) => 
      sum + (m.dietScore + m.exerciseScore + m.medicationScore) / 3, 0
    ) / Math.min(7, healthMetrics.length);

    if (recentAvg < 6) {
      recommendations.push('Consider patient check-in - recent scores below target');
    }
    
    if (recentAvg >= 8) {
      recommendations.push('Patient performing well - consider advanced goals');
    }
  }

  // Analyze feature usage
  const highUsageFeatures = Object.entries(featureUsage)
    .filter(([_, data]: [string, any]) => data.engagementLevel === 'high')
    .map(([feature, _]) => feature);

  if (highUsageFeatures.length > 0) {
    recommendations.push(`Patient highly engaged with: ${highUsageFeatures.join(', ')}`);
  }

  const lowUsageFeatures = Object.entries(featureUsage)
    .filter(([_, data]: [string, any]) => data.engagementLevel === 'low')
    .map(([feature, _]) => feature);

  if (lowUsageFeatures.length > 0) {
    recommendations.push(`Consider promoting: ${lowUsageFeatures.join(', ')}`);
  }

  return recommendations.length > 0 ? recommendations : ['Continue current monitoring approach'];
}

async function generateCPDSuggestions(patientId: number, healthMetrics: any[]): Promise<string[]> {
  const suggestions: string[] = [];

  if (healthMetrics.length === 0) {
    return ['Insufficient data for CPD suggestions'];
  }

  // Get current CPDs
  const currentCPDs = await db.select()
    .from(schema.carePlanDirectives)
    .where(and(
      eq(schema.carePlanDirectives.userId, patientId),
      eq(schema.carePlanDirectives.active, true)
    ));

  // Analyze performance by category
  const categories = ['diet', 'exercise', 'medication'] as const;
  
  categories.forEach(category => {
    const scores = healthMetrics.map(m => {
      switch(category) {
        case 'diet': return m.dietScore;
        case 'exercise': return m.exerciseScore;
        case 'medication': return m.medicationScore;
        default: return 0;
      }
    });

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const currentCPD = currentCPDs.find(cpd => cpd.category === category);
    const targetValue = currentCPD?.targetValue || 8;

    if (avgScore >= targetValue + 1) {
      suggestions.push(`Consider increasing ${category} target - patient consistently exceeding current goal`);
    } else if (avgScore < targetValue - 2) {
      suggestions.push(`Consider lowering ${category} target or providing additional support`);
    }
  });

  return suggestions.length > 0 ? suggestions : ['Current CPDs appear appropriate'];
}

function analyzeBehaviorPatterns(healthMetrics: any[]): string[] {
  const patterns: string[] = [];

  if (healthMetrics.length < 7) {
    return ['Insufficient data for pattern analysis'];
  }

  // Weekend vs weekday analysis
  const weekdayScores: number[] = [];
  const weekendScores: number[] = [];

  healthMetrics.forEach(metric => {
    const date = new Date(metric.date);
    const dayOfWeek = date.getDay();
    const avgScore = (metric.dietScore + metric.exerciseScore + metric.medicationScore) / 3;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendScores.push(avgScore);
    } else {
      weekdayScores.push(avgScore);
    }
  });

  if (weekdayScores.length > 0 && weekendScores.length > 0) {
    const weekdayAvg = weekdayScores.reduce((sum, s) => sum + s, 0) / weekdayScores.length;
    const weekendAvg = weekendScores.reduce((sum, s) => sum + s, 0) / weekendScores.length;

    if (Math.abs(weekdayAvg - weekendAvg) > 1) {
      if (weekdayAvg > weekendAvg) {
        patterns.push('Patient performs better on weekdays - consider weekend-specific strategies');
      } else {
        patterns.push('Patient performs better on weekends - explore applying weekend strategies to weekdays');
      }
    }
  }

  // Consistency analysis
  const scores = healthMetrics.map(m => (m.dietScore + m.exerciseScore + m.medicationScore) / 3);
  const variance = calculateVariance(scores);

  if (variance < 1) {
    patterns.push('Patient shows consistent daily performance');
  } else if (variance > 3) {
    patterns.push('Patient shows high variability in daily performance - explore contributing factors');
  }

  return patterns.length > 0 ? patterns : ['No significant patterns identified'];
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
}

function generateClinicalObservations(healthMetrics: any[], featureUsage: any, chatSentiment: any): string[] {
  const observations: string[] = [];

  // Health metrics observations
  if (healthMetrics.length > 0) {
    const recentAvg = healthMetrics.slice(0, 7).reduce((sum, m) => 
      sum + (m.dietScore + m.exerciseScore + m.medicationScore) / 3, 0
    ) / Math.min(7, healthMetrics.length);

    if (recentAvg >= 8) {
      observations.push('Patient demonstrates excellent adherence to care plan');
    } else if (recentAvg < 6) {
      observations.push('Patient showing challenges with care plan adherence - may benefit from intervention');
    }
  }

  // Feature engagement observations
  const totalFeatureUsage = Object.values(featureUsage).reduce((sum: number, feature: any) => sum + feature.usageCount, 0);
  
  if (totalFeatureUsage > 50) {
    observations.push('High digital engagement - patient actively using KGC features');
  } else if (totalFeatureUsage < 10) {
    observations.push('Low digital engagement - consider strategies to increase app usage');
  }

  // Chat sentiment observations
  if (chatSentiment.overallScore >= 7) {
    observations.push('Positive communication sentiment - patient appears motivated and engaged');
  } else if (chatSentiment.overallScore <= 4) {
    observations.push('Concerning communication sentiment - patient may be experiencing challenges or frustration');
  }

  return observations.length > 0 ? observations : ['Standard monitoring recommended'];
}

// ===== MCA (MINI CLINICAL AUDIT) FUNCTIONS =====

export interface MCAProgress {
  totalHours: number;
  requiredHours: number;
  completionPercentage: number;
  activitiesCompleted: MCAActivitySummary[];
  certificateEligible: boolean;
  certificateGenerated: boolean;
  nextSteps: string[];
}

interface MCAActivitySummary {
  activityType: string;
  hoursEarned: number;
  completedAt: string;
  patientsAnalyzed: number;
}

export async function calculateMCAProgress(doctorId: number): Promise<MCAProgress> {
  try {
    // Get all MCA activities for this doctor
    const activities = await db.select()
      .from(schema.mcaActivities)
      .where(eq(schema.mcaActivities.doctorId, doctorId))
      .orderBy(desc(schema.mcaActivities.completedAt));

    const totalHours = activities.reduce((sum, activity) => sum + activity.hoursEarned, 0);
    const requiredHours = 5;
    const completionPercentage = Math.min((totalHours / requiredHours) * 100, 100);

    const activitiesCompleted = activities.map(activity => ({
      activityType: activity.activityType,
      hoursEarned: activity.hoursEarned,
      completedAt: activity.completedAt.toISOString(),
      patientsAnalyzed: JSON.parse(activity.patientsAnalyzed || '[]').length
    }));

    const certificateEligible = totalHours >= requiredHours;
    
    // Check if certificate has been generated
    const certificateGenerated = await checkCertificateGenerated(doctorId);

    // Generate next steps
    const nextSteps = generateMCANextSteps(totalHours, requiredHours, activities);

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      requiredHours,
      completionPercentage: Math.round(completionPercentage),
      activitiesCompleted,
      certificateEligible,
      certificateGenerated,
      nextSteps
    };

  } catch (error) {
    secureLog('Error calculating MCA progress', { doctorId, error: error instanceof Error ? error.message : 'Unknown error' });
    throw new Error('Failed to calculate MCA progress');
  }
}

export async function calculateTotalMCAHours(doctorId: number): Promise<number> {
  const result = await db.select({
    totalHours: sql<number>`COALESCE(SUM(${schema.mcaActivities.hoursEarned}), 0)`
  })
  .from(schema.mcaActivities)
  .where(eq(schema.mcaActivities.doctorId, doctorId));

  return result[0]?.totalHours || 0;
}

async function checkCertificateGenerated(doctorId: number): Promise<boolean> {
  // Check if certificate record exists (you might want to add a certificates table)
  // For now, we'll check if they have completed 5+ hours
  const totalHours = await calculateTotalMCAHours(doctorId);
  return totalHours >= 5;
}

function generateMCANextSteps(totalHours: number, requiredHours: number, activities: any[]): string[] {
  const nextSteps: string[] = [];
  const remainingHours = Math.max(0, requiredHours - totalHours);

  if (remainingHours > 0) {
    nextSteps.push(`Complete ${remainingHours.toFixed(1)} more hours to earn your CPD certificate`);
    
    // Suggest specific activities based on what they haven't done
    const completedTypes = new Set(activities.map(a => a.activityType));
    
    if (!completedTypes.has('patient_outcome')) {
      nextSteps.push('Analyze patient outcomes (1.0 hour) - Review patient progress data');
    }
    
    if (!completedTypes.has('compliance_review')) {
      nextSteps.push('Conduct compliance analysis (0.5 hour) - Audit medication adherence patterns');
    }
    
    if (!completedTypes.has('data_analysis')) {
      nextSteps.push('Perform data analysis (1.0 hour) - Analyze health score trends');
    }
    
    if (!completedTypes.has('reflection')) {
      nextSteps.push('Clinical reflection (1.5 hours) - Document insights and improvements');
    }
    
    if (!completedTypes.has('quarterly_review')) {
      nextSteps.push('Quarterly review (1.0 hour) - Comprehensive outcome assessment');
    }
  } else {
    nextSteps.push('Congratulations! You have completed the required 5 hours');
    nextSteps.push('Generate your CPD certificate to complete the Mini Clinical Audit');
  }

  return nextSteps;
}

export async function generateMCACertificate(doctorId: number): Promise<any> {
  try {
    // Get doctor details
    const doctor = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, doctorId))
      .limit(1);

    if (doctor.length === 0) {
      throw new Error('Doctor not found');
    }

    // Get MCA activities
    const activities = await db.select()
      .from(schema.mcaActivities)
      .where(eq(schema.mcaActivities.doctorId, doctorId))
      .orderBy(desc(schema.mcaActivities.completedAt));

    const totalHours = activities.reduce((sum, activity) => sum + activity.hoursEarned, 0);

    if (totalHours < 5) {
      throw new Error('Insufficient hours completed for certificate');
    }

    // Generate certificate data
    const certificate = {
      doctorId,
      doctorName: doctor[0].name,
      programName: 'KGC Mini Clinical Audit - Measuring Outcomes',
      hoursCompleted: totalHours,
      completionDate: new Date().toISOString(),
      certificateId: `KGC-MCA-${doctorId}-${Date.now()}`,
      activities: activities.map(a => ({
        type: a.activityType,
        hours: a.hoursEarned,
        date: a.completedAt.toISOString()
      })),
      accreditingBodies: ['ACRRM', 'RACGP'],
      category: 'Measuring Outcomes'
    };

    secureLog('MCA certificate generated', { 
      doctorId, 
      certificateId: certificate.certificateId,
      totalHours 
    });

    return certificate;

  } catch (error) {
    secureLog('Error generating MCA certificate', { 
      doctorId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('Failed to generate MCA certificate');
  }
}