/**
 * Shared types for KGC application
 */

// Connectivity levels (simplified but maintaining basic offline support)
export enum ConnectivityLevel {
  OFFLINE = 0,       // No connectivity
  FULL = 3           // Full connectivity 
}

// Health score categories
export enum HealthCategory {
  PHYSICAL = 'physical',
  MENTAL = 'mental',
  EMOTIONAL = 'emotional',
  SOCIAL = 'social',
  NUTRITIONAL = 'nutritional',
  SLEEP = 'sleep'
}

// AI provider types
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GROK = 'grok',
  LOCAL = 'local' // Used for offline mode
}

// CPD types
export enum CPDCategory {
  DIET = 'diet',
  EXERCISE = 'exercise',
  MEDICATION = 'medication'
}