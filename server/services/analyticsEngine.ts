/**
 * Analytics Engine - Phase 4: Advanced Analytics and Predictive Health Insights
 * Provides intelligent monitoring, trend analysis, and proactive health alerts
 */

import OpenAI from 'openai';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';
import { secureLog } from './privacyMiddleware';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface HealthTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'declining' | 'concerning';
  confidence: number;
  timeframe: string;
  recommendation: string;
}

interface PredictiveAlert {
  alertId: string;
  userId: number;
  type: 'risk_pattern' | 'opportunity' | 'intervention_needed' | 'goal_milestone';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionable: boolean;
  suggestedActions: string[];
  confidence: number;
  triggeredAt: string;
}

interface AnalyticsInsight {
  type: 'trend_analysis' | 'pattern_recognition' | 'predictive_alert' | 'goal_tracking';
  title: string;
  summary: string;
  details: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Analyze health trends over time using AI
 */
export async function analyzeHealthTrends(userId: number, timeframeDays: number = 30): Promise<HealthTrend[]> {
  try {
    secureLog('Health trend analysis initiated', { userId, timeframeDays });

    // Fetch recent health metrics
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    // First get patient ID from user ID
    const patient = await db.query.patients.findFirst({
      where: eq(schema.patients.userId, userId)
    });

    if (!patient) {
      return [{
        metric: 'overall',
        trend: 'stable',
        confidence: 0.1,
        timeframe: `${timeframeDays} days`,
        recommendation: 'Patient profile not found'
      }];
    }

    const healthMetrics = await db.query.healthMetrics.findMany({
      where: eq(schema.healthMetrics.patientId, patient.id),
      orderBy: desc(schema.healthMetrics.date),
      limit: 100
    });

    if (healthMetrics.length < 3) {
      return [{
        metric: 'overall',
        trend: 'stable',
        confidence: 0.1,
        timeframe: `${timeframeDays} days`,
        recommendation: 'Continue recording daily metrics to enable trend analysis'
      }];
    }

    // Prepare data for AI analysis
    const metricsData = healthMetrics.map(metric => ({
      date: metric.date?.toISOString().split('T')[0],
      diet: metric.dietScore,
      exercise: metric.exerciseScore,
      medication: metric.medicationScore,
      overall: Math.round((metric.dietScore + metric.exerciseScore + metric.medicationScore) / 3)
    }));

    const systemPrompt = `You are a healthcare analytics specialist analyzing patient health trends. 
    
GUIDELINES:
- Identify meaningful patterns in health metrics over time
- Assess trend direction (improving/stable/declining/concerning)
- Provide confidence levels based on data consistency
- Suggest actionable recommendations
- Focus on behavioral patterns and adherence
- Never provide medical diagnoses

RESPONSE FORMAT:
Return a JSON array of trend objects with: metric, trend, confidence (0-1), timeframe, recommendation`;

    const userPrompt = `Analyze these health metrics for trends:

TIME PERIOD: ${timeframeDays} days
DATA POINTS: ${healthMetrics.length} records

METRICS DATA:
${JSON.stringify(metricsData.slice(0, 30), null, 2)}

Identify trends for: diet, exercise, medication, overall wellbeing.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const aiResponse = response.choices[0]?.message?.content;
    let trends: HealthTrend[] = [];

    try {
      trends = JSON.parse(aiResponse || '[]');
    } catch {
      // Fallback analysis
      trends = performBasicTrendAnalysis(healthMetrics, timeframeDays);
    }

    secureLog('Health trend analysis completed', { 
      userId, 
      trendsCount: trends.length,
      timeframeDays 
    });

    return trends;

  } catch (error) {
    secureLog('Health trend analysis error', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return performBasicTrendAnalysis([], timeframeDays);
  }
}

/**
 * Generate predictive health alerts using pattern recognition
 */
export async function generatePredictiveAlerts(userId: number): Promise<PredictiveAlert[]> {
  try {
    secureLog('Predictive alert generation initiated', { userId });

    // Get patient ID first
    const patient = await db.query.patients.findFirst({
      where: eq(schema.patients.userId, userId)
    });

    if (!patient) {
      return [];
    }

    // Fetch recent health data and patterns
    const [healthMetrics, user] = await Promise.all([
      db.query.healthMetrics.findMany({
        where: eq(schema.healthMetrics.patientId, patient.id),
        orderBy: desc(schema.healthMetrics.date),
        limit: 21 // 3 weeks of data
      }),
      db.query.users.findFirst({
        where: eq(schema.users.id, userId)
      })
    ]);

    if (!user || healthMetrics.length < 7) {
      return [];
    }

    // Analyze patterns for predictive insights
    const recentMetrics = healthMetrics.slice(0, 7); // Last week
    const priorMetrics = healthMetrics.slice(7, 14); // Previous week

    const alerts: PredictiveAlert[] = [];

    // Detect declining adherence patterns
    const recentAdherence = recentMetrics.reduce((sum, m) => sum + (m.medicationScore || 0), 0) / recentMetrics.length;
    const priorAdherence = priorMetrics.reduce((sum, m) => sum + (m.medicationScore || 0), 0) / priorMetrics.length;

    if (recentAdherence < priorAdherence - 15 && recentAdherence < 70) {
      alerts.push({
        alertId: `med_decline_${Date.now()}`,
        userId,
        type: 'intervention_needed',
        severity: 'high',
        message: 'Medication adherence declining - intervention may be needed',
        actionable: true,
        suggestedActions: [
          'Review medication routine with healthcare provider',
          'Set up medication reminders',
          'Address any side effects or concerns'
        ],
        confidence: 0.8,
        triggeredAt: new Date().toISOString()
      });
    }

    // Detect positive momentum for goal milestones
    const recentOverall = recentMetrics.reduce((sum, m) => sum + Math.round((m.dietScore + m.exerciseScore + m.medicationScore) / 3), 0) / recentMetrics.length;
    const priorOverall = priorMetrics.reduce((sum, m) => sum + Math.round((m.dietScore + m.exerciseScore + m.medicationScore) / 3), 0) / priorMetrics.length;

    if (recentOverall > priorOverall + 10 && recentOverall > 75) {
      alerts.push({
        alertId: `milestone_${Date.now()}`,
        userId,
        type: 'goal_milestone',
        severity: 'low',
        message: 'Significant wellbeing improvement detected - great progress!',
        actionable: true,
        suggestedActions: [
          'Continue current health practices',
          'Consider setting new wellness goals',
          'Share success with healthcare team'
        ],
        confidence: 0.75,
        triggeredAt: new Date().toISOString()
      });
    }

    // Use AI for advanced pattern recognition
    const aiAlerts = await generateAIPredictiveAlerts(userId, healthMetrics);
    alerts.push(...aiAlerts);

    secureLog('Predictive alerts generated', { 
      userId, 
      alertsCount: alerts.length 
    });

    return alerts;

  } catch (error) {
    secureLog('Predictive alert generation error', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return [];
  }
}

/**
 * Generate comprehensive analytics insights
 */
export async function generateAnalyticsInsights(userId: number): Promise<AnalyticsInsight[]> {
  try {
    secureLog('Analytics insights generation initiated', { userId });

    const [trends, alerts] = await Promise.all([
      analyzeHealthTrends(userId, 30),
      generatePredictiveAlerts(userId)
    ]);

    const insights: AnalyticsInsight[] = [];

    // Trend-based insights
    const decliningTrends = trends.filter(t => t.trend === 'declining' || t.trend === 'concerning');
    if (decliningTrends.length > 0) {
      insights.push({
        type: 'trend_analysis',
        title: 'Areas Needing Attention',
        summary: `${decliningTrends.length} health metrics showing declining trends`,
        details: decliningTrends.map(t => `${t.metric}: ${t.recommendation}`).join('. '),
        actionable: true,
        priority: 'high',
        recommendations: decliningTrends.map(t => t.recommendation)
      });
    }

    const improvingTrends = trends.filter(t => t.trend === 'improving');
    if (improvingTrends.length > 0) {
      insights.push({
        type: 'trend_analysis',
        title: 'Positive Progress',
        summary: `${improvingTrends.length} health metrics showing improvement`,
        details: improvingTrends.map(t => `${t.metric} is improving over ${t.timeframe}`).join('. '),
        actionable: true,
        priority: 'medium',
        recommendations: ['Continue current successful practices', 'Consider expanding effective strategies']
      });
    }

    // Alert-based insights
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    if (criticalAlerts.length > 0) {
      insights.push({
        type: 'predictive_alert',
        title: 'Immediate Action Required',
        summary: `${criticalAlerts.length} high-priority health alerts detected`,
        details: criticalAlerts.map(a => a.message).join('. '),
        actionable: true,
        priority: 'high',
        recommendations: criticalAlerts.flatMap(a => a.suggestedActions)
      });
    }

    secureLog('Analytics insights generated', { 
      userId, 
      insightsCount: insights.length 
    });

    return insights;

  } catch (error) {
    secureLog('Analytics insights generation error', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return [];
  }
}

/**
 * AI-powered predictive alert generation
 */
async function generateAIPredictiveAlerts(userId: number, healthMetrics: any[]): Promise<PredictiveAlert[]> {
  try {
    if (healthMetrics.length < 10) return [];

    const systemPrompt = `You are a predictive health analytics AI specializing in pattern recognition for chronic disease management.

GUIDELINES:
- Identify subtle patterns that may indicate future health risks or opportunities
- Focus on behavioral patterns and adherence trends
- Generate actionable alerts with specific recommendations
- Assign appropriate severity levels
- Never provide medical diagnoses

RESPONSE FORMAT:
Return JSON array of alerts with: type, severity, message, suggestedActions, confidence (0-1)`;

    const userPrompt = `Analyze these health metrics for predictive patterns:

DATA: ${JSON.stringify(healthMetrics.slice(0, 21), null, 2)}

Identify patterns that suggest:
1. Risk of health decline
2. Opportunities for improvement
3. Need for intervention
4. Goal milestone achievements`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.4
    });

    const aiResponse = response.choices[0]?.message?.content;
    let aiAlerts: any[] = [];

    try {
      aiAlerts = JSON.parse(aiResponse || '[]');
    } catch {
      return [];
    }

    return aiAlerts.map((alert: any, index: number) => ({
      alertId: `ai_alert_${Date.now()}_${index}`,
      userId,
      type: alert.type || 'risk_pattern',
      severity: alert.severity || 'medium',
      message: alert.message || 'Pattern detected requiring attention',
      actionable: true,
      suggestedActions: alert.suggestedActions || [],
      confidence: alert.confidence || 0.6,
      triggeredAt: new Date().toISOString()
    }));

  } catch (error) {
    secureLog('AI predictive alerts error', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return [];
  }
}

/**
 * Fallback basic trend analysis
 */
function performBasicTrendAnalysis(healthMetrics: any[], timeframeDays: number): HealthTrend[] {
  if (healthMetrics.length < 3) {
    return [{
      metric: 'overall',
      trend: 'stable',
      confidence: 0.1,
      timeframe: `${timeframeDays} days`,
      recommendation: 'Continue recording daily metrics to enable comprehensive analysis'
    }];
  }

  const recent = healthMetrics.slice(0, Math.floor(healthMetrics.length / 2));
  const prior = healthMetrics.slice(Math.floor(healthMetrics.length / 2));

  const trends: HealthTrend[] = [];

  // Basic trend calculation for each metric
  ['dietScore', 'exerciseScore', 'medicationScore'].forEach(metric => {
    const recentAvg = recent.reduce((sum, m) => sum + (m[metric] || 0), 0) / recent.length;
    const priorAvg = prior.reduce((sum, m) => sum + (m[metric] || 0), 0) / prior.length;
    
    const difference = recentAvg - priorAvg;
    let trend: 'improving' | 'stable' | 'declining' | 'concerning';
    
    if (difference > 10) trend = 'improving';
    else if (difference < -15) trend = 'concerning';
    else if (difference < -5) trend = 'declining';
    else trend = 'stable';

    trends.push({
      metric: metric.replace('Score', '').replace('Adherence', ''),
      trend,
      confidence: Math.min(0.7, healthMetrics.length / 30),
      timeframe: `${timeframeDays} days`,
      recommendation: trend === 'improving' ? 'Continue current practices' : 
                     trend === 'stable' ? 'Maintain consistency' :
                     'Focus on improving this area'
    });
  });

  return trends;
}