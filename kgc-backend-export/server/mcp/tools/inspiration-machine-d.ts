/**
 * Inspiration Machine D MCP Tool
 * 
 * Provides personalized meal planning and recipe suggestions aligned with 
 * patient Care Plan Directives using CBT and MI techniques.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for Inspiration Machine D tool
const inspirationMachineDInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['get_ideas', 'search_recipes', 'analyze_adherence', 'motivational_prompt']),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  preferences: z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
    cuisinePreferences: z.array(z.string()).optional(),
    cookingTime: z.string().optional(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional()
  }).optional(),
  currentScore: z.number().min(1).max(10).optional(),
  challengeArea: z.string().optional(),
  motivationLevel: z.enum(['high', 'medium', 'low']).optional()
});

/**
 * Inspiration Machine D Tool Implementation
 */
export const inspirationMachineDTool: MCPTool = {
  name: 'inspiration-machine-d',
  description: 'Personalized meal planning and recipe suggestions aligned with Care Plan Directives using CBT and MI techniques',
  inputSchema: inspirationMachineDInputSchema,
  handler: async (params: z.infer<typeof inspirationMachineDInputSchema>, context: MCPContext) => {
    const { userId, action, mealType, preferences, currentScore, challengeArea, motivationLevel } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s meal planning data');
    }

    // Log the access for audit purposes
    await auditLogger.logSecurityEvent({
      eventType: 'DATA_ACCESS',
      severity: 'LOW',
      userId: context.userId,
      targetUserId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: { action, mealType, currentScore, dataType: 'meal_planning' }
    });

    try {
      switch (action) {
        case 'get_ideas':
          return await generateMealIdeas(userId, context, mealType, preferences, currentScore);
        
        case 'search_recipes':
          return await searchRecipes(userId, context, preferences, challengeArea);
        
        case 'analyze_adherence':
          return await analyzeAdherence(userId, context, currentScore);
        
        case 'motivational_prompt':
          return await generateMotivationalPrompt(userId, context, motivationLevel, currentScore);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Inspiration Machine D Tool] Error:', error);
      throw new Error(`Failed to process meal planning request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Generate personalized meal ideas aligned with CPDs
 */
async function generateMealIdeas(userId: number, context: MCPContext, mealType?: string, preferences?: any, currentScore?: number) {
  // Get patient's diet CPDs
  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  if (dietCPDs.length === 0) {
    return {
      message: "No diet care plan directives found. Please check with your doctor for personalized nutrition guidance.",
      suggestion: "Contact your healthcare provider to establish dietary goals and directives.",
      kgcFeatureSuggestions: [{
        feature: "Care Plan Directives",
        reason: "Get personalized diet directives from your doctor",
        urgency: "medium"
      }]
    };
  }

  // Get recent health metrics for context
  const recentMetrics = await storage.getHealthMetricsForUser(userId);
  const avgDietScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + m.dietScore, 0) / recentMetrics.length : 
    currentScore || 5;

  // Generate meal ideas based on CPDs and dietary restrictions
  const mealIdeas = await generateCPDAlignedMeals(dietCPDs, mealType, preferences, avgDietScore);
  
  // Generate CBT insights
  const cbtInsights = generateCBTInsights(avgDietScore, preferences?.challengeArea);
  
  // Generate motivational prompts
  const motivationalPrompts = generateMotivationalPrompts(dietCPDs, avgDietScore);
  
  // Provide adherence support
  const adherenceSupport = generateAdherenceSupport(dietCPDs, avgDietScore);

  return {
    mealIdeas,
    cbtInsights,
    motivationalPrompts,
    adherenceSupport,
    targetScore: "8-10",
    currentProgress: {
      averageScore: Number(avgDietScore.toFixed(1)),
      trend: calculateDietTrend(recentMetrics),
      daysTracked: recentMetrics.length
    },
    kgcFeatureSuggestions: suggestRelatedFeatures(avgDietScore, dietCPDs)
  };
}

/**
 * Search for specific recipes based on CPDs and preferences
 */
async function searchRecipes(userId: number, context: MCPContext, preferences?: any, challengeArea?: string) {
  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  // Generate recipes based on CPDs and preferences
  const recipes = await generateCPDAlignedRecipes(dietCPDs, preferences, challengeArea);
  
  // Provide behavior change support
  const behaviorChangeSupport = generateBehaviorChangeSupport(challengeArea);

  return {
    recipes,
    behaviorChangeSupport,
    cookingTips: generateCookingTips(dietCPDs, preferences),
    scoringGuidance: generateScoringGuidance(dietCPDs),
    kgcFeatureSuggestions: [{
      feature: "Food Database",
      reason: "Look up nutritional information for ingredients",
      urgency: "low"
    }]
  };
}

/**
 * Analyze current diet adherence to CPDs
 */
async function analyzeAdherence(userId: number, context: MCPContext, currentScore?: number) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId);
  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  if (recentMetrics.length === 0) {
    return {
      message: "No recent diet scores found for analysis.",
      suggestion: "Start tracking your daily diet scores to get personalized adherence insights.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Begin tracking diet adherence for personalized analysis",
        urgency: "high"
      }]
    };
  }

  const avgScore = recentMetrics.reduce((sum, m) => sum + m.dietScore, 0) / recentMetrics.length;
  const scoreToAnalyze = currentScore || avgScore;

  const adherenceAnalysis = {
    currentScore: Number(scoreToAnalyze.toFixed(1)),
    scoreJustification: generateScoreJustification(scoreToAnalyze, dietCPDs),
    cpdCompliance: analyzeCPDCompliance(scoreToAnalyze, dietCPDs, recentMetrics),
    honestScoringEncouragement: generateHonestScoringMessage(scoreToAnalyze)
  };

  const cbtInterventions = generateCBTInterventions(scoreToAnalyze, recentMetrics);
  const motivationalInterviewing = generateMITechniques(scoreToAnalyze, dietCPDs);

  return {
    adherenceAnalysis,
    cbtInterventions,
    motivationalInterviewing,
    progressInsights: generateProgressInsights(recentMetrics),
    nextSteps: generateNextSteps(scoreToAnalyze, dietCPDs)
  };
}

/**
 * Generate motivational prompts for diet goals
 */
async function generateMotivationalPrompt(userId: number, context: MCPContext, motivationLevel?: string, currentScore?: number) {
  const dietCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('diet') || 
    cpd.category.toLowerCase().includes('nutrition')
  );

  const recentMetrics = await storage.getHealthMetricsForUser(userId);
  const avgScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + m.dietScore, 0) / recentMetrics.length : 
    currentScore || 5;

  return {
    motivationalMessage: generatePersonalizedMotivation(avgScore, motivationLevel, dietCPDs),
    cbtAffirmations: generateCBTAffirmations(avgScore),
    miExploration: generateMIExplorationQuestions(motivationLevel),
    goalSetting: generateSmartGoals(avgScore, dietCPDs),
    celebrationPoints: generateCelebrationPoints(recentMetrics, avgScore)
  };
}

/**
 * Helper Functions
 */

async function generateCPDAlignedMeals(dietCPDs: any[], mealType?: string, preferences?: any, avgScore?: number) {
  const meals = [];
  
  // Generate meals based on specific CPD requirements
  for (const cpd of dietCPDs) {
    const directive = cpd.directive.toLowerCase();
    
    if (directive.includes('low sodium') || directive.includes('blood pressure')) {
      meals.push({
        title: "Mediterranean Herb-Crusted Chicken",
        description: "Heart-healthy meal with herbs instead of salt for flavor",
        cpdAlignment: `Supports your doctor's directive: "${cpd.directive}"`,
        ingredients: ["chicken breast", "rosemary", "thyme", "olive oil", "lemon", "quinoa", "steamed vegetables"],
        nutritionHighlights: ["Low sodium (<300mg)", "High protein", "Heart-healthy"],
        preparationTime: "30 minutes",
        difficultyLevel: "Easy",
        scoringGuidance: "Rate 8-10 if this replaces a high-sodium meal option"
      });
    }
    
    if (directive.includes('diabetes') || directive.includes('blood sugar') || directive.includes('carb')) {
      meals.push({
        title: "Cauliflower Rice Stir-Fry Bowl",
        description: "Low-carb alternative that helps maintain stable blood sugar",
        cpdAlignment: `Perfect for your "${cpd.directive}" goals`,
        ingredients: ["cauliflower rice", "lean protein", "non-starchy vegetables", "healthy fats"],
        nutritionHighlights: ["Low carbohydrate", "High fiber", "Blood sugar friendly"],
        preparationTime: "20 minutes",
        difficultyLevel: "Easy",
        scoringGuidance: "Rate 8-10 if this keeps you within your carb targets"
      });
    }
    
    if (directive.includes('weight') || directive.includes('calorie')) {
      meals.push({
        title: "Protein-Packed Veggie Omelet",
        description: "High protein, low calorie meal that keeps you satisfied",
        cpdAlignment: `Aligns with your "${cpd.directive}" directive`,
        ingredients: ["eggs", "spinach", "mushrooms", "bell peppers", "small amount cheese"],
        nutritionHighlights: ["High protein", "Low calorie", "Nutrient dense"],
        preparationTime: "15 minutes",
        difficultyLevel: "Beginner",
        scoringGuidance: "Rate 8-10 if this supports your daily calorie goals"
      });
    }
  }
  
  // Add general healthy options if no specific CPDs
  if (meals.length === 0) {
    meals.push({
      title: "Balanced Australian Bowl",
      description: "Well-rounded meal following Australian Dietary Guidelines",
      cpdAlignment: "Supports general healthy eating principles",
      ingredients: ["lean protein", "whole grains", "colorful vegetables", "healthy fats"],
      nutritionHighlights: ["Balanced macronutrients", "High fiber", "Nutrient dense"],
      preparationTime: "25 minutes",
      difficultyLevel: "Easy",
      scoringGuidance: "Rate 8-10 if this represents a balanced, nutritious choice"
    });
  }
  
  return meals.slice(0, 3); // Return top 3 suggestions
}

