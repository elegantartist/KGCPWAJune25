/**
 * Progress Milestones MCP Tool
 * 
 * Tracks patient achievements, rewards, and progress milestones
 * aligned with Care Plan Directives using motivational techniques.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for Progress Milestones tool
const progressMilestonesInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['get_status', 'calculate_rewards', 'check_achievements', 'motivational_summary']),
  includeRewards: z.boolean().optional().default(true),
  timePeriod: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month')
});

/**
 * Progress Milestones Tool Implementation
 */
export const progressMilestonesTool: MCPTool = {
  name: 'progress-milestones',
  description: 'Track patient achievements, rewards, and progress milestones with motivational support',
  inputSchema: progressMilestonesInputSchema,
  handler: async (params: z.infer<typeof progressMilestonesInputSchema>, context: MCPContext) => {
    const { userId, action, includeRewards, timePeriod } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s progress data');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      accessedBy: context.userId,
      dataType: 'progress_milestones',
      action: 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'get_status':
          return await getProgressStatus(userId, context, includeRewards, timePeriod);
        
        case 'calculate_rewards':
          return await calculateRewards(userId, context, timePeriod);
        
        case 'check_achievements':
          return await checkAchievements(userId, context, timePeriod);
        
        case 'motivational_summary':
          return await generateMotivationalSummary(userId, context, timePeriod);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Progress Milestones Tool] Error:', error);
      throw new Error(`Failed to process progress milestones request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Get comprehensive progress status
 */
async function getProgressStatus(userId: number, context: MCPContext, includeRewards?: boolean, timePeriod?: string) {
  const days = getDaysForPeriod(timePeriod || 'month');
  const recentMetrics = await storage.getHealthMetricsForUser(userId, days);

  if (recentMetrics.length === 0) {
    return {
      message: "No progress data found for the selected period.",
      suggestion: "Start tracking your daily self-scores to unlock progress milestones and rewards.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Begin tracking to earn achievements and rewards",
        urgency: "high"
      }]
    };
  }

  const progressAnalysis = analyzeProgressMetrics(recentMetrics, context.carePlanDirectives);
  const achievements = calculateAchievements(recentMetrics, timePeriod || 'month');
  const rewards = includeRewards ? calculateRewardEarnings(recentMetrics, achievements) : null;

  return {
    timePeriod: timePeriod || 'month',
    dataPoints: recentMetrics.length,
    overallProgress: progressAnalysis,
    achievements,
    rewards,
    motivationalInsights: generateProgressMotivation(progressAnalysis, achievements),
    nextMilestones: generateNextMilestones(progressAnalysis, context.carePlanDirectives),
    cpdAlignment: analyzeCPDProgressAlignment(progressAnalysis, context.carePlanDirectives),
    kgcFeatureSuggestions: generateProgressBasedSuggestions(progressAnalysis)
  };
}

/**
 * Calculate detailed reward earnings
 */
async function calculateRewards(userId: number, context: MCPContext, timePeriod?: string) {
  const days = getDaysForPeriod(timePeriod || 'month');
  const recentMetrics = await storage.getHealthMetricsForUser(userId, days);

  if (recentMetrics.length === 0) {
    return {
      message: "No data available for reward calculation.",
      potentialEarnings: "Start tracking daily scores to begin earning rewards!"
    };
  }

  const achievements = calculateAchievements(recentMetrics, timePeriod || 'month');
  const rewardDetails = calculateDetailedRewards(recentMetrics, achievements);

  return {
    timePeriod: timePeriod || 'month',
    totalEarnings: rewardDetails.totalAmount,
    rewardBreakdown: rewardDetails.breakdown,
    achievementBonuses: rewardDetails.bonuses,
    spendingOptions: generateSpendingOptions(),
    motivationalMessage: generateRewardMotivation(rewardDetails),
    nextRewardGoals: generateNextRewardGoals(recentMetrics, rewardDetails)
  };
}

/**
 * Check for new achievements
 */
async function checkAchievements(userId: number, context: MCPContext, timePeriod?: string) {
  const days = getDaysForPeriod(timePeriod || 'month');
  const recentMetrics = await storage.getHealthMetricsForUser(userId, days);
  const allTimeMetrics = await storage.getHealthMetricsForUser(userId, 365); // Last year

  const achievements = {
    recent: calculateAchievements(recentMetrics, timePeriod || 'month'),
    allTime: calculateLifetimeAchievements(allTimeMetrics),
    newlyEarned: findNewAchievements(recentMetrics, allTimeMetrics)
  };

  return {
    achievements,
    celebrationMessage: generateAchievementCelebration(achievements),
    progressToNext: calculateProgressToNextAchievement(allTimeMetrics),
    sharingEncouragement: generateSharingEncouragement(achievements),
    cbtInsights: [
      "Recognize your achievements as evidence of your commitment to health",
      "Each milestone reached demonstrates your ability to create positive change"
    ]
  };
}

/**
 * Generate motivational summary
 */
async function generateMotivationalSummary(userId: number, context: MCPContext, timePeriod?: string) {
  const days = getDaysForPeriod(timePeriod || 'month');
  const recentMetrics = await storage.getHealthMetricsForUser(userId, days);

  const progressAnalysis = analyzeProgressMetrics(recentMetrics, context.carePlanDirectives);
  const achievements = calculateAchievements(recentMetrics, timePeriod || 'month');

  return {
    overallMessage: generateOverallMotivationalMessage(progressAnalysis, achievements),
    specificEncouragements: generateSpecificEncouragements(progressAnalysis, context.carePlanDirectives),
    cbtAffirmations: [
      "I am making consistent progress toward my health goals",
      "Each day I track my scores is a day I'm investing in my wellbeing",
      "I have the power to improve my health through daily choices"
    ],
    miReflections: [
      "What progress are you most proud of from this period?",
      "How has tracking your scores changed your awareness of your habits?",
      "What motivates you most to continue working toward your health goals?"
    ],
    futureVisioning: generateFutureVision(progressAnalysis, context.carePlanDirectives)
  };
}

/**
 * Helper Functions
 */

function getDaysForPeriod(timePeriod: string): number {
  switch (timePeriod) {
    case 'week': return 7;
    case 'month': return 30;
    case 'quarter': return 90;
    case 'year': return 365;
    default: return 30;
  }
}

function analyzeProgressMetrics(metrics: any[], cpds: any[]) {
  const medicationScores = metrics.map(m => m.medicationScore);
  const dietScores = metrics.map(m => m.dietScore);
  const exerciseScores = metrics.map(m => m.exerciseScore);

  const avgMedication = medicationScores.reduce((a, b) => a + b, 0) / medicationScores.length;
  const avgDiet = dietScores.reduce((a, b) => a + b, 0) / dietScores.length;
  const avgExercise = exerciseScores.reduce((a, b) => a + b, 0) / exerciseScores.length;

  const overallAverage = (avgMedication + avgDiet + avgExercise) / 3;

  return {
    medication: {
      average: Number(avgMedication.toFixed(1)),
      trend: calculateTrend(medicationScores),
      consistency: calculateConsistency(medicationScores),
      highScoreDays: medicationScores.filter(s => s >= 8).length
    },
    diet: {
      average: Number(avgDiet.toFixed(1)),
      trend: calculateTrend(dietScores),
      consistency: calculateConsistency(dietScores),
      highScoreDays: dietScores.filter(s => s >= 8).length
    },
    exercise: {
      average: Number(avgExercise.toFixed(1)),
      trend: calculateTrend(exerciseScores),
      consistency: calculateConsistency(exerciseScores),
      highScoreDays: exerciseScores.filter(s => s >= 8).length
    },
    overall: {
      average: Number(overallAverage.toFixed(1)),
      totalDaysTracked: metrics.length,
      excellentDays: metrics.filter(m => 
        m.medicationScore >= 8 && m.dietScore >= 8 && m.exerciseScore >= 8
      ).length
    }
  };
}

function calculateTrend(scores: number[]): string {
  if (scores.length < 4) return 'insufficient_data';
  
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 10) return 'strongly_improving';
  if (change > 5) return 'improving';
  if (change > -5) return 'stable';
  if (change > -10) return 'declining';
  return 'concerning';
}

function calculateConsistency(scores: number[]): string {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < 1) return 'excellent';
  if (stdDev < 2) return 'good';
  if (stdDev < 3) return 'moderate';
  return 'variable';
}

function calculateAchievements(metrics: any[], timePeriod: string) {
  const achievements = [];
  
  // Consistency achievements
  const consecutiveDays = calculateMaxConsecutiveDays(metrics);
  if (consecutiveDays >= 7) {
    achievements.push({
      type: 'consistency',
      name: `${consecutiveDays} Day Streak`,
      description: `Tracked health scores for ${consecutiveDays} consecutive days`,
      earnedDate: new Date().toISOString(),
      rewardValue: Math.min(consecutiveDays * 2, 50) // $2 per day, max $50
    });
  }

  // High score achievements
  const excellentDays = metrics.filter(m => 
    m.medicationScore >= 8 && m.dietScore >= 8 && m.exerciseScore >= 8
  ).length;
  
  if (excellentDays >= 5) {
    achievements.push({
      type: 'excellence',
      name: 'Health Excellence',
      description: `Achieved 8+ scores in all categories for ${excellentDays} days`,
      earnedDate: new Date().toISOString(),
      rewardValue: excellentDays * 5 // $5 per excellent day
    });
  }

  // Category-specific achievements
  const medExcellent = metrics.filter(m => m.medicationScore >= 9).length;
  const dietExcellent = metrics.filter(m => m.dietScore >= 9).length;
  const exerciseExcellent = metrics.filter(m => m.exerciseScore >= 9).length;

  if (medExcellent >= 10) {
    achievements.push({
      type: 'medication_mastery',
      name: 'Medication Mastery',
      description: 'Achieved 9+ medication scores for 10+ days',
      earnedDate: new Date().toISOString(),
      rewardValue: 30
    });
  }

  if (dietExcellent >= 10) {
    achievements.push({
      type: 'nutrition_champion',
      name: 'Nutrition Champion',
      description: 'Achieved 9+ diet scores for 10+ days',
      earnedDate: new Date().toISOString(),
      rewardValue: 30
    });
  }

  if (exerciseExcellent >= 10) {
    achievements.push({
      type: 'fitness_warrior',
      name: 'Fitness Warrior',
      description: 'Achieved 9+ exercise scores for 10+ days',
      earnedDate: new Date().toISOString(),
      rewardValue: 30
    });
  }

  return achievements;
}

function calculateMaxConsecutiveDays(metrics: any[]): number {
  if (metrics.length === 0) return 0;
  
  const sortedMetrics = metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedMetrics.length; i++) {
    const currentDate = new Date(sortedMetrics[i].date);
    const previousDate = new Date(sortedMetrics[i-1].date);
    const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (dayDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return maxStreak;
}

function calculateDetailedRewards(metrics: any[], achievements: any[]) {
  const breakdown = {
    dailyTracking: metrics.length * 1, // $1 per day tracked
    highScoreBonus: 0,
    achievementBonuses: 0
  };

  // High score bonuses
  metrics.forEach(m => {
    const avgScore = (m.medicationScore + m.dietScore + m.exerciseScore) / 3;
    if (avgScore >= 9) {
      breakdown.highScoreBonus += 5; // $5 for 9+ average
    } else if (avgScore >= 8) {
      breakdown.highScoreBonus += 3; // $3 for 8+ average
    } else if (avgScore >= 7) {
      breakdown.highScoreBonus += 1; // $1 for 7+ average
    }
  });

  // Achievement bonuses
  breakdown.achievementBonuses = achievements.reduce((sum, achievement) => {
    return sum + (achievement.rewardValue || 0);
  }, 0);

  const totalAmount = breakdown.dailyTracking + breakdown.highScoreBonus + breakdown.achievementBonuses;

  return {
    totalAmount,
    breakdown,
    bonuses: achievements.map(a => ({
      name: a.name,
      value: a.rewardValue || 0
    }))
  };
}

function generateSpendingOptions() {
  return [
    {
      category: "Fitness & Exercise",
      options: [
        { item: "Gym day pass", cost: 15 },
        { item: "Personal training session", cost: 80 },
        { item: "Yoga class", cost: 25 },
        { item: "Swimming pool entry", cost: 8 }
      ]
    },
    {
      category: "Wellness & Relaxation",
      options: [
        { item: "Massage therapy session", cost: 90 },
        { item: "Spa treatment", cost: 120 },
        { item: "Meditation app subscription", cost: 12 },
        { item: "Wellness workshop", cost: 45 }
      ]
    },
    {
      category: "Healthy Dining",
      options: [
        { item: "Healthy meal delivery", cost: 18 },
        { item: "Organic grocery voucher", cost: 30 },
        { item: "Nutritionist consultation", cost: 85 },
        { item: "Cooking class", cost: 65 }
      ]
    }
  ];
}

function generateProgressMotivation(progressAnalysis: any, achievements: any[]) {
  const insights = [];
  
  if (progressAnalysis.overall.average >= 8) {
    insights.push("Your overall scores are excellent - you're consistently meeting your health goals!");
  } else if (progressAnalysis.overall.average >= 7) {
    insights.push("You're making solid progress across all health categories - keep building on this momentum!");
  } else {
    insights.push("Every day you track is progress - you're building awareness and positive habits!");
  }

  if (achievements.length > 0) {
    insights.push(`You've earned ${achievements.length} achievement${achievements.length > 1 ? 's' : ''} - celebrate these wins!`);
  }

  if (progressAnalysis.overall.excellentDays > 0) {
    insights.push(`You had ${progressAnalysis.overall.excellentDays} excellent day${progressAnalysis.overall.excellentDays > 1 ? 's' : ''} with 8+ scores in all categories!`);
  }

  return insights;
}

