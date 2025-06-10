/**
 * Proactive Monitoring System - Phase 4: Real-time Health Monitoring
 * Continuous monitoring with intelligent alert generation and intervention triggers
 */

import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, desc, gte, sql, and } from 'drizzle-orm';
import { secureLog } from './privacyMiddleware';
import { analyzeHealthTrends, generatePredictiveAlerts, generateAnalyticsInsights } from './analyticsEngine';

interface MonitoringRule {
  id: string;
  name: string;
  condition: (metrics: any[]) => boolean;
  alertType: 'immediate' | 'daily' | 'weekly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionRequired: boolean;
}

interface HealthAlert {
  id: string;
  userId: number;
  type: 'adherence' | 'trend' | 'milestone' | 'intervention' | 'predictive';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  actionItems: string[];
  confidence: number;
}

interface MonitoringSession {
  userId: number;
  startTime: Date;
  endTime?: Date;
  alertsGenerated: number;
  trendsAnalyzed: number;
  interventionsTriggered: number;
  status: 'active' | 'completed' | 'error';
}

class ProactiveMonitoringSystem {
  private static instance: ProactiveMonitoringSystem;
  private monitoringRules: MonitoringRule[] = [];
  private activeSessions: Map<number, MonitoringSession> = new Map();

  private constructor() {
    this.initializeMonitoringRules();
  }

  static getInstance(): ProactiveMonitoringSystem {
    if (!ProactiveMonitoringSystem.instance) {
      ProactiveMonitoringSystem.instance = new ProactiveMonitoringSystem();
    }
    return ProactiveMonitoringSystem.instance;
  }

  /**
   * Initialize standard monitoring rules for chronic disease management
   */
  private initializeMonitoringRules(): void {
    this.monitoringRules = [
      {
        id: 'medication_adherence_critical',
        name: 'Critical Medication Adherence Drop',
        condition: (metrics) => {
          const recent = metrics.slice(0, 3);
          const avgAdherence = recent.reduce((sum, m) => sum + (m.medicationAdherence || 0), 0) / recent.length;
          return avgAdherence < 50;
        },
        alertType: 'immediate',
        severity: 'critical',
        message: 'Medication adherence has dropped to critical levels',
        actionRequired: true
      },
      {
        id: 'declining_wellbeing_pattern',
        name: 'Declining Wellbeing Pattern',
        condition: (metrics) => {
          if (metrics.length < 7) return false;
          const recent = metrics.slice(0, 3);
          const prior = metrics.slice(3, 6);
          const recentAvg = recent.reduce((sum, m) => sum + (m.overallWellbeing || 0), 0) / recent.length;
          const priorAvg = prior.reduce((sum, m) => sum + (m.overallWellbeing || 0), 0) / prior.length;
          return recentAvg < priorAvg - 20;
        },
        alertType: 'daily',
        severity: 'high',
        message: 'Overall wellbeing showing concerning decline',
        actionRequired: true
      },
      {
        id: 'positive_momentum',
        name: 'Positive Health Momentum',
        condition: (metrics) => {
          if (metrics.length < 7) return false;
          const recent = metrics.slice(0, 3);
          const prior = metrics.slice(3, 6);
          const recentAvg = recent.reduce((sum, m) => sum + (m.overallWellbeing || 0), 0) / recent.length;
          const priorAvg = prior.reduce((sum, m) => sum + (m.overallWellbeing || 0), 0) / prior.length;
          return recentAvg > priorAvg + 15 && recentAvg > 80;
        },
        alertType: 'weekly',
        severity: 'low',
        message: 'Excellent progress detected - health metrics improving',
        actionRequired: false
      },
      {
        id: 'inconsistent_tracking',
        name: 'Inconsistent Health Tracking',
        condition: (metrics) => {
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          const recentEntries = metrics.filter(m => 
            m.recordedAt && new Date(m.recordedAt) > lastWeek
          );
          return recentEntries.length < 3;
        },
        alertType: 'weekly',
        severity: 'medium',
        message: 'Health tracking frequency has decreased',
        actionRequired: false
      },
      {
        id: 'diet_exercise_correlation',
        name: 'Diet-Exercise Correlation Alert',
        condition: (metrics) => {
          if (metrics.length < 10) return false;
          const recent = metrics.slice(0, 10);
          const lowDietDays = recent.filter(m => (m.dietScore || 0) < 60).length;
          const lowExerciseDays = recent.filter(m => (m.exerciseScore || 0) < 60).length;
          return lowDietDays > 6 && lowExerciseDays > 6;
        },
        alertType: 'weekly',
        severity: 'high',
        message: 'Both diet and exercise scores consistently low',
        actionRequired: true
      }
    ];
  }

