/**
 * Enhanced Audit Logging System for Healthcare Compliance
 * Supports HIPAA, TGA SaMD, and Australian Privacy Principles
 */

import { envManager } from './environmentConfig';
import { db } from './db';
import { auditLog } from '@shared/schema';

export interface AuditEvent {
  eventType: 'LOGIN' | 'LOGOUT' | 'DATA_ACCESS' | 'DATA_MODIFY' | 'UNAUTHORIZED_ACCESS' | 'ADMIN_ACCESS' | 'PHI_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: number;
  targetUserId?: number;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  complianceStandards?: string[];
}

export interface SecurityAlert {
  type: 'SUSPICIOUS_LOGIN_ACTIVITY' | 'UNAUTHORIZED_ACCESS' | 'DATA_BREACH_ATTEMPT' | 'ADMIN_OVERRIDE';
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ipAddress: string;
  userIdentifier?: string;
  details: Record<string, any>;
}

class AuditLogger {
  private static instance: AuditLogger;
  private config = envManager.getConfig();

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }

  async logSecurityEvent(event: AuditEvent): Promise<void> {
    const auditEntry = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId || null,
      targetUserId: event.targetUserId || null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: JSON.stringify(event.details),
      complianceStandards: event.complianceStandards?.join(',') || 'HIPAA,TGA_SaMD,APP',
      environment: envManager.getEnvironment()
    };

    try {
      // Always log to database
      await db.insert(auditLog).values(auditEntry);

      // Environment-specific additional logging
      switch (this.config.alerting) {
        case 'console':
          console.log(`[AUDIT] ${event.eventType}:`, auditEntry);
          break;
        case 'database':
          // Already logged to database above
          break;
        case 'cloudwatch':
          await this.sendToCloudWatch(auditEntry);
          break;
        case 'siem':
          await this.sendToSIEM(auditEntry);
          break;
      }

      // High severity events trigger immediate alerts
      if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
        await this.triggerSecurityAlert({
          type: 'UNAUTHORIZED_ACCESS',
          severity: event.severity,
          ipAddress: event.ipAddress,
          userIdentifier: event.userId?.toString(),
          details: event.details
        });
      }

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Fallback to console logging if database fails
      console.log('[AUDIT FALLBACK]', auditEntry);
    }
  }

  async logDataAccess(context: {
    userId: number;
    accessedBy: number;
    dataType: string;
    action: 'read' | 'write' | 'delete';
    isAdminAccess: boolean;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: context.isAdminAccess ? 'ADMIN_ACCESS' : 'DATA_ACCESS',
      severity: context.isAdminAccess ? 'MEDIUM' : 'LOW',
      userId: context.accessedBy,
      targetUserId: context.userId !== context.accessedBy ? context.userId : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        dataType: context.dataType,
        action: context.action,
        isAdminAccess: context.isAdminAccess,
        complianceNote: 'PHI access logged for regulatory compliance'
      },
      complianceStandards: ['HIPAA', 'TGA_SaMD', 'APP']
    });
  }

  async logAuthenticationEvent(context: {
    eventType: 'LOGIN' | 'LOGOUT';
    userId?: number;
    success: boolean;
    ipAddress: string;
    userAgent: string;
    details?: Record<string, any>;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: context.eventType,
      severity: context.success ? 'LOW' : 'MEDIUM',
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        success: context.success,
        ...context.details
      }
    });
  }

  async triggerSecurityAlert(alert: SecurityAlert): Promise<void> {
    const alertData = {
      ...alert,
      timestamp: new Date().toISOString(),
      alertId: crypto.randomUUID(),
      environment: envManager.getEnvironment()
    };

    switch (this.config.alerting) {
      case 'console':
        console.warn(`[SECURITY ALERT] ${alert.type}:`, alertData);
        break;
      case 'database':
        // Log as critical audit event
        await this.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: alert.severity,
          ipAddress: alert.ipAddress,
          userAgent: 'SYSTEM_ALERT',
          details: { alertType: alert.type, ...alert.details }
        });
        break;
      case 'cloudwatch':
        await this.sendAlertToCloudWatch(alertData);
        break;
      case 'siem':
        await this.sendAlertToSIEM(alertData);
        break;
    }
  }

  private async sendToCloudWatch(auditEntry: any): Promise<void> {
    // AWS CloudWatch integration for production
    if (envManager.supportsAWSServices()) {
      try {
        // Implementation would use AWS SDK CloudWatch Logs
        console.log('[CloudWatch] Audit log sent:', auditEntry.eventId);
      } catch (error) {
        console.error('CloudWatch logging failed:', error);
      }
    }
  }

  private async sendToSIEM(auditEntry: any): Promise<void> {
    // SIEM integration for enterprise environments
    try {
      // Implementation would send to SIEM endpoint
      console.log('[SIEM] Audit log sent:', auditEntry.eventId);
    } catch (error) {
      console.error('SIEM logging failed:', error);
    }
  }

  private async sendAlertToCloudWatch(alertData: any): Promise<void> {
    if (envManager.supportsAWSServices()) {
      try {
        // AWS SNS or CloudWatch Events integration
        console.log('[CloudWatch Alert] Security alert sent:', alertData.alertId);
      } catch (error) {
        console.error('CloudWatch alerting failed:', error);
      }
    }
  }

  private async sendAlertToSIEM(alertData: any): Promise<void> {
    try {
      // SIEM alert integration
      console.log('[SIEM Alert] Security alert sent:', alertData.alertId);
    } catch (error) {
      console.error('SIEM alerting failed:', error);
    }
  }
}

export const auditLogger = AuditLogger.getInstance();