function generateCBTInsights(avgScore: number, challengeArea?: string) {
  const insights = [];
  
  if (avgScore < 6) {
    insights.push("Notice that small improvements add up - even moving from 5 to 6 represents real progress");
    insights.push("Challenge the thought: 'I'm failing at healthy eating' - you're learning and growing");
  } else if (avgScore >= 8) {
    insights.push("Recognize your success - you're consistently making healthy choices aligned with your goals");
    insights.push("Notice how good nutrition positively impacts your energy and overall wellbeing");
  } else {
    insights.push("You're making good progress - consider what specific changes could move you closer to 8+");
    insights.push("Challenge perfectionist thinking - consistent 7s are better than occasional 10s followed by 3s");
  }
  
  if (challengeArea) {
    if (challengeArea.includes('time')) {
      insights.push("Reframe: 'I don't have time to cook' → 'I can find 15 minutes for my health'");
    } else if (challengeArea.includes('motivation')) {
      insights.push("Connect your eating choices to your deeper values and long-term health goals");
    }
  }
  
  return insights;
}

function generateMotivationalPrompts(dietCPDs: any[], avgScore: number) {
  const prompts = [];
  
  prompts.push(`Each healthy meal choice moves you closer to your 8+ diet score goal`);
  prompts.push(`Your doctor believes in your ability to make these positive changes`);
  
  if (avgScore >= 7) {
    prompts.push(`You're already showing strong commitment to your health goals - keep building on this success`);
  } else {
    prompts.push(`Every small step counts - you have the power to improve your nutrition one meal at a time`);
  }
  
  if (dietCPDs.length > 0) {
    prompts.push(`Following your care plan directives is an investment in your long-term health and quality of life`);
  }
  
  return prompts;
}