function generateNextMilestones(progressAnalysis: any, cpds: any[]) {
  const milestones = [];
  
  // Category-specific milestones
  if (progressAnalysis.medication.average < 8) {
    milestones.push({
      category: "Medication",
      goal: "Achieve 8+ average medication score",
      currentProgress: progressAnalysis.medication.average,
      target: 8,
      suggestion: "Focus on consistent medication timing and adherence"
    });
  }

  if (progressAnalysis.diet.average < 8) {
    milestones.push({
      category: "Diet",
      goal: "Achieve 8+ average diet score",
      currentProgress: progressAnalysis.diet.average,
      target: 8,
      suggestion: "Plan meals aligned with your care plan directives"
    });
  }

  if (progressAnalysis.exercise.average < 8) {
    milestones.push({
      category: "Exercise", 
      goal: "Achieve 8+ average exercise score",
      currentProgress: progressAnalysis.exercise.average,
      target: 8,
      suggestion: "Establish a consistent exercise routine"
    });
  }

  // Overall milestones
  const nextStreakTarget = Math.ceil((progressAnalysis.overall.totalDaysTracked + 5) / 5) * 5;
  milestones.push({
    category: "Consistency",
    goal: `Track scores for ${nextStreakTarget} days`,
    currentProgress: progressAnalysis.overall.totalDaysTracked,
    target: nextStreakTarget,
    suggestion: "Maintain daily tracking to build stronger health awareness"
  });

  return milestones;
}

