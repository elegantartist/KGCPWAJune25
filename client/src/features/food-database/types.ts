// Type definitions for the Food Database feature

// Food item type definition
export interface FoodItem {
  id: number;
  name: string;
  description: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  category: string;
  cpdRelevantTags: string[];
  nutritionData: Record<string, any> | null;
  imageUrl: string | null;
  source: string;
}

// CPD aligned foods response type
export interface CpdAlignedResponse {
  foods: FoodItem[];
  relevantTags: string[];
  alignment: 'cpd-specific' | 'general';
}

// Offline status tracking
export interface OfflineStatus {
  cached: boolean;
  checking: boolean;
  caching: boolean;
  progress: number;
  statusMessage: string;
}