function generateAdherenceSupport(dietCPDs: any[], avgScore: number) {
  const primaryCPD = dietCPDs[0];
  
  return {
    currentCPDFocus: primaryCPD ? primaryCPD.directive : "General healthy eating principles",
    practicalTips: generatePracticalTips(dietCPDs),
    progressTracking: "Rate today's meals 1-10 based on how well they align with your care plan directives",
    scoringGuidance: generateDetailedScoringGuidance(avgScore, dietCPDs)
  };
}

function generatePracticalTips(dietCPDs: any[]) {
  const tips = [];
  
  for (const cpd of dietCPDs) {
    const directive = cpd.directive.toLowerCase();
    
    if (directive.includes('sodium')) {
      tips.push("Read nutrition labels - aim for <140mg sodium per serving");
      tips.push("Use herbs, spices, and citrus instead of salt for flavor");
    }
    
    if (directive.includes('diabetes') || directive.includes('carb')) {
      tips.push("Fill half your plate with non-starchy vegetables");
      tips.push("Choose whole grains over refined carbohydrates");
    }
    
    if (directive.includes('weight')) {
      tips.push("Practice mindful eating - eat slowly and pay attention to hunger cues");
      tips.push("Use smaller plates to help with portion control");
    }
  }
  
  if (tips.length === 0) {
    tips.push("Plan meals ahead to make healthier choices easier");
    tips.push("Keep healthy snacks readily available");
  }
  
  return tips;
}

