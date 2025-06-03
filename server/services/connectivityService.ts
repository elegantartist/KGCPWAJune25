/**
 * Connectivity Service - Simplified for Healthcare Applications
 * 
 * Provides basic online/offline detection for healthcare applications.
 * Healthcare systems require consistent, reliable responses regardless of connection quality.
 */

import { ConnectivityLevel } from '@shared/types';

/**
 * Determines basic connectivity state
 * @param online Boolean indicating if the system is online
 * @returns ConnectivityLevel enum value
 */
export function determineConnectivityLevel(online: boolean = true): ConnectivityLevel {
  return online ? ConnectivityLevel.FULL : ConnectivityLevel.OFFLINE;
}

/**
 * Healthcare applications require consistent, full responses
 * @param data Response data
 * @param level Current connectivity level
 * @returns Full data for online, error message for offline
 */
export function adaptResponseForConnectivity<T>(data: T, level: ConnectivityLevel): T | string {
  if (level === ConnectivityLevel.FULL) {
    // Always return full data for healthcare applications
    return data;
  }
  
  // For offline mode, return appropriate error message
  return "Unable to connect to healthcare services. Please check your internet connection and try again." as any;
}

/**
 * Selects appropriate model for healthcare applications
 * Healthcare systems require consistent, high-quality responses
 * @param level Current connectivity level
 * @returns Best model configuration for healthcare use
 */
export function selectModelForConnectivity(
  level: ConnectivityLevel
): { model: string; maxTokens: number } {
  switch(level) {
    case ConnectivityLevel.OFFLINE:
      // For offline mode, return error configuration
      return { model: 'offline', maxTokens: 0 };
    
    case ConnectivityLevel.FULL:
    default:
      // Always use the best available model for healthcare responses
      return { model: 'gpt-4o', maxTokens: 1000 };
  }
}