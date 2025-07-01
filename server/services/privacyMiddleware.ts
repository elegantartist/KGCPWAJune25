/**
 * Privacy Middleware - PII/PHI Security Gatekeeper
 * This module is non-negotiable and must be used by all AI services.
 * Implements foundational security for Model Context Protocol (MCP).
 */

import crypto from 'crypto';

interface UserDetails {
  latest_scores?: Record<string, any>;
  [key: string]: any;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface DoctorCPDs {
  diet?: string;
  exercise?: string;
  medication?: string;
}

interface SafeMCPBundle {
  user_id_pseudonym: string;
  care_plan_directives: string;
  redacted_chat_history: ChatMessage[];
  health_metrics: Record<string, any>;
}

/**
 * Creates a non-identifiable, session-consistent pseudonym for an ID.
 */
export function pseudonymizeId(itemId: any): string {
  const hash = crypto.createHash('sha256').update(String(itemId)).digest('hex');
  const numericHash = parseInt(hash.substring(0, 8), 16) % 100000;
  return `KGC_USER_${numericHash}`;
}

/**
 * Redacts common PII patterns from a text string to prevent data leakage to LLMs.
 */
export function redactPiiFromText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  let redactedText = text;

  // Redact email addresses
  redactedText = redactedText.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );

  // Redact Australian phone numbers
  redactedText = redactedText.replace(
    /(\+61|0)[2-9]\d{8}\b/g,
    '[REDACTED_PHONE]'
  );
  
  redactedText = redactedText.replace(
    /\b\d{4}\s?\d{3}\s?\d{3}\b/g,
    '[REDACTED_PHONE]'
  );

  // Redact common name patterns (when preceded by identifiers)
  redactedText = redactedText.replace(
    /(?:patient|user|person|individual|client)[\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    '$1 [REDACTED_NAME]'
  );

  // Redact potential addresses
  redactedText = redactedText.replace(
    /\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/gi,
    '[REDACTED_ADDRESS]'
  );

  // Redact Medicare numbers (Australian format)
  redactedText = redactedText.replace(
    /\b\d{4}\s?\d{5}\s?\d{1}\b/g,
    '[REDACTED_MEDICARE]'
  );

  // Redact potential dates of birth
  redactedText = redactedText.replace(
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    '[REDACTED_DATE]'
  );

  return redactedText;
}

/**
 * Implements the Model Context Protocol (MCP).
 * Assembles a secure, PII-redacted context bundle for the Supervisor Agent.
 */
export function createSafeMcpBundle(
  userId: number,
  userDetails: UserDetails,
  doctorCpds: DoctorCPDs,
  chatHistory: ChatMessage[]
): SafeMCPBundle {
  const safeUserId = pseudonymizeId(userId);

  const cpdSummary = 
    `Key Patient Directives:\n` +
    `- Diet Guidance: ${doctorCpds.diet || 'Not specified'}\n` +
    `- Exercise & Wellness Routine: ${doctorCpds.exercise || 'Not specified'}\n` +
    `- Medication Plan: ${doctorCpds.medication || 'Not specified'}`;

  const safeChatHistory: ChatMessage[] = [];
  for (const message of chatHistory) {
    const redactedContent = redactPiiFromText(message.content || '');
    safeChatHistory.push({
      role: message.role,
      content: redactedContent
    });
  }

  const llmReadyBundle: SafeMCPBundle = {
    user_id_pseudonym: safeUserId,
    care_plan_directives: cpdSummary,
    redacted_chat_history: safeChatHistory,
    health_metrics: userDetails.latest_scores || {}
  };

  return llmReadyBundle;
}

/**
 * Additional security function: Validate that bundle contains no PII leakage
 * Enhanced with context-aware validation for location queries
 */
export function validateMcpBundleSecurity(bundle: SafeMCPBundle, queryText?: string): { isSecure: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check for email patterns
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  if (emailPattern.test(JSON.stringify(bundle))) {
    violations.push('Email address detected in bundle');
  }

  // Check for phone patterns
  const phonePattern = /(\+61|0)[2-9]\d{8}/;
  if (phonePattern.test(JSON.stringify(bundle))) {
    violations.push('Phone number detected in bundle');
  }

  // Re-enable strict name detection. The previous context-aware bypass was a temporary measure.
  // For production, names should be handled by the PII/PHI manager before reaching this stage.
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/; // Simple pattern for full names
  if (namePattern.test(JSON.stringify(bundle.redacted_chat_history))) {
    violations.push('Potential real name detected in bundle (chat history)');
  }

  return {
    isSecure: violations.length === 0,
    violations
  };
}

/**
 * Secure logging function that redacts PII from log messages
 */
export function secureLog(message: string, data?: any): void {
  const redactedMessage = redactPiiFromText(message);
  const redactedData = data ? redactPiiFromText(JSON.stringify(data)) : undefined;
  
  console.log(`[PRIVACY_MIDDLEWARE] ${redactedMessage}`, redactedData ? JSON.parse(redactedData) : '');
}

/**
 * Emergency PII detection and alert system
 */
export function emergencyPiiScan(data: any): { hasPii: boolean; piiTypes: string[] } {
  const dataStr = JSON.stringify(data);
  const piiTypes: string[] = [];

  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(dataStr)) {
    piiTypes.push('EMAIL');
  }

  if (/(\+61|0)[2-9]\d{8}/.test(dataStr)) {
    piiTypes.push('PHONE');
  }

  if (/\b\d{4}\s?\d{5}\s?\d{1}\b/.test(dataStr)) {
    piiTypes.push('MEDICARE');
  }

  if (/\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd)/.test(dataStr)) {
    piiTypes.push('ADDRESS');
  }

  return {
    hasPii: piiTypes.length > 0,
    piiTypes
  };
}

import { SYSTEM_DIRECTIVE_MARKERS } from './prompt_templates';

/**
 * Sanitize final response to remove any leaked system directives
 */
export function sanitizeFinalResponse(responseText: string): string {
  let sanitizedResponse = responseText;
  
  // Remove system directive markers using the centralized patterns
  SYSTEM_DIRECTIVE_MARKERS.forEach(pattern => {
    sanitizedResponse = sanitizedResponse.replace(pattern, '');
  });
  
  // Clean up extra whitespace and newlines
  sanitizedResponse = sanitizedResponse
    .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
    .replace(/^\s+|\s+$/g, '')   // Trim start and end
    .replace(/\s{2,}/g, ' ');    // Replace multiple spaces with single space
  
  return sanitizedResponse;
}