function generateCPDAlignedRecipes(dietCPDs: any[], preferences?: any, challengeArea?: string) {
  // This would integrate with external recipe APIs or internal database
  // For now, return sample recipes aligned with common CPDs
  
  const recipes = [];
  
  recipes.push({
    title: "Quick Diabetic-Friendly Stir Fry",
    cpdAlignment: "Perfect for blood sugar management",
    ingredients: ["lean protein", "non-starchy vegetables", "minimal oil", "herbs and spices"],
    instructions: [
      "Heat small amount of oil in large pan",
      "Add protein and cook until done",
      "Add vegetables and stir-fry until crisp-tender",
      "Season with herbs and serve"
    ],
    nutritionFacts: {
      carbohydrates: "15g",
      protein: "25g",
      fiber: "6g",
      estimatedBloodSugarImpact: "Low"
    },
    scoringGuidance: "Rate 8-10 if this replaces a high-carb meal option"
  });
  
  return recipes;
}

function generateBehaviorChangeSupport(challengeArea?: string) {
  return {
    miTechnique: "On a scale of 1-10, how confident are you about preparing healthy meals this week?",
    barrierAddressing: generateBarrierSolutions(challengeArea),
    motivationBuilding: "Each home-cooked meal demonstrates your commitment to your health goals"
  };
}

function generateBarrierSolutions(challengeArea?: string) {
  if (challengeArea?.includes('time')) {
    return "If cooking time is a concern, try batch cooking on weekends or using slow cooker meals";
  } else if (challengeArea?.includes('skill')) {
    return "Start with simple recipes using 5 ingredients or less - complexity can be added later";
  } else if (challengeArea?.includes('cost')) {
    return "Focus on affordable, nutritious staples like eggs, beans, seasonal vegetables, and whole grains";
  }
  
  return "Identify your specific barriers and we can work together to find practical solutions";
}

// Additional helper functions for CBT, MI, and scoring guidance...

function generateCBTInterventions(score: number, recentMetrics: any[]) {
  const interventions = [];
  
  if (score < 6) {
    interventions.push("Challenge: 'I'm terrible at healthy eating'");
    interventions.push("Reframe: 'I'm learning and improving my nutrition habits step by step'");
  }
  
  if (recentMetrics.some(m => m.dietScore < 4)) {
    interventions.push("Challenge: 'One bad day ruined everything'");
    interventions.push("Reframe: 'One challenging day is part of the learning process - I can get back on track'");
  }
  
  return interventions;
}

function generateMITechniques(score: number, dietCPDs: any[]) {
  return {
    explorationQuestions: [
      "What aspects of healthy eating feel most important to you right now?",
      "How do you feel when you successfully follow your nutrition goals?",
      "What would need to change for you to feel more confident about your diet choices?"
    ],
    changeCommitment: score < 7 ? 
      "What one small change could help you move from your current score to a 7 or 8?" :
      "How can you maintain this positive momentum with your nutrition goals?"
  };
}