function analyzeCPDProgressAlignment(progressAnalysis: any, cpds: any[]) {
  const alignment = [];
  
  for (const cpd of cpds) {
    const category = cpd.category.toLowerCase();
    let relevantProgress;
    
    if (category.includes('medication')) {
      relevantProgress = progressAnalysis.medication;
    } else if (category.includes('diet') || category.includes('nutrition')) {
      relevantProgress = progressAnalysis.diet;
    } else if (category.includes('exercise') || category.includes('physical')) {
      relevantProgress = progressAnalysis.exercise;
    } else {
      continue;
    }
    
    alignment.push({
      directive: cpd.directive,
      category: cpd.category,
      currentAverage: relevantProgress.average,
      trend: relevantProgress.trend,
      assessment: relevantProgress.average >= 8 ? 'Excellent alignment' :
                  relevantProgress.average >= 7 ? 'Good progress' :
                  relevantProgress.average >= 6 ? 'Moderate alignment' :
                  'Needs improvement'
    });
  }
  
  return alignment;
}

function generateProgressBasedSuggestions(progressAnalysis: any) {
  const suggestions = [];
  
  if (progressAnalysis.medication.average < 7) {
    suggestions.push({
      feature: "MBP Wizard",
      reason: "Get medication adherence support and price comparisons",
      urgency: "high"
    });
  }
  
  if (progressAnalysis.diet.average < 7) {
    suggestions.push({
      feature: "Inspiration Machine D",
      reason: "Find meal ideas to improve your diet scores",
      urgency: "medium"
    });
  }
  
  if (progressAnalysis.exercise.average < 7) {
    suggestions.push({
      feature: "E&W Support",
      reason: "Discover local fitness options to boost exercise scores",
      urgency: "medium"
    });
  }
  
  return suggestions;
}

