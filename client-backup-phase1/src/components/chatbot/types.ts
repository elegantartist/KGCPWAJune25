/**
 * Types for the enhanced chatbot system
 */

// Connectivity levels (simplified but maintaining basic offline support)
export enum ConnectivityLevel {
  OFFLINE = 0,       // No connectivity
  FULL = 3           // Full connectivity
}

// Memory system types
export enum MemorySystem {
  SEMANTIC = 'semantic',   // What the agent knows (facts, knowledge)
  PROCEDURAL = 'procedural', // How the agent should respond (behaviors, rules)
  EPISODIC = 'episodic'    // Past experiences and interactions
}

// Memory types within each system
export enum MemoryType {
  SHORT_TERM = 'short_term',   // Expires quickly (hours to a day)
  MEDIUM_TERM = 'medium_term', // Expires in days to weeks
  LONG_TERM = 'long_term'      // Permanent (never expires)
}

// Memory structure
export interface Memory {
  id: number;
  userId: number;
  memorySystem: MemorySystem;
  type: MemoryType;
  content: string;
  context?: any;
  importance: number;
  embeddings?: string;
  lastAccessed?: Date;
  accessCount: number;
  expiresAt?: Date;
  createdAt: Date;
}

// Enhanced AI response structure
export interface EnhancedAIResponse {
  primaryResponse: string;
  provider: string;
  alternativeResponses: string[];
  evaluationSummary: string;
  allResponsesValid: boolean;
  memories?: { 
    retrieved: Memory[],
    created: Memory[]
  };
  offline?: boolean;
}

// Feedback types
export enum FeedbackType {
  CONVERSATIONAL_STYLE = 'conversational_style',
  RECOMMENDATION_APPROACH = 'recommendation_approach',
  HEALTH_CATEGORY_FOCUS = 'health_category_focus',
  USER_PREFERENCE = 'user_preference'
}

// Feedback structure
export interface Feedback {
  userId: number;
  content: string;
  type: FeedbackType;
  rating?: number; // 1-5 scale, optional
  associatedMessage?: string; // The message this feedback is about
}