function calculateDietTrend(metrics: any[]) {
  if (metrics.length < 2) return 'stable';
  
  const recent = metrics.slice(-3);
  const earlier = metrics.slice(0, 3);
  
  const recentAvg = recent.reduce((sum, m) => sum + m.dietScore, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, m) => sum + m.dietScore, 0) / earlier.length;
  
  if (recentAvg > earlierAvg + 0.5) return 'improving';
  if (recentAvg < earlierAvg - 0.5) return 'declining';
  return 'stable';
}

function suggestRelatedFeatures(avgScore: number, dietCPDs: any[]) {
  const suggestions = [];
  
  if (avgScore < 6) {
    suggestions.push({
      feature: "Journaling",
      reason: "Explore emotional connections to food choices and identify patterns",
      urgency: "medium"
    });
  }
  
  suggestions.push({
    feature: "Food Database",
    reason: "Look up nutritional information to make informed choices",
    urgency: "low"
  });
  
  if (dietCPDs.some(cpd => cpd.directive.includes('weight'))) {
    suggestions.push({
      feature: "E&W Support",
      reason: "Combine nutrition improvements with exercise for better results",
      urgency: "medium"
    });
  }
  
  return suggestions;
}

function generateScoreJustification(score: number, dietCPDs: any[]) {
  if (score >= 8) {
    return "Excellent adherence to nutrition goals with consistent healthy choices aligned with your care plan";
  } else if (score >= 6) {
    return "Good progress with room for improvement in consistently following your dietary directives";
  } else {
    return "Significant challenges with nutrition goals - let's identify specific barriers and solutions";
  }
}

function analyzeCPDCompliance(score: number, dietCPDs: any[], recentMetrics: any[]) {
  const strengths = [];
  const improvementAreas = [];
  
  if (score >= 7) {
    strengths.push("Consistent effort to follow dietary guidelines");
    strengths.push("Good understanding of nutrition principles");
  }
  
  if (score < 6) {
    improvementAreas.push("Daily meal planning and preparation");
    improvementAreas.push("Identifying and overcoming specific dietary barriers");
  }
  
  // Analyze consistency
  const scoreVariance = recentMetrics.length > 1 ? 
    Math.max(...recentMetrics.map(m => m.dietScore)) - Math.min(...recentMetrics.map(m => m.dietScore)) : 0;
  
  if (scoreVariance > 3) {
    improvementAreas.push("Consistency in daily nutrition choices");
  } else {
    strengths.push("Consistent daily nutrition habits");
  }
  
  return { strengths, improvementAreas };
}

function generateHonestScoringMessage(score: number) {
  if (score >= 8) {
    return "Your high scores reflect genuine commitment to your health goals - keep up the excellent work!";
  } else if (score >= 6) {
    return "Your honest scoring shows good self-awareness - this foundation will help you continue improving";
  } else {
    return "Your honest assessment is the first step toward positive change - awareness creates the opportunity for growth";
  }
}

function generateProgressInsights(recentMetrics: any[]) {
  if (recentMetrics.length === 0) return [];
  
  const insights = [];
  const trend = calculateDietTrend(recentMetrics);
  
  if (trend === 'improving') {
    insights.push("Your diet scores show positive momentum - you're building sustainable healthy habits");
  } else if (trend === 'declining') {
    insights.push("Recent scores suggest some challenges - let's identify what changed and how to get back on track");
  } else {
    insights.push("Your diet scores are stable - consider strategies to move toward your 8+ goal");
  }
  
  return insights;
}

function generateNextSteps(score: number, dietCPDs: any[]) {
  const steps = [];
  
  if (score < 6) {
    steps.push("Focus on one meal at a time - start with breakfast consistency");
    steps.push("Identify your biggest nutritional challenge and create a specific plan");
  } else if (score < 8) {
    steps.push("Build on your current success - identify what's working and do more of it");
    steps.push("Address remaining barriers to reach your 8+ goal");
  } else {
    steps.push("Maintain your excellent habits while exploring new healthy recipes");
    steps.push("Consider supporting others in their nutrition journey");
  }
  
  return steps;
}