function calculateLifetimeAchievements(allTimeMetrics: any[]) {
  const totalDays = allTimeMetrics.length;
  const totalExcellentDays = allTimeMetrics.filter(m => 
    m.medicationScore >= 8 && m.dietScore >= 8 && m.exerciseScore >= 8
  ).length;
  
  const achievements = [];
  
  // Lifetime tracking milestones
  if (totalDays >= 30) achievements.push({ name: "30 Day Tracker", type: "consistency" });
  if (totalDays >= 90) achievements.push({ name: "90 Day Commitment", type: "consistency" });
  if (totalDays >= 180) achievements.push({ name: "6 Month Dedication", type: "consistency" });
  if (totalDays >= 365) achievements.push({ name: "1 Year Champion", type: "consistency" });
  
  // Excellence milestones
  if (totalExcellentDays >= 10) achievements.push({ name: "Excellence Achiever", type: "excellence" });
  if (totalExcellentDays >= 50) achievements.push({ name: "Excellence Master", type: "excellence" });
  if (totalExcellentDays >= 100) achievements.push({ name: "Excellence Legend", type: "excellence" });
  
  return achievements;
}

function findNewAchievements(recentMetrics: any[], allTimeMetrics: any[]) {
  // This would compare recent achievements against historical ones
  // For now, return recent achievements as "new"
  const recentAchievements = calculateAchievements(recentMetrics, 'month');
  return recentAchievements;
}

