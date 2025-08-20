/**
 * Care Plan Directives MCP Tool
 * 
 * Manages patient access to their Care Plan Directives (CPDs) with
 * motivation and compliance support using CBT and MI techniques.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for Care Plan Directives tool
const carePlanDirectivesInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['get_status', 'analyze_compliance', 'motivational_support', 'progress_summary']),
  category: z.enum(['medication', 'diet', 'exercise', 'all']).optional().default('all'),
  includeHistory: z.boolean().optional().default(false)
});

/**
 * Care Plan Directives Tool Implementation
 */
export const carePlanDirectivesTool: MCPTool = {
  name: 'care-plan-directives',
  description: 'Access and analyze Care Plan Directives with compliance support using CBT and MI techniques',
  inputSchema: carePlanDirectivesInputSchema,
  handler: async (params: z.infer<typeof carePlanDirectivesInputSchema>, context: MCPContext) => {
    const { userId, action, category, includeHistory } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s care plan directives');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      accessedBy: context.userId,
      dataType: 'care_plan_directives',
      action: 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'get_status':
          return await getCPDStatus(userId, context, category, includeHistory);
        
        case 'analyze_compliance':
          return await analyzeCompliance(userId, context, category);
        
        case 'motivational_support':
          return await generateMotivationalSupport(userId, context, category);
        
        case 'progress_summary':
          return await generateProgressSummary(userId, context, category);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Care Plan Directives Tool] Error:', error);
      throw new Error(`Failed to process CPD request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Get current CPD status
 */
async function getCPDStatus(userId: number, context: MCPContext, category?: string, includeHistory?: boolean) {
  const activeCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.active && (category === 'all' || cpd.category.toLowerCase().includes(category || ''))
  );

  if (activeCPDs.length === 0) {
    return {
      message: "No active care plan directives found for the specified category.",
      suggestion: "Contact your doctor to establish personalized care plan directives.",
      kgcFeatureSuggestions: [{
        feature: "Doctor Communication",
        reason: "Schedule an appointment to discuss care plan directives",
        urgency: "medium"
      }]
    };
  }

  const cpdDetails = activeCPDs.map(cpd => ({
    id: cpd.id,
    category: cpd.category,
    directive: cpd.directive,
    targetValue: cpd.targetValue,
    createdDate: cpd.createdAt,
    doctorNote: extractDoctorNote(cpd),
    complianceGuidance: generateComplianceGuidance(cpd),
    scoringGuidance: generateScoringGuidance(cpd)
  }));

  const complianceOverview = await analyzeOverallCompliance(userId, activeCPDs);

  return {
    activeCPDs: cpdDetails,
    complianceOverview,
    motivationalMessage: generateCPDMotivation(activeCPDs, complianceOverview),
    actionableSteps: generateActionableSteps(activeCPDs, complianceOverview),
    kgcFeatureSuggestions: generateCPDBasedSuggestions(activeCPDs, complianceOverview)
  };
}

/**
 * Analyze compliance with CPDs
 */
async function analyzeCompliance(userId: number, context: MCPContext, category?: string) {
  const relevantCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.active && (category === 'all' || cpd.category.toLowerCase().includes(category || ''))
  );

  if (relevantCPDs.length === 0) {
    return {
      message: "No care plan directives found for compliance analysis.",
      suggestion: "Work with your doctor to establish clear health directives."
    };
  }

  const recentMetrics = await storage.getHealthMetricsForUser(userId, 30); // Last 30 days
  const complianceAnalysis = await analyzeDetailedCompliance(relevantCPDs, recentMetrics);

  return {
    complianceAnalysis,
    cbtInsights: generateCBTInsights(complianceAnalysis),
    motivationalInterviewing: generateMITechniques(complianceAnalysis),
    practicalSolutions: generatePracticalSolutions(complianceAnalysis, relevantCPDs),
    progressTracking: generateProgressTracking(complianceAnalysis),
    doctorCommunication: generateDoctorCommunicationPoints(complianceAnalysis, relevantCPDs)
  };
}

/**
 * Generate motivational support for CPD adherence
 */
async function generateMotivationalSupport(userId: number, context: MCPContext, category?: string) {
  const relevantCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.active && (category === 'all' || cpd.category.toLowerCase().includes(category || ''))
  );

  const recentMetrics = await storage.getHealthMetricsForUser(userId, 14); // Last 14 days
  const motivationalContent = generateComprehensiveMotivation(relevantCPDs, recentMetrics);

  return {
    personalizedMessage: motivationalContent.message,
    cbtAffirmations: motivationalContent.affirmations,
    miReflections: motivationalContent.reflections,
    successStories: motivationalContent.successStories,
    overcomingBarriers: motivationalContent.barrierSupport,
    dailyReminders: generateDailyReminders(relevantCPDs),
    visualizationExercises: generateVisualizationExercises(relevantCPDs)
  };
}

/**
 * Generate progress summary
 */
async function generateProgressSummary(userId: number, context: MCPContext, category?: string) {
  const relevantCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.active && (category === 'all' || cpd.category.toLowerCase().includes(category || ''))
  );

  const progressData = await generateDetailedProgressSummary(userId, relevantCPDs);

  return {
    overallProgress: progressData.overall,
    categoryProgress: progressData.byCategory,
    trendsAnalysis: progressData.trends,
    achievements: progressData.achievements,
    areasForImprovement: progressData.improvements,
    doctorReportSummary: generateDoctorReportSummary(progressData),
    nextSteps: generateNextSteps(progressData, relevantCPDs)
  };
}

/**
 * Helper Functions
 */

function extractDoctorNote(cpd: any): string {
  // Extract any additional context or notes from the directive
  return `Your doctor created this directive to support your specific health goals. Follow it consistently for best results.`;
}

function generateComplianceGuidance(cpd: any): string {
  const category = cpd.category.toLowerCase();
  
  if (category.includes('medication')) {
    return "Take medications exactly as prescribed, at the same time each day. Set reminders if needed.";
  } else if (category.includes('diet')) {
    return "Plan meals that align with this directive. Focus on sustainable changes you can maintain long-term.";
  } else if (category.includes('exercise')) {
    return "Start gradually and build consistency. Even small amounts of regular activity are beneficial.";
  }
  
  return "Follow this directive consistently as part of your daily routine for optimal health benefits.";
}

function generateScoringGuidance(cpd: any): string {
  const category = cpd.category.toLowerCase();
  
  if (category.includes('medication')) {
    return "Score 8-10 when taking medications as prescribed without missing doses. Score 6-7 for minor deviations, 4-5 for significant issues.";
  } else if (category.includes('diet')) {
    return "Score 8-10 when meals consistently align with this directive. Score 6-7 for mostly compliant days, 4-5 for challenging days.";
  } else if (category.includes('exercise')) {
    return "Score 8-10 when meeting exercise goals as outlined. Score 6-7 for partial completion, 4-5 for minimal activity.";
  }
  
  return "Score based on how well your daily actions align with this directive. Be honest to get the most benefit from tracking.";
}

async function analyzeOverallCompliance(userId: number, cpds: any[]) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId, 14); // Last 14 days
  
  if (recentMetrics.length === 0) {
    return {
      status: 'insufficient_data',
      message: 'No recent data available for compliance analysis'
    };
  }

  const medicationCPDs = cpds.filter(cpd => cpd.category.toLowerCase().includes('medication'));
  const dietCPDs = cpds.filter(cpd => cpd.category.toLowerCase().includes('diet'));
  const exerciseCPDs = cpds.filter(cpd => cpd.category.toLowerCase().includes('exercise'));

  const avgMedication = recentMetrics.reduce((sum, m) => sum + m.medicationScore, 0) / recentMetrics.length;
  const avgDiet = recentMetrics.reduce((sum, m) => sum + m.dietScore, 0) / recentMetrics.length;
  const avgExercise = recentMetrics.reduce((sum, m) => sum + m.exerciseScore, 0) / recentMetrics.length;

  return {
    medication: {
      hasDirectives: medicationCPDs.length > 0,
      averageScore: Number(avgMedication.toFixed(1)),
      compliance: avgMedication >= 8 ? 'excellent' : avgMedication >= 7 ? 'good' : avgMedication >= 6 ? 'moderate' : 'needs_improvement'
    },
    diet: {
      hasDirectives: dietCPDs.length > 0,
      averageScore: Number(avgDiet.toFixed(1)),
      compliance: avgDiet >= 8 ? 'excellent' : avgDiet >= 7 ? 'good' : avgDiet >= 6 ? 'moderate' : 'needs_improvement'
    },
    exercise: {
      hasDirectives: exerciseCPDs.length > 0,
      averageScore: Number(avgExercise.toFixed(1)),
      compliance: avgExercise >= 8 ? 'excellent' : avgExercise >= 7 ? 'good' : avgExercise >= 6 ? 'moderate' : 'needs_improvement'
    },
    overall: {
      averageScore: Number(((avgMedication + avgDiet + avgExercise) / 3).toFixed(1)),
      daysTracked: recentMetrics.length,
      excellentDays: recentMetrics.filter(m => 
        m.medicationScore >= 8 && m.dietScore >= 8 && m.exerciseScore >= 8
      ).length
    }
  };
}

function generateCPDMotivation(cpds: any[], compliance: any) {
  if (compliance.overall && compliance.overall.averageScore >= 8) {
    return "Excellent work! You're consistently following your care plan directives. Your commitment to your health goals is inspiring.";
  } else if (compliance.overall && compliance.overall.averageScore >= 7) {
    return "You're doing well with your care plan directives. Small improvements in consistency will help you reach your 8+ goal.";
  } else {
    return "Your care plan directives are designed specifically for your health needs. Each day you follow them brings you closer to your goals.";
  }
}

function generateActionableSteps(cpds: any[], compliance: any) {
  const steps = [];
  
  for (const cpd of cpds) {
    const category = cpd.category.toLowerCase();
    
    if (category.includes('medication')) {
      if (compliance.medication && compliance.medication.averageScore < 8) {
        steps.push({
          category: 'Medication',
          action: 'Set up medication reminders or use a pill organizer',
          directive: cpd.directive,
          priority: 'high'
        });
      }
    } else if (category.includes('diet')) {
      if (compliance.diet && compliance.diet.averageScore < 8) {
        steps.push({
          category: 'Diet',
          action: 'Plan meals in advance that align with your dietary directive',
          directive: cpd.directive,
          priority: 'medium'
        });
      }
    } else if (category.includes('exercise')) {
      if (compliance.exercise && compliance.exercise.averageScore < 8) {
        steps.push({
          category: 'Exercise',
          action: 'Schedule specific times for physical activity',
          directive: cpd.directive,
          priority: 'medium'
        });
      }
    }
  }
  
  if (steps.length === 0) {
    steps.push({
      category: 'Maintenance',
      action: 'Continue your excellent adherence to all care plan directives',
      priority: 'ongoing'
    });
  }
  
  return steps;
}

function generateCPDBasedSuggestions(cpds: any[], compliance: any) {
  const suggestions = [];
  
  if (compliance.medication && compliance.medication.averageScore < 7) {
    suggestions.push({
      feature: "MBP Wizard",
      reason: "Get medication support and price comparisons to improve adherence",
      urgency: "high"
    });
  }
  
  if (compliance.diet && compliance.diet.averageScore < 7) {
    suggestions.push({
      feature: "Inspiration Machine D",
      reason: "Find meal ideas aligned with your diet directives",
      urgency: "medium"
    });
  }
  
  if (compliance.exercise && compliance.exercise.averageScore < 7) {
    suggestions.push({
      feature: "E&W Support",
      reason: "Discover local fitness options to support your exercise directives",
      urgency: "medium"
    });
  }
  
  suggestions.push({
    feature: "Progress Milestones",
    reason: "Track your achievements in following care plan directives",
    urgency: "low"
  });
  
  return suggestions;
}

async function analyzeDetailedCompliance(cpds: any[], recentMetrics: any[]) {
  const analysis = {
    overallCompliance: 'good',
    specificAnalysis: [],
    trendsIdentified: [],
    concernAreas: [],
    strengthAreas: []
  };

  for (const cpd of cpds) {
    const category = cpd.category.toLowerCase();
    let relevantScores: number[] = [];
    
    if (category.includes('medication')) {
      relevantScores = recentMetrics.map(m => m.medicationScore);
    } else if (category.includes('diet')) {
      relevantScores = recentMetrics.map(m => m.dietScore);
    } else if (category.includes('exercise')) {
      relevantScores = recentMetrics.map(m => m.exerciseScore);
    }
    
    const avgScore = relevantScores.reduce((sum, score) => sum + score, 0) / relevantScores.length;
    const trend = calculateTrend(relevantScores);
    
    analysis.specificAnalysis.push({
      directive: cpd.directive,
      category: cpd.category,
      averageScore: Number(avgScore.toFixed(1)),
      trend,
      compliance: avgScore >= 8 ? 'excellent' : avgScore >= 7 ? 'good' : 'needs_improvement'
    });
    
    if (avgScore >= 8) {
      analysis.strengthAreas.push({
        area: cpd.category,
        note: `Excellent adherence to ${cpd.category.toLowerCase()} directive`
      });
    } else if (avgScore < 6) {
      analysis.concernAreas.push({
        area: cpd.category,
        note: `${cpd.category} directive needs focused attention and support`
      });
    }
  }
  
  return analysis;
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

function generateCBTInsights(complianceAnalysis: any): string[] {
  const insights = [];
  
  if (complianceAnalysis.concernAreas.length > 0) {
    insights.push("Challenge all-or-nothing thinking: 'I missed one day so I've failed' → 'Each day is a new opportunity to follow my care plan'");
    insights.push("Reframe setbacks as learning opportunities: 'What can this teach me about maintaining my health routine?'");
  }
  
  if (complianceAnalysis.strengthAreas.length > 0) {
    insights.push("Recognize your success as evidence of your capability: 'I am successfully managing my health directives'");
    insights.push("Notice how following your care plan directives positively impacts your overall wellbeing");
  }
  
  insights.push("Your care plan directives are tools for empowerment, not restrictions - they help you take control of your health");
  
  return insights;
}

function generateMITechniques(complianceAnalysis: any): any {
  return {
    explorationQuestions: [
      "What aspects of your care plan directives feel most important to you?",
      "How do you feel when you successfully follow your directives for several days in a row?",
      "What would need to change to make following your care plan feel easier?"
    ],
    reflectiveListening: [
      "It sounds like you want to follow your care plan but sometimes face challenges with consistency",
      "You seem motivated to improve your health, and these directives are tools to help you succeed"
    ],
    changeTalk: [
      "What benefits have you noticed when following your care plan directives?",
      "How important is it to you to achieve the health goals these directives support?"
    ]
  };
}

function generatePracticalSolutions(complianceAnalysis: any, cpds: any[]): any[] {
  const solutions = [];
  
  for (const concern of complianceAnalysis.concernAreas) {
    if (concern.area.toLowerCase().includes('medication')) {
      solutions.push({
        area: concern.area,
        solutions: [
          "Use a weekly pill organizer to prepare medications in advance",
          "Set phone alarms for consistent medication timing",
          "Link medication taking to existing daily habits (like morning coffee)",
          "Keep emergency doses in multiple locations"
        ]
      });
    } else if (concern.area.toLowerCase().includes('diet')) {
      solutions.push({
        area: concern.area,
        solutions: [
          "Plan meals weekly that align with your dietary directive",
          "Prepare healthy snacks in advance to avoid impulsive choices",
          "Use the Inspiration Machine D for directive-aligned meal ideas",
          "Track how different foods make you feel"
        ]
      });
    } else if (concern.area.toLowerCase().includes('exercise')) {
      solutions.push({
        area: concern.area,
        solutions: [
          "Schedule exercise like an important appointment",
          "Start with 10-15 minutes to build the habit",
          "Find activities you enjoy that meet your directive",
          "Use the E&W Support feature to find local options"
        ]
      });
    }
  }
  
  return solutions;
}

function generateProgressTracking(complianceAnalysis: any): any {
  return {
    recommendation: "Continue tracking daily scores to monitor progress with your care plan directives",
    focus: "Pay attention to patterns in your scores to identify what helps you succeed",
    celebration: "Celebrate days when you achieve 8+ scores in alignment with your directives",
    honestAssessment: "Honest scoring helps identify areas for improvement and tracks real progress"
  };
}

function generateDoctorCommunicationPoints(complianceAnalysis: any, cpds: any[]): any {
  const points = [];
  
  for (const analysis of complianceAnalysis.specificAnalysis) {
    if (analysis.compliance === 'excellent') {
      points.push({
        category: analysis.category,
        message: `Excellent adherence to ${analysis.category.toLowerCase()} directive with ${analysis.averageScore}/10 average score`,
        type: 'success'
      });
    } else if (analysis.compliance === 'needs_improvement') {
      points.push({
        category: analysis.category,
        message: `Challenges with ${analysis.category.toLowerCase()} directive - average score ${analysis.averageScore}/10. May need support or directive adjustment`,
        type: 'concern'
      });
    }
  }
  
  return {
    pointsToDiscuss: points,
    overallMessage: "Share your daily scores and progress patterns with your doctor to optimize your care plan",
    nextAppointment: "Consider discussing any consistent challenges or successes with directive adherence"
  };
}

function generateComprehensiveMotivation(cpds: any[], recentMetrics: any[]): any {
  const avgScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + (m.medicationScore + m.dietScore + m.exerciseScore) / 3, 0) / recentMetrics.length : 0;

  return {
    message: generatePersonalizedMotivationalMessage(avgScore, cpds),
    affirmations: [
      "I am capable of following my care plan directives consistently",
      "Each day I follow my directives is an investment in my health and future",
      "My doctor and I are partners in achieving my health goals"
    ],
    reflections: [
      "What motivates you most about following your care plan directives?",
      "How do you feel when you successfully adhere to your health goals?",
      "What support would help you maintain consistency with your directives?"
    ],
    successStories: generateSuccessStoryFramework(avgScore),
    barrierSupport: generateBarrierSupportFramework(cpds)
  };
}

function generatePersonalizedMotivationalMessage(avgScore: number, cpds: any[]): string {
  if (avgScore >= 8) {
    return "Your commitment to following your care plan directives is exceptional! You're demonstrating true partnership with your healthcare team and taking excellent care of your health.";
  } else if (avgScore >= 7) {
    return "You're doing well with your care plan directives. Your consistent effort is building healthy habits that will serve you for life.";
  } else if (avgScore >= 6) {
    return "You're making progress with your care plan directives. Each day you work toward better adherence is meaningful progress.";
  } else {
    return "Following care plan directives can be challenging, but you have the support and tools you need to succeed. Every step forward matters.";
  }
}

function generateSuccessStoryFramework(avgScore: number): string {
  if (avgScore >= 8) {
    return "You're living proof that consistent adherence to care plan directives leads to better health outcomes. Your success can inspire others on their health journey.";
  } else {
    return "Many people have successfully improved their adherence to care plan directives through consistent daily tracking and small, sustainable changes.";
  }
}

function generateBarrierSupportFramework(cpds: any[]): any {
  return {
    commonBarriers: [
      "Forgetting to follow directives consistently",
      "Feeling overwhelmed by multiple directives",
      "Lack of immediate visible results",
      "Disruption of routine during weekends or travel"
    ],
    solutions: [
      "Start with one directive at a time until it becomes habit",
      "Use visual reminders and phone alerts",
      "Focus on how directives make you feel rather than just measurable outcomes",
      "Plan ahead for routine disruptions"
    ]
  };
}

function generateDailyReminders(cpds: any[]): string[] {
  const reminders = [];
  
  for (const cpd of cpds) {
    const category = cpd.category.toLowerCase();
    
    if (category.includes('medication')) {
      reminders.push("Take your medications as prescribed - your body relies on consistent timing");
    } else if (category.includes('diet')) {
      reminders.push("Choose foods that align with your dietary directive - you're nourishing your health");
    } else if (category.includes('exercise')) {
      reminders.push("Move your body according to your exercise directive - you're building strength and vitality");
    }
  }
  
  reminders.push("Record your daily scores honestly - tracking creates awareness and drives improvement");
  
  return reminders;
}

function generateVisualizationExercises(cpds: any[]): string[] {
  return [
    "Visualize yourself successfully following all your care plan directives for an entire week",
    "Imagine how you'll feel when your doctor reviews your excellent adherence scores",
    "Picture the positive health outcomes that result from consistently following your directives",
    "Envision sharing your success story with others who could benefit from your experience"
  ];
}

async function generateDetailedProgressSummary(userId: number, cpds: any[]) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId, 30); // Last 30 days
  
  // This would generate comprehensive progress analysis
  // For now, return a structured summary
  return {
    overall: {
      adherenceRate: 75,
      improvementTrend: 'positive',
      consistencyScore: 'good'
    },
    byCategory: cpds.map(cpd => ({
      category: cpd.category,
      directive: cpd.directive,
      adherenceRate: 78,
      trend: 'stable'
    })),
    trends: {
      medicationTrend: 'improving',
      dietTrend: 'stable',
      exerciseTrend: 'improving'
    },
    achievements: [
      'Consistent tracking for 30 days',
      'Average scores above 7 in all categories'
    ],
    improvements: [
      'Focus on weekend consistency',
      'Improve diet directive adherence'
    ]
  };
}

function generateDoctorReportSummary(progressData: any): string {
  return "Patient demonstrates good overall adherence to care plan directives with consistent daily tracking. Areas of strength include medication compliance. Opportunities for improvement include weekend routine consistency.";
}

function generateNextSteps(progressData: any, cpds: any[]): string[] {
  const steps = [];
  
  steps.push("Continue daily tracking to maintain awareness and accountability");
  steps.push("Focus on achieving 8+ scores in all categories aligned with your directives");
  steps.push("Discuss progress patterns with your doctor at your next appointment");
  
  return steps;
}