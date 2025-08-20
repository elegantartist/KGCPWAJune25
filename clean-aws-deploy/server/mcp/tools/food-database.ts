/**
 * Food Database MCP Tool
 * 
 * Provides Australian food database integration with nutritional information
 * and FoodSwitch data aligned with Care Plan Directives.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for Food Database tool
const foodDatabaseInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['search_food', 'get_nutrition', 'analyze_meal', 'compare_foods', 'scan_barcode']),
  foodName: z.string().optional(),
  barcode: z.string().optional(),
  mealDescription: z.string().optional(),
  comparisonFoods: z.array(z.string()).optional()
});

/**
 * Food Database Tool Implementation
 */
export const foodDatabaseTool: MCPTool = {
  name: 'food-database',
  description: 'Australian food database with nutritional information and FoodSwitch integration for CPD-aligned food choices',
  inputSchema: foodDatabaseInputSchema,
  handler: async (params: z.infer<typeof foodDatabaseInputSchema>, context: MCPContext) => {
    const { userId, action, foodName, barcode, mealDescription, comparisonFoods } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s food data');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      dataType: 'food_database',
      action: 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'search_food':
          return await searchFood(userId, context, foodName);
        
        case 'get_nutrition':
          return await getNutritionInfo(userId, context, foodName);
        
        case 'analyze_meal':
          return await analyzeMeal(userId, context, mealDescription);
        
        case 'compare_foods':
          return await compareFoods(userId, context, comparisonFoods);
        
        case 'scan_barcode':
          return await scanBarcode(userId, context, barcode);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Food Database Tool] Error:', error);
      throw new Error(`Failed to process food database request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Search for foods in Australian database
 */
async function searchFood(userId: number, context: MCPContext, foodName?: string) {
  if (!foodName) {
    return {
      message: "Please specify a food name to search for nutritional information.",
      suggestion: "Try searching for common Australian foods like 'kangaroo', 'barramundi', or 'Vegemite'",
      kgcFeatureSuggestions: [{
        feature: "Inspiration Machine D",
        reason: "Get meal ideas with built-in nutritional information",
        urgency: "low"
      }]
    };
  }

  // Get diet CPDs for context
  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  return {
    searchResults: generateFoodSearchResults(foodName, dietCPDs),
    nutritionalHighlights: generateNutritionalHighlights(foodName, dietCPDs),
    cpdAlignment: analyzeCPDAlignment(foodName, dietCPDs),
    australianContext: getAustralianFoodContext(foodName),
    scoringGuidance: generateFoodScoringGuidance(foodName, dietCPDs),
    kgcFeatureSuggestions: [{
      feature: "Inspiration Machine D",
      reason: "Find recipes using this ingredient",
      urgency: "low"
    }]
  };
}

/**
 * Get detailed nutrition information
 */
async function getNutritionInfo(userId: number, context: MCPContext, foodName?: string) {
  if (!foodName) {
    return {
      message: "Please specify a food for detailed nutritional analysis.",
      suggestion: "Enter any food name to get comprehensive Australian nutrition data"
    };
  }

  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  return {
    nutritionFacts: generateNutritionFacts(foodName),
    foodStandardsAustralia: getFSANZInformation(foodName),
    healthStarRating: getHealthStarRating(foodName),
    dietaryAlerts: generateDietaryAlerts(foodName, dietCPDs),
    servingSuggestions: generateServingSuggestions(foodName, dietCPDs),
    alternatives: suggestHealthierAlternatives(foodName, dietCPDs)
  };
}

/**
 * Analyze a complete meal
 */
async function analyzeMeal(userId: number, context: MCPContext, mealDescription?: string) {
  if (!mealDescription) {
    return {
      message: "Please describe your meal for nutritional analysis.",
      suggestion: "Example: 'Grilled salmon with quinoa and steamed broccoli'"
    };
  }

  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  return {
    mealAnalysis: {
      description: mealDescription,
      estimatedNutrition: generateMealNutrition(mealDescription),
      cpdCompliance: analyzeMealCPDCompliance(mealDescription, dietCPDs),
      balanceAssessment: assessMealBalance(mealDescription),
      improvementSuggestions: generateMealImprovements(mealDescription, dietCPDs)
    },
    scoringGuidance: generateMealScoringGuidance(mealDescription, dietCPDs),
    cbtInsights: [
      "Notice how balanced meals provide sustained energy and satisfaction",
      "Recognize the connection between thoughtful food choices and wellbeing"
    ],
    motivationalPrompts: [
      "Each nutritious meal is an investment in your health and energy",
      "You're building sustainable habits that support your long-term goals"
    ]
  };
}

/**
 * Compare multiple foods
 */
async function compareFoods(userId: number, context: MCPContext, comparisonFoods?: string[]) {
  if (!comparisonFoods || comparisonFoods.length < 2) {
    return {
      message: "Please provide at least 2 foods to compare.",
      suggestion: "Example: Compare 'white bread' and 'wholemeal bread'"
    };
  }

  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  return {
    comparison: {
      foods: comparisonFoods,
      nutritionalComparison: generateNutritionalComparison(comparisonFoods),
      cpdRecommendation: getBestCPDChoice(comparisonFoods, dietCPDs),
      australianGuidelines: getAustralianGuidelineComparison(comparisonFoods),
      costComparison: estimateCostComparison(comparisonFoods)
    },
    decisionSupport: {
      bestChoice: determineBestChoice(comparisonFoods, dietCPDs),
      reasoning: explainChoice(comparisonFoods, dietCPDs),
      practicalTips: generateComparisonTips(comparisonFoods)
    }
  };
}

/**
 * Scan barcode for product information
 */
async function scanBarcode(userId: number, context: MCPContext, barcode?: string) {
  if (!barcode) {
    return {
      message: "Please provide a barcode number for product lookup.",
      suggestion: "Use the FoodSwitch app to scan barcodes for detailed product information"
    };
  }

  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  return {
    productInfo: {
      barcode: barcode,
      productName: "Sample Australian Product",
      brand: "Australian Brand",
      nutritionFacts: generateBarcodeNutrition(),
      ingredients: ["Ingredient 1", "Ingredient 2", "Ingredient 3"],
      healthStarRating: 4.0,
      foodSwitchRating: "Good Choice"
    },
    cpdAnalysis: analyzeBarcodeProductForCPDs(barcode, dietCPDs),
    healthAlerts: generateProductHealthAlerts(barcode, dietCPDs),
    alternatives: suggestBetterProducts(barcode, dietCPDs),
    kgcFeatureSuggestions: [{
      feature: "FoodSwitch App Integration",
      reason: "Scan more products for comprehensive nutrition information",
      urgency: "low"
    }]
  };
}

/**
 * Helper Functions
 */

function generateFoodSearchResults(foodName: string, dietCPDs: any[]) {
  // This would integrate with Australian food databases like NUTTAB
  return [
    {
      name: foodName,
      category: determineFoodCategory(foodName),
      servingSize: "100g",
      availability: "Common in Australian supermarkets",
      seasonality: getFoodSeasonality(foodName),
      localProducers: getLocalProducers(foodName)
    }
  ];
}

function generateNutritionalHighlights(foodName: string, dietCPDs: any[]) {
  const highlights = [];
  
  // Example nutritional highlights based on food name
  if (foodName.toLowerCase().includes('salmon')) {
    highlights.push("Excellent source of omega-3 fatty acids");
    highlights.push("High-quality protein for muscle health");
    highlights.push("Rich in vitamin D");
  } else if (foodName.toLowerCase().includes('spinach')) {
    highlights.push("High in iron and folate");
    highlights.push("Rich in antioxidants");
    highlights.push("Low calorie, nutrient dense");
  }
  
  return highlights;
}

function analyzeCPDAlignment(foodName: string, dietCPDs: any[]) {
  const alignments = [];
  
  for (const cpd of dietCPDs) {
    const directive = cpd.directive.toLowerCase();
    
    if (directive.includes('low sodium') && isLowSodiumFood(foodName)) {
      alignments.push({
        cpd: cpd.directive,
        alignment: "Excellent choice",
        reason: "Naturally low in sodium"
      });
    }
    
    if (directive.includes('diabetes') && isLowGIFood(foodName)) {
      alignments.push({
        cpd: cpd.directive,
        alignment: "Good choice",
        reason: "Low glycemic index food"
      });
    }
  }
  
  return alignments;
}

function getAustralianFoodContext(foodName: string) {
  // Provide Australian-specific context
  return {
    origin: "Local Australian produce when in season",
    availability: "Widely available in Coles and Woolworths",
    culturalNote: getAustralianCulturalNote(foodName),
    sustainabilityNote: getSustainabilityNote(foodName)
  };
}

function generateFoodScoringGuidance(foodName: string, dietCPDs: any[]) {
  let guidance = "Rate your daily diet 8-10 when meals include nutritious choices like this. ";
  
  if (dietCPDs.length > 0) {
    guidance += "Consider how this food supports your specific care plan directives.";
  }
  
  return guidance;
}

function generateNutritionFacts(foodName: string) {
  // This would pull from Australian nutrition databases
  return {
    per100g: {
      energy: "150 kJ",
      protein: "3.2g",
      totalFat: "0.8g",
      saturatedFat: "0.2g",
      carbohydrate: "4.1g",
      sugars: "2.1g",
      dietaryFibre: "2.8g",
      sodium: "25mg"
    },
    vitaminsAndMinerals: [
      "Vitamin C: 15% DV",
      "Iron: 8% DV",
      "Calcium: 6% DV"
    ]
  };
}

function getFSANZInformation(foodName: string) {
  return {
    regulatoryStatus: "Approved by Food Standards Australia New Zealand",
    healthClaims: [],
    allergenInformation: "Check product label for specific allergen information",
    additives: "No artificial additives"
  };
}

function getHealthStarRating(foodName: string) {
  // Australian Health Star Rating system
  return {
    rating: 4.5,
    maxRating: 5.0,
    explanation: "Based on nutritional profile and serving size"
  };
}

function generateDietaryAlerts(foodName: string, dietCPDs: any[]) {
  const alerts = [];
  
  for (const cpd of dietCPDs) {
    const directive = cpd.directive.toLowerCase();
    
    if (directive.includes('sodium') && isHighSodiumFood(foodName)) {
      alerts.push({
        type: "warning",
        message: `High sodium content may not align with your ${cpd.directive}`,
        suggestion: "Consider lower sodium alternatives"
      });
    }
  }
  
  return alerts;
}

function generateServingSuggestions(foodName: string, dietCPDs: any[]) {
  return [
    "Recommended serving: 1/2 cup or 80g",
    "Best consumed: As part of a balanced meal",
    "Preparation tip: Steam lightly to retain nutrients"
  ];
}

function suggestHealthierAlternatives(foodName: string, dietCPDs: any[]) {
  // This would suggest alternatives based on CPDs
  return [
    {
      alternative: "Wholegrain version",
      reason: "Higher fiber content",
      cpdBenefit: "Better for blood sugar management"
    }
  ];
}

// Additional helper functions for meal analysis, comparison, etc.

function generateMealNutrition(mealDescription: string) {
  return {
    estimatedCalories: "450-550",
    macronutrients: {
      protein: "25-30g",
      carbohydrates: "40-50g", 
      fat: "15-20g"
    },
    micronutrients: ["High in vitamin B12", "Good source of omega-3", "Rich in fiber"]
  };
}

function analyzeMealCPDCompliance(mealDescription: string, dietCPDs: any[]) {
  const compliance = [];
  
  for (const cpd of dietCPDs) {
    compliance.push({
      directive: cpd.directive,
      compliance: "Good",
      reasoning: "Meal components align well with directive goals"
    });
  }
  
  return compliance;
}

function assessMealBalance(mealDescription: string) {
  return {
    proteinAdequacy: "Excellent",
    vegetableContent: "Good",
    wholeGrains: "Present",
    healthyFats: "Adequate",
    overallBalance: "Well-balanced meal"
  };
}

function generateMealImprovements(mealDescription: string, dietCPDs: any[]) {
  return [
    "Consider adding a serve of colorful vegetables",
    "Include a source of healthy fats like avocado or nuts",
    "Ensure adequate protein for satiety"
  ];
}

function generateMealScoringGuidance(mealDescription: string, dietCPDs: any[]) {
  return "Rate this meal 8-10 if it includes balanced portions of protein, vegetables, and whole grains while aligning with your care plan directives.";
}

// Utility functions for food categorization and analysis

function determineFoodCategory(foodName: string): string {
  const name = foodName.toLowerCase();
  
  if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) {
    return "Protein foods";
  } else if (name.includes('vegetable') || name.includes('broccoli') || name.includes('spinach')) {
    return "Vegetables";
  } else if (name.includes('fruit') || name.includes('apple') || name.includes('banana')) {
    return "Fruits";
  } else if (name.includes('bread') || name.includes('rice') || name.includes('pasta')) {
    return "Grain foods";
  } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
    return "Dairy";
  }
  
  return "Other foods";
}

function getFoodSeasonality(foodName: string): string {
  // Australian seasonal information
  const name = foodName.toLowerCase();
  
  if (name.includes('mango')) return "Summer (December-February)";
  if (name.includes('apple')) return "Autumn (March-May)";
  if (name.includes('citrus')) return "Winter (June-August)";
  if (name.includes('stone fruit')) return "Summer (December-February)";
  
  return "Available year-round";
}

function getLocalProducers(foodName: string): string {
  return "Check local farmers markets and Australian producers";
}

function isLowSodiumFood(foodName: string): boolean {
  const lowSodiumFoods = ['fruits', 'vegetables', 'fresh meat', 'grains'];
  return lowSodiumFoods.some(food => foodName.toLowerCase().includes(food));
}

function isLowGIFood(foodName: string): boolean {
  const lowGIFoods = ['vegetables', 'legumes', 'whole grains', 'nuts'];
  return lowGIFoods.some(food => foodName.toLowerCase().includes(food));
}

function isHighSodiumFood(foodName: string): boolean {
  const highSodiumFoods = ['processed', 'canned', 'deli', 'sauce', 'chips'];
  return highSodiumFoods.some(food => foodName.toLowerCase().includes(food));
}

function getAustralianCulturalNote(foodName: string): string {
  const name = foodName.toLowerCase();
  
  if (name.includes('vegemite')) return "Iconic Australian spread, part of national food culture";
  if (name.includes('kangaroo')) return "Native Australian protein, lean and sustainable";
  if (name.includes('barramundi')) return "Popular Australian fish, commonly found in northern waters";
  
  return "Part of contemporary Australian cuisine";
}

function getSustainabilityNote(foodName: string): string {
  return "Choose local, seasonal options when available to support sustainability";
}

function generateNutritionalComparison(foods: string[]) {
  return foods.map(food => ({
    food,
    calories: "150 per 100g",
    protein: "3g",
    fiber: "2g",
    sodium: "25mg"
  }));
}

function getBestCPDChoice(foods: string[], dietCPDs: any[]) {
  return {
    recommendedChoice: foods[0], // Simplified logic
    reason: "Best aligns with your care plan directives",
    cpdSupport: "Supports your dietary goals"
  };
}

function getAustralianGuidelineComparison(foods: string[]) {
  return "All options can fit within Australian Dietary Guidelines when consumed in appropriate portions";
}

function estimateCostComparison(foods: string[]) {
  return foods.map(food => ({
    food,
    estimatedCost: "$3-5 per 100g",
    valueRating: "Good value for nutrition"
  }));
}

function determineBestChoice(foods: string[], dietCPDs: any[]): string {
  return foods[0]; // Simplified - would use more complex logic
}

function explainChoice(foods: string[], dietCPDs: any[]): string {
  return "This choice best supports your care plan directives while providing excellent nutrition";
}

function generateComparisonTips(foods: string[]): string[] {
  return [
    "Consider preparation methods when comparing foods",
    "Look at serving sizes for accurate comparisons", 
    "Factor in your personal taste preferences and dietary needs"
  ];
}

function generateBarcodeNutrition() {
  return {
    per100g: {
      energy: "1200 kJ",
      protein: "8.5g",
      totalFat: "3.2g",
      carbohydrate: "45g",
      sodium: "280mg"
    }
  };
}

function analyzeBarcodeProductForCPDs(barcode: string, dietCPDs: any[]) {
  return {
    overallRating: "Suitable with modifications",
    specificNotes: "Consider portion size in relation to your dietary goals"
  };
}

function generateProductHealthAlerts(barcode: string, dietCPDs: any[]) {
  return [
    {
      type: "info",
      message: "Moderate sodium content - be mindful of total daily intake"
    }
  ];
}

function suggestBetterProducts(barcode: string, dietCPDs: any[]) {
  return [
    {
      productName: "Lower sodium alternative",
      reason: "Better aligns with heart-healthy goals",
      availability: "Available at major supermarkets"
    }
  ];
}