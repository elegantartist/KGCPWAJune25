/**
 * E&W Support MCP Tool
 * 
 * Exercise and Wellness Support tool for finding local fitness options
 * and exercise programs aligned with Care Plan Directives.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for E&W Support tool
const ewSupportInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['search_fitness', 'find_activities', 'analyze_exercise', 'motivational_prompt']),
  location: z.string().optional().default('Sydney NSW'),
  activityType: z.string().optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  currentScore: z.number().min(1).max(10).optional()
});

/**
 * E&W Support Tool Implementation
 */
export const ewSupportTool: MCPTool = {
  name: 'ew-support',
  description: 'Exercise and wellness support for finding local fitness options aligned with Care Plan Directives',
  inputSchema: ewSupportInputSchema,
  handler: async (params: z.infer<typeof ewSupportInputSchema>, context: MCPContext) => {
    const { userId, action, location, activityType, fitnessLevel, currentScore } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s exercise data');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      accessedBy: context.userId,
      dataType: 'exercise_wellness',
      action: 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'search_fitness':
          return await searchFitnessOptions(userId, context, location, activityType, fitnessLevel);
        
        case 'find_activities':
          return await findActivities(userId, context, location, fitnessLevel);
        
        case 'analyze_exercise':
          return await analyzeExerciseAdherence(userId, context, currentScore);
        
        case 'motivational_prompt':
          return await generateExerciseMotivation(userId, context, currentScore, fitnessLevel);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[E&W Support Tool] Error:', error);
      throw new Error(`Failed to process exercise wellness request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Search for fitness options in the area
 */
async function searchFitnessOptions(userId: number, context: MCPContext, location?: string, activityType?: string, fitnessLevel?: string) {
  // Get exercise CPDs
  const exerciseCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('exercise') || 
    cpd.category.toLowerCase().includes('physical') ||
    cpd.category.toLowerCase().includes('activity')
  );

  return {
    searchLocation: location || 'Sydney NSW',
    fitnessOptions: [
      {
        name: "Anytime Fitness",
        type: "Gym",
        address: "123 Main St, " + (location || "Sydney NSW"),
        distance: "0.3 km",
        rating: 4.2,
        features: ["24/7 access", "Personal training", "Group classes"],
        priceRange: "$15-25/week",
        cpdAlignment: exerciseCPDs.length > 0 ? `Supports your exercise directive: "${exerciseCPDs[0].directive}"` : "Great for general fitness goals",
        beginner_friendly: true
      },
      {
        name: "F45 Training",
        type: "Group Fitness",
        address: "456 High St, " + (location || "Sydney NSW"),
        distance: "0.7 km", 
        rating: 4.5,
        features: ["HIIT workouts", "Team training", "Varied programs"],
        priceRange: "$35-45/week",
        cpdAlignment: "Excellent for cardiovascular health and strength building",
        beginner_friendly: true
      },
      {
        name: "Local Swimming Pool",
        type: "Aquatic Centre",
        address: "789 Pool Rd, " + (location || "Sydney NSW"),
        distance: "1.2 km",
        rating: 4.0,
        features: ["Swimming lanes", "Aqua aerobics", "Physiotherapy pool"],
        priceRange: "$8-12/visit",
        cpdAlignment: "Low-impact exercise ideal for joint health",
        beginner_friendly: true
      }
    ],
    cbtInsights: [
      "Challenge the thought: 'I don't have time for exercise' → 'I can find 30 minutes for my health'",
      "Reframe: 'Exercise is hard work' → 'Exercise is self-care that energizes me'"
    ],
    motivationalPrompts: [
      "Each workout brings you closer to your health goals",
      "Your body is designed to move - honor it with regular activity"
    ],
    practicalTips: generateExerciseTips(exerciseCPDs, fitnessLevel),
    kgcFeatureSuggestions: [{
      feature: "Daily Self-Scores",
      reason: "Track your exercise progress and see how activity impacts your scores",
      urgency: "medium"
    }]
  };
}

/**
 * Find specific activities based on preferences
 */
async function findActivities(userId: number, context: MCPContext, location?: string, fitnessLevel?: string) {
  const exerciseCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('exercise') || 
    cpd.category.toLowerCase().includes('physical')
  );

  return {
    recommendedActivities: [
      {
        activity: "Walking Groups",
        description: "Social walking groups for all fitness levels",
        location: "Local parks in " + (location || "Sydney"),
        schedule: "Weekday mornings and weekends",
        cost: "Free",
        intensity: "Low",
        cpdAlignment: "Perfect starting point for building exercise habits",
        socialBenefit: "Meet like-minded people in your community"
      },
      {
        activity: "Yoga Classes",
        description: "Gentle yoga suitable for beginners",
        location: "Community centers and studios",
        schedule: "Multiple times throughout the week",
        cost: "$20-30/class",
        intensity: "Low to Moderate",
        cpdAlignment: "Excellent for flexibility and stress management",
        socialBenefit: "Supportive, non-competitive environment"
      },
      {
        activity: "Cycling Groups",
        description: "Recreational cycling with local clubs",
        location: "Cycling paths and parks",
        schedule: "Weekend mornings",
        cost: "Free (bike rental available)",
        intensity: "Moderate",
        cpdAlignment: "Great cardiovascular exercise",
        socialBenefit: "Explore your local area with others"
      }
    ],
    adaptationsForConditions: generateConditionAdaptations(exerciseCPDs),
    progressionPlan: generateProgressionPlan(fitnessLevel, exerciseCPDs),
    safetyGuidelines: [
      "Start slowly and gradually increase intensity",
      "Listen to your body and rest when needed",
      "Stay hydrated and wear appropriate clothing",
      "Consult your doctor before starting new exercise programs"
    ]
  };
}

/**
 * Analyze exercise adherence and patterns
 */
async function analyzeExerciseAdherence(userId: number, context: MCPContext, currentScore?: number) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId, 14); // Last 14 days
  const exerciseCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('exercise')
  );

  if (recentMetrics.length === 0) {
    return {
      message: "No recent exercise scores found for analysis.",
      suggestion: "Start tracking your daily exercise scores to get personalized insights.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Begin tracking exercise adherence for detailed analysis",
        urgency: "high"
      }]
    };
  }

  const avgScore = recentMetrics.reduce((sum, m) => sum + m.exerciseScore, 0) / recentMetrics.length;
  const scoreToAnalyze = currentScore || avgScore;

  return {
    adherenceAnalysis: {
      currentScore: Number(scoreToAnalyze.toFixed(1)),
      scoreJustification: generateExerciseScoreJustification(scoreToAnalyze),
      activityPattern: analyzeExercisePattern(recentMetrics),
      identifiedBarriers: identifyExerciseBarriers(scoreToAnalyze, recentMetrics)
    },
    cbtInterventions: generateExerciseCBT(scoreToAnalyze, recentMetrics),
    motivationalInterviewing: generateExerciseMI(scoreToAnalyze, exerciseCPDs),
    practicalSolutions: generateExerciseSolutions(scoreToAnalyze),
    progressInsights: generateExerciseProgressInsights(recentMetrics)
  };
}

/**
 * Generate motivational content for exercise
 */
async function generateExerciseMotivation(userId: number, context: MCPContext, currentScore?: number, fitnessLevel?: string) {
  const exerciseCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('exercise')
  );

  const recentMetrics = await storage.getHealthMetricsForUser(userId, 7);
  const avgScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + m.exerciseScore, 0) / recentMetrics.length : 
    currentScore || 5;

  return {
    motivationalMessage: generatePersonalizedExerciseMotivation(avgScore, fitnessLevel, exerciseCPDs),
    cbtAffirmations: [
      "I am building strength and endurance with each workout",
      "My body appreciates the movement and care I provide through exercise",
      "I am capable of making physical activity a regular part of my life"
    ],
    miExploration: [
      "What types of physical activity have you enjoyed in the past?",
      "How do you feel after completing exercise or physical activity?",
      "What would make it easier for you to be more physically active?"
    ],
    fitnessLevelGuidance: generateFitnessLevelGuidance(fitnessLevel, avgScore),
    celebrationPoints: generateExerciseCelebrationPoints(recentMetrics, avgScore)
  };
}

/**
 * Helper Functions
 */

function generateExerciseTips(exerciseCPDs: any[], fitnessLevel?: string): string[] {
  const tips = [];
  
  if (fitnessLevel === 'beginner') {
    tips.push("Start with 10-15 minutes of activity and gradually increase");
    tips.push("Focus on activities you enjoy to build sustainable habits");
    tips.push("Walking is an excellent starting point for most people");
  }
  
  for (const cpd of exerciseCPDs) {
    const directive = cpd.directive.toLowerCase();
    
    if (directive.includes('cardiovascular') || directive.includes('heart')) {
      tips.push("Aim for activities that increase your heart rate moderately");
      tips.push("Walking, swimming, or cycling are excellent cardiovascular exercises");
    }
    
    if (directive.includes('strength') || directive.includes('muscle')) {
      tips.push("Include resistance exercises 2-3 times per week");
      tips.push("Bodyweight exercises can be done at home without equipment");
    }
    
    if (directive.includes('flexibility') || directive.includes('balance')) {
      tips.push("Incorporate stretching or yoga into your routine");
      tips.push("Balance exercises help prevent falls and improve stability");
    }
  }
  
  if (tips.length === 0) {
    tips.push("Aim for at least 150 minutes of moderate activity per week");
    tips.push("Find activities you enjoy to make exercise sustainable");
  }
  
  return tips;
}

function generateConditionAdaptations(exerciseCPDs: any[]): any[] {
  const adaptations = [];
  
  for (const cpd of exerciseCPDs) {
    const directive = cpd.directive.toLowerCase();
    
    if (directive.includes('joint') || directive.includes('arthritis')) {
      adaptations.push({
        condition: "Joint concerns",
        recommendations: [
          "Choose low-impact activities like swimming or water aerobics",
          "Avoid high-impact activities that stress joints",
          "Include gentle stretching and range-of-motion exercises"
        ]
      });
    }
    
    if (directive.includes('cardiac') || directive.includes('heart')) {
      adaptations.push({
        condition: "Heart health",
        recommendations: [
          "Start slowly and monitor heart rate during exercise",
          "Choose moderate-intensity activities",
          "Include warm-up and cool-down periods"
        ]
      });
    }
    
    if (directive.includes('diabetes') || directive.includes('blood sugar')) {
      adaptations.push({
        condition: "Blood sugar management",
        recommendations: [
          "Monitor blood sugar before and after exercise",
          "Keep glucose tablets or snacks nearby during workouts",
          "Regular moderate exercise helps improve insulin sensitivity"
        ]
      });
    }
  }
  
  return adaptations;
}

function generateProgressionPlan(fitnessLevel?: string, exerciseCPDs?: any[]): any {
  if (fitnessLevel === 'beginner') {
    return {
      week1_2: "10-15 minutes light activity, 3 days per week",
      week3_4: "15-20 minutes moderate activity, 4 days per week", 
      week5_8: "20-30 minutes varied activities, 4-5 days per week",
      ongoing: "Maintain 30+ minutes activity, 5+ days per week"
    };
  } else if (fitnessLevel === 'intermediate') {
    return {
      current: "30-45 minutes activity, 4-5 days per week",
      nextStep: "Add variety or increase intensity gradually",
      advanced: "Consider new challenges like group classes or sports"
    };
  } else {
    return {
      maintenance: "Continue current routine with periodic assessments",
      variety: "Incorporate new activities to prevent plateaus",
      goalSetting: "Set specific performance or participation goals"
    };
  }
}

function generateExerciseScoreJustification(score: number): string {
  if (score >= 9) {
    return "Excellent exercise adherence - you're consistently meeting your physical activity goals";
  } else if (score >= 7) {
    return "Good exercise habits with room for minor improvements in consistency";
  } else if (score >= 5) {
    return "Moderate activity level with opportunities to increase frequency or intensity";
  } else {
    return "Limited physical activity - significant room for improvement in meeting exercise goals";
  }
}

function analyzeExercisePattern(recentMetrics: any[]): string {
  const scores = recentMetrics.map(m => m.exerciseScore);
  const variance = Math.max(...scores) - Math.min(...scores);
  
  if (variance <= 1) {
    return "Very consistent exercise routine";
  } else if (variance <= 3) {
    return "Generally consistent with some variation";
  } else {
    return "Inconsistent exercise pattern - may benefit from routine planning";
  }
}

function identifyExerciseBarriers(score: number, recentMetrics: any[]): string[] {
  const barriers = [];
  
  if (score < 6) {
    barriers.push("Time constraints or scheduling challenges");
    barriers.push("Lack of motivation or energy");
    barriers.push("Uncertainty about appropriate activities");
    barriers.push("Physical limitations or discomfort");
  }
  
  // Check for weekend vs weekday patterns
  const hasWeekendChallenges = recentMetrics.some(m => {
    const date = new Date(m.date);
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) && m.exerciseScore < 5;
  });
  
  if (hasWeekendChallenges) {
    barriers.push("Weekend routine disruption");
  }
  
  return barriers;
}

function generateExerciseCBT(score: number, recentMetrics: any[]): string[] {
  const interventions = [];
  
  if (score < 6) {
    interventions.push("Challenge: 'I don't have time to exercise' → 'I can find 20 minutes for my health'");
    interventions.push("Reframe: 'Exercise is punishment' → 'Exercise is a gift I give my body'");
    interventions.push("Challenge: 'I'm too out of shape' → 'Every step forward improves my fitness'");
  }
  
  if (recentMetrics.some(m => m.exerciseScore < 4)) {
    interventions.push("Challenge: 'Missing workouts means I've failed' → 'I can restart my routine anytime'");
  }
  
  interventions.push("Recognize how exercise positively impacts your energy and mood");
  
  return interventions;
}

function generateExerciseMI(score: number, exerciseCPDs: any[]): any {
  return {
    explorationQuestions: [
      "What would make physical activity more appealing or enjoyable for you?",
      "How important is it to you to improve your physical fitness?",
      "What has worked well for you with exercise in the past?"
    ],
    changeCommitment: score < 7 ? 
      "What one small change could help you be more physically active this week?" :
      "How can you maintain and build on your current exercise momentum?"
  };
}

function generateExerciseSolutions(score: number): string[] {
  const solutions = [];
  
  if (score < 6) {
    solutions.push("Schedule exercise like an important appointment");
    solutions.push("Start with 10-minute activities to build the habit");
    solutions.push("Find an exercise buddy or join a group for accountability");
    solutions.push("Choose activities you genuinely enjoy");
  } else if (score < 8) {
    solutions.push("Add variety to prevent boredom and plateaus");
    solutions.push("Set specific weekly activity goals");
    solutions.push("Track progress to maintain motivation");
  } else {
    solutions.push("Challenge yourself with new activities or goals");
    solutions.push("Help others get started with their fitness journey");
  }
  
  return solutions;
}

function generateExerciseProgressInsights(recentMetrics: any[]): string[] {
  if (recentMetrics.length === 0) return [];
  
  const insights = [];
  const scores = recentMetrics.map(m => m.exerciseScore);
  const trend = scores.slice(-3).reduce((a, b) => a + b, 0) / 3 - scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  
  if (trend > 0.5) {
    insights.push("Your exercise scores show positive momentum - you're building stronger habits");
  } else if (trend < -0.5) {
    insights.push("Recent exercise scores suggest some challenges - let's identify what changed");
  } else {
    insights.push("Your exercise scores are stable - consider strategies to reach your 8+ goal");
  }
  
  const consistency = scores.every(s => s >= 6);
  if (consistency) {
    insights.push("You're maintaining good exercise consistency - excellent work!");
  }
  
  return insights;
}

function generatePersonalizedExerciseMotivation(avgScore: number, fitnessLevel?: string, exerciseCPDs?: any[]): string {
  let message = "";
  
  if (avgScore >= 8) {
    message = "Your commitment to regular physical activity is outstanding! You're building strength, endurance, and vitality.";
  } else if (avgScore >= 6) {
    message = "You're making good progress with your exercise routine. Each workout builds on the last, creating positive momentum.";
  } else {
    message = "Starting or restarting an exercise routine takes courage. Every small step forward is meaningful progress.";
  }
  
  if (fitnessLevel === 'beginner') {
    message += " Remember that everyone starts somewhere - focus on consistency over intensity.";
  }
  
  if (exerciseCPDs && exerciseCPDs.length > 0) {
    message += " Your doctor has provided exercise guidance because physical activity is a powerful tool for your health goals.";
  }
  
  return message;
}

function generateFitnessLevelGuidance(fitnessLevel?: string, avgScore?: number): any {
  if (fitnessLevel === 'beginner') {
    return {
      focus: "Building consistent habits",
      goalSetting: "Aim for 3-4 days of activity per week",
      progressMarkers: "Increased energy and easier daily activities"
    };
  } else if (fitnessLevel === 'intermediate') {
    return {
      focus: "Increasing variety and challenge",
      goalSetting: "Explore new activities or increase intensity",
      progressMarkers: "Improved strength, endurance, or flexibility"
    };
  } else {
    return {
      focus: "Maintaining excellence and setting new challenges",
      goalSetting: "Performance goals or helping others",
      progressMarkers: "Sustained motivation and health benefits"
    };
  }
}

function generateExerciseCelebrationPoints(recentMetrics: any[], avgScore: number): string[] {
  const points = [];
  
  if (recentMetrics.length > 0) {
    points.push(`You've been tracking exercise for ${recentMetrics.length} days - consistency in tracking shows commitment`);
  }
  
  if (avgScore >= 7) {
    points.push("Your scores show you're regularly engaging in physical activity");
  }
  
  const highScoreDays = recentMetrics.filter(m => m.exerciseScore >= 8).length;
  if (highScoreDays > 0) {
    points.push(`You've achieved 8+ exercise scores on ${highScoreDays} recent days - fantastic dedication!`);
  }
  
  return points;
}