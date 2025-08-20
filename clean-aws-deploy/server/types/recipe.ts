// Recipe search and filtering interfaces
export interface RecipeSearchFilters {
  ingredients?: string[];
  cuisineType?: string;
  mealType?: string;
  dietaryPreferences?: string[];
  maxCookingTime?: number;
  userId?: number;
}

// Recipe search result interface
export interface RecipeSearchResult {
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
  source_name?: string;
  cooking_time?: string;
  ingredients?: string[];
  cuisine_type?: string;
  meal_type?: string;
  videoId?: string | null;
}

// Recipe analysis interface
export interface RecipeAnalysis {
  nutritionalValue: string;
  healthBenefits: string[];
  caloriesEstimate: string;
  difficultyLevel: string;
  alternatives: {
    ingredient: string;
    alternatives: string[];
  }[];
  tips: string[];
}

// Enhanced recipe with analysis and health score
export interface EnhancedRecipe extends RecipeSearchResult {
  analysis?: RecipeAnalysis;
  healthScore?: number;
}

// Recipe analysis preferences
export interface RecipeAnalysisPreferences {
  healthFocus?: boolean;
  allergies?: string[];
  avoidIngredients?: string[];
}

// Saved recipe in the database
export interface SavedRecipe extends EnhancedRecipe {
  id: number;
  userId: number;
  created_at: string;
}