function generatePersonalizedMotivation(avgScore: number, motivationLevel?: string, dietCPDs?: any[]) {
  let message = "";
  
  if (motivationLevel === 'low') {
    message = "It's normal to feel unmotivated sometimes. Remember that small, consistent choices add up to big changes over time.";
  } else if (avgScore >= 8) {
    message = "You're already excelling at your nutrition goals! Your consistency is building habits that will serve you for life.";
  } else {
    message = "You have the knowledge and ability to improve your nutrition. Each healthy choice is an investment in your future self.";
  }
  
  if (dietCPDs && dietCPDs.length > 0) {
    message += ` Your doctor has provided specific guidance because they believe in your potential to achieve these health goals.`;
  }
  
  return message;
}

function generateCBTAffirmations(avgScore: number) {
  const affirmations = [];
  
  affirmations.push("I am capable of making healthy food choices that support my wellbeing");
  affirmations.push("Each nutritious meal is an act of self-care and self-respect");
  
  if (avgScore >= 7) {
    affirmations.push("I am successfully building healthy eating habits that will last");
  } else {
    affirmations.push("I am learning and growing stronger with each healthy choice I make");
  }
  
  return affirmations;
}

function generateMIExplorationQuestions(motivationLevel?: string) {
  const questions = [];
  
  if (motivationLevel === 'low') {
    questions.push("What initially motivated you to focus on improving your nutrition?");
    questions.push("What would need to change for you to feel more motivated about healthy eating?");
  } else {
    questions.push("What aspects of healthy eating feel most rewarding to you?");
    questions.push("How do you envision your life being different as you continue improving your nutrition?");
  }
  
  return questions;
}

function generateSmartGoals(avgScore: number, dietCPDs: any[]) {
  if (avgScore < 6) {
    return "This week, I will plan and prepare 3 healthy meals that align with my care plan directives";
  } else if (avgScore < 8) {
    return "This week, I will achieve diet scores of 7+ on at least 5 days by following my established healthy habits";
  } else {
    return "This week, I will maintain my excellent nutrition habits while trying 1 new healthy recipe";
  }
}

function generateCelebrationPoints(recentMetrics: any[], avgScore: number) {
  const points = [];
  
  if (recentMetrics.length > 0) {
    points.push(`You've tracked your nutrition for ${recentMetrics.length} days - consistency in tracking shows commitment`);
  }
  
  if (avgScore >= 7) {
    points.push("Your scores show you're successfully following your nutrition goals most of the time");
  }
  
  const highScoreDays = recentMetrics.filter(m => m.dietScore >= 8).length;
  if (highScoreDays > 0) {
    points.push(`You've achieved 8+ diet scores on ${highScoreDays} recent days - excellent work!`);
  }
  
  return points;
}

function generateScoringGuidance(dietCPDs: any[]) {
  return {
    "8-10": "Excellent adherence to your care plan directives with nutritious, well-planned meals",
    "6-7": "Good nutrition choices with minor deviations from your dietary goals",
    "4-5": "Mixed results - some healthy choices but room for improvement in following your care plan",
    "1-3": "Significant challenges with nutrition goals - time to reassess and get additional support"
  };
}

function generateDetailedScoringGuidance(avgScore: number, dietCPDs: any[]) {
  let guidance = "Rate your daily nutrition based on how well your food choices align with your care plan directives. ";
  
  if (avgScore < 6) {
    guidance += "Focus on honesty over perfection - accurate scoring helps identify areas for improvement.";
  } else {
    guidance += "Your current scoring shows good self-awareness - continue this honest assessment to maintain progress.";
  }
  
  return guidance;
}

function generateCookingTips(dietCPDs: any[], preferences?: any) {
  const tips = [];
  
  tips.push("Prep ingredients on weekends to make weekday cooking faster");
  tips.push("Keep your kitchen stocked with basic healthy staples");
  tips.push("Start with simple recipes and gradually build your cooking skills");
  
  if (dietCPDs.some(cpd => cpd.directive.includes('sodium'))) {
    tips.push("Experiment with herbs and spices to create flavorful, low-sodium meals");
  }
  
  return tips;
}