  /**
   * Start comprehensive monitoring session for a user
   */
  async startMonitoringSession(userId: number): Promise<MonitoringSession> {
    try {
      secureLog('Proactive monitoring session started', { userId });

      const session: MonitoringSession = {
        userId,
        startTime: new Date(),
        alertsGenerated: 0,
        trendsAnalyzed: 0,
        interventionsTriggered: 0,
        status: 'active'
      };

      this.activeSessions.set(userId, session);

      // Run comprehensive monitoring
      await this.runComprehensiveMonitoring(userId);

      return session;

    } catch (error) {
      secureLog('Monitoring session start error', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        userId,
        startTime: new Date(),
        alertsGenerated: 0,
        trendsAnalyzed: 0,
        interventionsTriggered: 0,
        status: 'error'
      };
    }
  }

  /**
   * Run comprehensive monitoring analysis
   */
  private async runComprehensiveMonitoring(userId: number): Promise<void> {
    const session = this.activeSessions.get(userId);
    if (!session) return;

    try {
      // Get patient ID first
      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.userId, userId)
      });

      if (!patient) {
        session.status = 'error';
        return;
      }

      // Fetch recent health metrics
      const healthMetrics = await db.query.healthMetrics.findMany({
        where: eq(schema.healthMetrics.patientId, patient.id),
        orderBy: desc(schema.healthMetrics.date),
        limit: 30
      });

      // Run rule-based monitoring
      const ruleAlerts = await this.evaluateMonitoringRules(userId, healthMetrics);
      session.alertsGenerated += ruleAlerts.length;

      // Run AI-powered trend analysis
      const trends = await analyzeHealthTrends(userId, 21);
      session.trendsAnalyzed += trends.length;

      // Generate predictive alerts
      const predictiveAlerts = await generatePredictiveAlerts(userId);
      session.alertsGenerated += predictiveAlerts.length;

      // Check for intervention triggers
      const interventions = await this.checkInterventionTriggers(userId, healthMetrics, trends);
      session.interventionsTriggered += interventions.length;

      // Convert predictive alerts to health alerts format
      const convertedPredictiveAlerts: HealthAlert[] = predictiveAlerts.map(alert => ({
        id: alert.alertId,
        userId: alert.userId,
        type: alert.type as any,
        severity: alert.severity,
        title: alert.message,
        message: alert.message,
        triggeredAt: new Date(alert.triggeredAt),
        acknowledged: false,
        actionItems: alert.suggestedActions,
        confidence: alert.confidence
      }));

      // Store alerts in database
      await this.storeMonitoringResults(userId, [...ruleAlerts, ...convertedPredictiveAlerts]);

      session.status = 'completed';
      session.endTime = new Date();

      secureLog('Comprehensive monitoring completed', {
        userId,
        alertsGenerated: session.alertsGenerated,
        trendsAnalyzed: session.trendsAnalyzed,
        interventionsTriggered: session.interventionsTriggered
      });

    } catch (error) {
      session.status = 'error';
      secureLog('Comprehensive monitoring error', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Evaluate monitoring rules against current health data
   */
  private async evaluateMonitoringRules(userId: number, healthMetrics: any[]): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = [];

    for (const rule of this.monitoringRules) {
      try {
        if (rule.condition(healthMetrics)) {
          const alert: HealthAlert = {
            id: `rule_${rule.id}_${Date.now()}`,
            userId,
            type: rule.id.includes('adherence') ? 'adherence' :
                  rule.id.includes('trend') || rule.id.includes('wellbeing') ? 'trend' :
                  rule.id.includes('momentum') ? 'milestone' : 'intervention',
            severity: rule.severity,
            title: rule.name,
            message: rule.message,
            triggeredAt: new Date(),
            acknowledged: false,
            actionItems: this.generateActionItems(rule),
            confidence: 0.85
          };

          alerts.push(alert);
        }
      } catch (error) {
        secureLog('Rule evaluation error', { 
          userId, 
          ruleId: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return alerts;
  }

  /**
   * Check for intervention triggers requiring immediate action
   */
  private async checkInterventionTriggers(userId: number, healthMetrics: any[], trends: any[]): Promise<string[]> {
    const interventions: string[] = [];

    // Critical medication adherence
    const recentAdherence = healthMetrics.slice(0, 3);
    const avgAdherence = recentAdherence.reduce((sum, m) => sum + (m.medicationAdherence || 0), 0) / recentAdherence.length;
    
    if (avgAdherence < 40) {
      interventions.push('immediate_medication_support');
    }

    // Multiple declining trends
    const decliningTrends = trends.filter(t => t.trend === 'declining' || t.trend === 'concerning');
    if (decliningTrends.length >= 3) {
      interventions.push('comprehensive_care_review');
    }

    // Consistent low wellbeing
    const recentWellbeing = healthMetrics.slice(0, 5);
    const lowWellbeingDays = recentWellbeing.filter(m => (m.overallWellbeing || 0) < 50).length;
    
    if (lowWellbeingDays >= 4) {
      interventions.push('mental_health_support');
    }

    return interventions;
  }

  /**
   * Generate actionable items based on monitoring rule
   */
  private generateActionItems(rule: MonitoringRule): string[] {
    const actionItems: { [key: string]: string[] } = {
      'medication_adherence_critical': [
        'Contact healthcare provider immediately',
        'Review medication schedule and barriers',
        'Set up additional medication reminders',
        'Consider medication management support'
      ],
      'declining_wellbeing_pattern': [
        'Schedule check-in with healthcare team',
        'Review recent life changes or stressors',
        'Consider additional support resources',
        'Increase self-care activities'
      ],
      'positive_momentum': [
        'Continue current successful practices',
        'Consider setting new health goals',
        'Share progress with healthcare team',
        'Maintain current routines'
      ],
      'inconsistent_tracking': [
        'Set daily health tracking reminders',
        'Identify barriers to consistent tracking',
        'Simplify tracking routine',
        'Review tracking benefits with healthcare team'
      ],
      'diet_exercise_correlation': [
        'Focus on meal planning and preparation',
        'Start with simple, achievable exercise goals',
        'Consider nutrition and fitness guidance',
        'Identify enjoyable physical activities'
      ]
    };

    return actionItems[rule.id] || ['Review with healthcare provider', 'Monitor closely'];
  }

  /**
   * Store monitoring results in database
   */
  private async storeMonitoringResults(userId: number, alerts: HealthAlert[]): Promise<void> {
    try {
      // In a full implementation, we would store alerts in a dedicated table
      // For now, we log the monitoring results
      secureLog('Monitoring results stored', {
        userId,
        alertsCount: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        highAlerts: alerts.filter(a => a.severity === 'high').length
      });

    } catch (error) {
      secureLog('Monitoring results storage error', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get monitoring status for a user
   */
  getMonitoringStatus(userId: number): MonitoringSession | null {
    return this.activeSessions.get(userId) || null;
  }

  /**
   * Get active alerts for a user
   */
  async getActiveAlerts(userId: number): Promise<HealthAlert[]> {
    try {
      // Get patient ID first
      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.userId, userId)
      });

      if (!patient) {
        return [];
      }

      // Fetch recent health metrics
      const healthMetrics = await db.query.healthMetrics.findMany({
        where: eq(schema.healthMetrics.patientId, patient.id),
        orderBy: desc(schema.healthMetrics.date),
        limit: 15
      });

      // Generate current alerts
      const alerts = await this.evaluateMonitoringRules(userId, healthMetrics);
      
      return alerts.filter(alert => !alert.acknowledged);

    } catch (error) {
      secureLog('Get active alerts error', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return [];
    }
  }
}

export const proactiveMonitoring = ProactiveMonitoringSystem.getInstance();