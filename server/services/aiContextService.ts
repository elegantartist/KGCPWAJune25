/**
 * AI Context Service - Secure AI Data Preparation
 * Uses privacy middleware for all AI-related data processing
 */

import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { 
  createSafeMcpBundle, 
  validateMcpBundleSecurity, 
  secureLog, 
  emergencyPiiScan 
} from './privacyMiddleware';
import { auditLogger } from '../auditLogger';

interface AIContextRequest {
  userId: number;
  doctorId?: number;
  includeHealthMetrics?: boolean;
  includeChatHistory?: boolean;
  maxHistoryItems?: number;
}

interface AIContextResponse {
  secureBundle: any;
  securityValidation: {
    isSecure: boolean;
    violations: string[];
  };
  sessionId: string;
  timestamp: Date;
}

export class AIContextService {
  /**
   * Prepare secure context for AI processing
   */
  static async prepareSecureContext(request: AIContextRequest): Promise<AIContextResponse> {
    const sessionId = crypto.randomUUID();
    
    try {
      secureLog('Preparing AI context for user', { userId: request.userId, sessionId });

      // Fetch user details
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, request.userId)
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Fetch patient record
      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.userId, request.userId)
      });

      // Prepare user details with latest health metrics
      const userDetails: any = {
        latest_scores: {}
      };

      if (request.includeHealthMetrics && patient) {
        const latestMetrics = await db.select()
          .from(schema.healthMetrics)
          .where(eq(schema.healthMetrics.patientId, patient.id))
          .orderBy(desc(schema.healthMetrics.date))
          .limit(1);

        if (latestMetrics.length > 0) {
          userDetails.latest_scores = {
            medication_score: latestMetrics[0].medicationScore,
            diet_score: latestMetrics[0].dietScore,
            exercise_score: latestMetrics[0].exerciseScore,
            date: latestMetrics[0].date
          };
        }
      }

      // Fetch doctor's care plan directives
      const doctorCpds: any = {
        diet: 'Not specified',
        exercise: 'Not specified',
        medication: 'Not specified'
      };

      if (patient && request.doctorId) {
        const carePlan = await db.select()
          .from(schema.carePlanDirectives)
          .where(eq(schema.carePlanDirectives.patientId, patient.id))
          .limit(1);

        if (carePlan.length > 0) {
          // Map the actual schema fields to expected format
          const directive = carePlan[0];
          if (directive.category === 'diet') {
            doctorCpds.diet = directive.directive;
          } else if (directive.category === 'exercise') {
            doctorCpds.exercise = directive.directive;
          } else if (directive.category === 'medication') {
            doctorCpds.medication = directive.directive;
          }
        }
      }

      // Prepare chat history (placeholder for now)
      const chatHistory: any[] = [];
      if (request.includeChatHistory) {
        // TODO: Implement chat history retrieval when chat system is built
        secureLog('Chat history requested but not yet implemented', { sessionId });
      }

      // Emergency PII scan before processing
      const piiScanUser = emergencyPiiScan(user);
      const piiScanCpds = emergencyPiiScan(doctorCpds);
      
      if (piiScanUser.hasPii || piiScanCpds.hasPii) {
        secureLog('PII detected in raw data before processing', { 
          sessionId, 
          userPii: piiScanUser.piiTypes,
          cpdPii: piiScanCpds.piiTypes 
        });
      }

      // Create secure MCP bundle using privacy middleware
      const secureBundle = createSafeMcpBundle(
        request.userId,
        userDetails,
        doctorCpds,
        chatHistory
      );

      // Validate the bundle security
      const securityValidation = validateMcpBundleSecurity(secureBundle);

      if (!securityValidation.isSecure) {
        await auditLogger.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          userId: request.userId,
          ipAddress: 'system',
          userAgent: 'AIContextService',
          details: { 
            sessionId,
            securityViolations: securityValidation.violations,
            action: 'AI_CONTEXT_PREPARATION_FAILED'
          }
        });
        
        throw new Error(`Security validation failed: ${securityValidation.violations.join(', ')}`);
      }

      // Audit successful context preparation
      await auditLogger.logDataAccess({
        action: 'read',
        userId: request.userId,
        dataType: 'PHI',
        details: { 
          sessionId,
          includeHealthMetrics: request.includeHealthMetrics,
          includeChatHistory: request.includeChatHistory,
          bundleSize: JSON.stringify(secureBundle).length,
          context: 'AI_CONTEXT_PREPARED'
        }
      });

      secureLog('Secure AI context prepared successfully', { sessionId, userId: request.userId });

      return {
        secureBundle,
        securityValidation,
        sessionId,
        timestamp: new Date()
      };

    } catch (error) {
      secureLog('Error preparing AI context', { sessionId, error: error.message });
      
      await auditLogger.logSecurityEvent({
        eventType: 'DATA_ACCESS',
        severity: 'HIGH',
        userId: request.userId,
        ipAddress: 'system',
        userAgent: 'AIContextService',
        details: { 
          sessionId,
          error: error.message,
          action: 'AI_CONTEXT_PREPARATION_ERROR'
        }
      });
      
      throw error;
    }
  }

  /**
   * Validate AI response before sending to client
   */
  static async validateAIResponse(response: string, sessionId: string): Promise<{ 
    isSecure: boolean; 
    sanitizedResponse: string; 
    violations: string[] 
  }> {
    const piiScan = emergencyPiiScan(response);
    
    if (piiScan.hasPii) {
      secureLog('PII detected in AI response, sanitizing', { 
        sessionId, 
        piiTypes: piiScan.piiTypes 
      });
      
      // Re-apply PII redaction to AI response
      const { redactPiiFromText } = await import('./privacyMiddleware');
      const sanitizedResponse = redactPiiFromText(response);
      
      return {
        isSecure: false,
        sanitizedResponse,
        violations: piiScan.piiTypes
      };
    }

    return {
      isSecure: true,
      sanitizedResponse: response,
      violations: []
    };
  }

  /**
   * Get context summary for debugging (admin only)
   */
  static async getContextSummary(userId: number): Promise<any> {
    const context = await this.prepareSecureContext({
      userId,
      includeHealthMetrics: true,
      includeChatHistory: false
    });

    return {
      sessionId: context.sessionId,
      timestamp: context.timestamp,
      securityStatus: context.securityValidation,
      bundleSize: JSON.stringify(context.secureBundle).length,
      hasHealthMetrics: Object.keys(context.secureBundle.health_metrics).length > 0,
      hasChatHistory: context.secureBundle.redacted_chat_history.length > 0
    };
  }
}

// Import crypto at the top level
import crypto from 'crypto';