function generateAchievementCelebration(achievements: any) {
  if (achievements.newlyEarned.length > 0) {
    return `Congratulations! You've earned ${achievements.newlyEarned.length} new achievement${achievements.newlyEarned.length > 1 ? 's' : ''}! Your dedication to your health goals is truly inspiring.`;
  } else if (achievements.recent.length > 0) {
    return `You're on track with ${achievements.recent.length} achievement${achievements.recent.length > 1 ? 's' : ''} this period. Keep up the excellent work!`;
  } else {
    return "Every day you track your scores is progress toward your next achievement. Keep going!";
  }
}

function calculateProgressToNextAchievement(allTimeMetrics: any[]) {
  const totalDays = allTimeMetrics.length;
  const nextMilestones = [30, 60, 90, 180, 365];
  const nextMilestone = nextMilestones.find(m => m > totalDays) || totalDays + 30;
  
  return {
    daysToNext: nextMilestone - totalDays,
    nextAchievement: `${nextMilestone} Day Tracker`,
    currentProgress: totalDays,
    target: nextMilestone
  };
}

function generateSharingEncouragement(achievements: any) {
  if (achievements.recent.length > 0) {
    return "Consider sharing your progress with family or friends - your success might inspire others to start their own health journey!";
  }
  return "Your commitment to tracking and improving your health is an example worth sharing with others.";
}

