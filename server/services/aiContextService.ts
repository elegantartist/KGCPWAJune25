/**
 * AI Context Service - Secure AI Data Preparation
 * Uses privacy middleware for all AI-related data processing
 */

import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { 
  createSafeMcpBundle, 
  validateMcpBundleSecurity, 
  secureLog, 
  emergencyPiiScan,
  type SafeMCPBundle, // Import the type
  type UserDetails as PrivacyUserDetails, // Rename to avoid conflict if defined locally
  type DoctorCPDs,
  type ChatMessage
} from './privacyMiddleware';
// import { auditLogger } from '../auditLogger'; // Simplified for Phase 1

interface AIContextRequest {
  userId: number;
  doctorId?: number;
  includeHealthMetrics?: boolean;
  includeChatHistory?: boolean;
  maxHistoryItems?: number;
}

// Define a more specific type for userDetails within AIContextService
interface AIInternalUserDetails {
  latest_scores: {
    medication_score?: number | null; // from schema.healthMetrics
    diet_score?: number | null;     // from schema.healthMetrics
    exercise_score?: number | null; // from schema.healthMetrics
    date?: Date | null;             // from schema.healthMetrics
  };
  // other user-specific, non-sensitive details might be added here
}

interface AIContextResponse {
  secureBundle: SafeMCPBundle; // Use the imported type
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
      const userDetails: AIInternalUserDetails = { // Use defined interface
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

      // Fetch doctor's care plan directives from the current schema
      const doctorCpds: DoctorCPDs = { // Use imported DoctorCPDs type
        diet: '',
        exercise: '',
        medication: ''
      };

      if (patient) {
        const carePlans = await db.select()
          .from(schema.carePlanDirectives)
          .where(
            and(
              eq(schema.carePlanDirectives.patientId, patient.id),
              eq(schema.carePlanDirectives.active, true)
            )
          );

        carePlans.forEach(plan => {
          if (plan.category === 'diet' || plan.category === 'nutrition' || plan.category === 'healthy_eating') {
            doctorCpds.diet = plan.directive.trim();
          } else if (plan.category === 'exercise' || plan.category === 'wellness' || plan.category === 'physical_activity') {
            doctorCpds.exercise = plan.directive.trim();
          } else if (plan.category === 'medication' || plan.category === 'medications') {
            doctorCpds.medication = plan.directive.trim();
          }
        });
      }

      // Prepare chat history
      const chatHistory: ChatMessage[] = []; // Use imported ChatMessage type
      if (request.includeChatHistory) {
        // TODO: Implement chat history retrieval when chat system is built
        // For now, let's assume it might fetch from schema.chatMemory
        const recentMessages = await db.select({
          role: schema.chatMemory.role, // Assuming chatMemory table has a 'role' column
          content: schema.chatMemory.content
        })
        .from(schema.chatMemory)
        .where(eq(schema.chatMemory.userId, request.userId))
        .orderBy(desc(schema.chatMemory.createdAt))
        .limit(request.maxHistoryItems || 10);

        // Map to ChatMessage[] - ensure roles are compatible ('user' | 'assistant' | 'system')
        // This is a placeholder mapping, actual roles from schema.chatMemory might differ
        chatHistory.push(...recentMessages.map(m => ({
            role: m.role === 'user' || m.role === 'assistant' || m.role === 'system' ? m.role : 'user', // Basic role mapping
            content: m.content || ''
        })));
        secureLog(`Chat history requested, ${chatHistory.length} messages prepared (placeholder logic)`, { sessionId });
      }

      // Emergency PII scan before processing
      // Note: emergencyPiiScan expects 'any'. If userDetails/doctorCpds are strongly typed,
      // they might need to be cast to 'any' or piiScan adapted. For now, it should work.
      const piiScanUser = emergencyPiiScan(user); // 'user' is from db, likely fine
      const piiScanCpds = emergencyPiiScan(doctorCpds); // doctorCpds is now DoctorCPDs
      
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
        console.log(`[AUDIT] Security validation failed for user ${request.userId}: ${securityValidation.violations.join(', ')}`);
        
        throw new Error(`Security validation failed: ${securityValidation.violations.join(', ')}`);
      }

      // Audit successful context preparation - simplified for Phase 1
      console.log(`[AUDIT] AI context prepared for user ${request.userId}, session ${sessionId}`);

      secureLog('Secure AI context prepared successfully', { sessionId, userId: request.userId });

      return {
        secureBundle,
        securityValidation,
        sessionId,
        timestamp: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('Error preparing AI context', { sessionId, error: errorMessage });
      
      console.log(`[AUDIT] AI context preparation failed for user ${request.userId}: ${errorMessage}`);
      
      throw new Error(errorMessage);
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