function generateOverallMotivationalMessage(progressAnalysis: any, achievements: any[]) {
  const avgScore = progressAnalysis.overall.average;
  
  if (avgScore >= 8.5) {
    return "Your health tracking shows exceptional commitment and success. You're not just meeting your goals - you're excelling at them!";
  } else if (avgScore >= 7.5) {
    return "Your consistent effort and progress are impressive. You're building strong health habits that will serve you well.";
  } else if (avgScore >= 6.5) {
    return "You're making meaningful progress in your health journey. Each day of tracking and improvement counts.";
  } else {
    return "Starting and maintaining health tracking takes courage. Every score you record is a step toward better health awareness.";
  }
}

function generateSpecificEncouragements(progressAnalysis: any, cpds: any[]) {
  const encouragements = [];
  
  // Category-specific encouragements
  if (progressAnalysis.medication.average >= 8) {
    encouragements.push("Your medication adherence is excellent - this consistency supports all your health goals");
  } else if (progressAnalysis.medication.trend === 'improving') {
    encouragements.push("Your medication scores are improving - this positive trend will compound over time");
  }
  
  if (progressAnalysis.diet.average >= 8) {
    encouragements.push("Your nutrition choices are outstanding - you're fueling your body for optimal health");
  } else if (progressAnalysis.diet.trend === 'improving') {
    encouragements.push("Your diet scores show positive momentum - each healthy choice builds on the last");
  }
  
  if (progressAnalysis.exercise.average >= 8) {
    encouragements.push("Your commitment to physical activity is inspiring - you're building strength and vitality");
  } else if (progressAnalysis.exercise.trend === 'improving') {
    encouragements.push("Your exercise scores are trending upward - consistency in movement pays dividends");
  }
  
  return encouragements;
}

function generateFutureVision(progressAnalysis: any, cpds: any[]) {
  return {
    oneMonthVision: "Continue your current progress to achieve even more consistent 8+ scores across all categories",
    threeMonthVision: "Build on your health habits to become a model of successful CPD adherence and self-care",
    oneYearVision: "Transform your health journey into a sustainable lifestyle that inspires others and supports your long-term wellbeing"
  };
}

function generateRewardMotivation(rewardDetails: any) {
  if (rewardDetails.totalAmount >= 100) {
    return `Fantastic! You've earned $${rewardDetails.totalAmount} through your commitment to health tracking. Treat yourself to something that supports your wellness journey!`;
  } else if (rewardDetails.totalAmount >= 50) {
    return `Great work! You've earned $${rewardDetails.totalAmount} in rewards. Consider investing in a fitness class or healthy meal to continue your progress!`;
  } else if (rewardDetails.totalAmount >= 20) {
    return `You've earned $${rewardDetails.totalAmount} - a nice reward for your consistent effort. Every dollar represents your commitment to better health!`;
  } else {
    return `You've earned $${rewardDetails.totalAmount} to start with. Keep tracking consistently to unlock bigger rewards!`;
  }
}

function generateNextRewardGoals(recentMetrics: any[], rewardDetails: any) {
  const goals = [];
  
  const averageScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + (m.medicationScore + m.dietScore + m.exerciseScore) / 3, 0) / recentMetrics.length : 0;
  
  if (averageScore < 8) {
    goals.push({
      goal: "Achieve 8+ average scores for 5 consecutive days",
      rewardValue: 25,
      timeframe: "This week"
    });
  }
  
  const consecutiveDays = calculateMaxConsecutiveDays(recentMetrics);
  if (consecutiveDays < 14) {
    goals.push({
      goal: "Track scores for 14 consecutive days",
      rewardValue: 30,
      timeframe: "Next 2 weeks"
    });
  }
  
  return goals;
}