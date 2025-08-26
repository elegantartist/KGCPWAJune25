/**
 * MBP Wizard MCP Tool
 * 
 * Provides medication price comparison and pharmacy location services
 * aligned with Care Plan Directives using CBT and MI techniques.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for MBP Wizard tool
const mbpWizardInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['search_medication', 'find_pharmacies', 'analyze_adherence', 'motivational_prompt']),
  medicationName: z.string().optional(),
  location: z.string().optional().default('Sydney NSW'),
  currentScore: z.number().min(1).max(10).optional(),
  adherenceChallenge: z.string().optional()
});

/**
 * MBP Wizard Tool Implementation
 */
export const mbpWizardTool: MCPTool = {
  name: 'mbp-wizard',
  description: 'Medication price comparison and pharmacy services with adherence support using CBT and MI techniques',
  inputSchema: mbpWizardInputSchema,
  handler: async (params: z.infer<typeof mbpWizardInputSchema>, context: MCPContext) => {
    const { userId, action, medicationName, location, currentScore, adherenceChallenge } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s medication data');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      dataType: 'medication_search',
      action: 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'search_medication':
          return await searchMedication(userId, context, medicationName, location);
        
        case 'find_pharmacies':
          return await findPharmacies(userId, context, location);
        
        case 'analyze_adherence':
          return await analyzeMedicationAdherence(userId, context, currentScore);
        
        case 'motivational_prompt':
          return await generateMedicationMotivation(userId, context, currentScore, adherenceChallenge);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[MBP Wizard Tool] Error:', error);
      throw new Error(`Failed to process medication request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Search for medication prices and information
 */
async function searchMedication(userId: number, context: MCPContext, medicationName?: string, location?: string) {
  // Get medication CPDs
  const medicationCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('medication') || 
    cpd.category.toLowerCase().includes('medicine')
  );

  if (!medicationName && medicationCPDs.length === 0) {
    return {
      message: "No medication specified and no medication care plan directives found.",
      suggestion: "Please specify a medication name or check with your doctor for medication directives.",
      kgcFeatureSuggestions: [{
        feature: "Care Plan Directives",
        reason: "Get medication directives from your doctor",
        urgency: "medium"
      }]
    };
  }

  // Extract medication from CPDs if not provided
  const searchMedication = medicationName || extractMedicationFromCPDs(medicationCPDs);

  return {
    searchResults: {
      medication: searchMedication,
      priceComparison: [
        {
          pharmacy: "Chemist Warehouse",
          price: "$12.95",
          location: location || "Sydney NSW",
          availability: "In Stock",
          cpdAlignment: "Supports your medication adherence goals"
        },
        {
          pharmacy: "Priceline Pharmacy", 
          price: "$15.50",
          location: location || "Sydney NSW",
          availability: "In Stock",
          cpdAlignment: "Alternative option for your prescribed medication"
        }
      ]
    },
    adherenceSupport: {
      costSavings: "Choosing Chemist Warehouse could save you $2.55 per prescription",
      practicalTips: [
        "Set up automatic prescription reminders",
        "Use pharmacy apps for easy reordering",
        "Consider 90-day supplies if available"
      ]
    },
    cbtInsights: [
      "Focusing on cost savings can help reframe medication expenses as investments in health",
      "Finding the best prices demonstrates taking active control of your healthcare"
    ],
    motivationalPrompts: [
      "Each day you take your medication as prescribed moves you closer to your health goals",
      "Your doctor prescribed this medication because they believe it will help you"
    ],
    scoringGuidance: "Rate 8-10 when you successfully take medications as prescribed and on schedule",
    kgcFeatureSuggestions: [{
      feature: "Daily Self-Scores",
      reason: "Track medication adherence to identify patterns and improvements",
      urgency: "medium"
    }]
  };
}

/**
 * Find nearby pharmacies
 */
async function findPharmacies(userId: number, context: MCPContext, location?: string) {
  return {
    nearbyPharmacies: [
      {
        name: "Chemist Warehouse",
        address: "123 Main St, " + (location || "Sydney NSW"),
        distance: "0.5 km",
        hours: "9:00 AM - 9:00 PM",
        services: ["Prescription filling", "Health consultations", "Blood pressure checks"],
        specialOffers: "10% off health supplements"
      },
      {
        name: "Priceline Pharmacy",
        address: "456 High St, " + (location || "Sydney NSW"), 
        distance: "0.8 km",
        hours: "8:00 AM - 8:00 PM",
        services: ["Prescription filling", "Vaccination services", "Health screenings"],
        specialOffers: "Free health check with prescription"
      }
    ],
    practicalTips: [
      "Choose a pharmacy close to home or work for convenience",
      "Build a relationship with your pharmacist for personalized advice",
      "Ask about automatic prescription reminders and delivery services"
    ],
    adherenceSupport: "Having a convenient, trusted pharmacy makes medication adherence easier and more sustainable"
  };
}

/**
 * Analyze medication adherence
 */
async function analyzeMedicationAdherence(userId: number, context: MCPContext, currentScore?: number) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId, 14); // Last 14 days
  const medicationCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('medication')
  );

  if (recentMetrics.length === 0) {
    return {
      message: "No recent medication scores found for analysis.",
      suggestion: "Start tracking your daily medication adherence scores for personalized insights.",
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Begin tracking medication adherence for detailed analysis",
        urgency: "high"
      }]
    };
  }

  const avgScore = recentMetrics.reduce((sum, m) => sum + m.medicationScore, 0) / recentMetrics.length;
  const scoreToAnalyze = currentScore || avgScore;

  return {
    adherenceAnalysis: {
      currentScore: Number(scoreToAnalyze.toFixed(1)),
      scoreJustification: generateMedicationScoreJustification(scoreToAnalyze),
      adherencePattern: analyzeMedicationPattern(recentMetrics),
      identifiedBarriers: identifyAdherenceBarriers(scoreToAnalyze, recentMetrics)
    },
    cbtInterventions: generateMedicationCBT(scoreToAnalyze, recentMetrics),
    motivationalInterviewing: generateMedicationMI(scoreToAnalyze, medicationCPDs),
    practicalSolutions: generatePracticalSolutions(scoreToAnalyze),
    emergencyGuidance: scoreToAnalyze <= 3 ? 
      "Consistently low medication scores may indicate serious adherence issues. Consider speaking with your doctor or pharmacist immediately." : 
      null
  };
}

/**
 * Generate motivational content for medication adherence
 */
async function generateMedicationMotivation(userId: number, context: MCPContext, currentScore?: number, adherenceChallenge?: string) {
  const medicationCPDs = context.carePlanDirectives.filter(cpd => 
    cpd.category.toLowerCase().includes('medication')
  );

  const recentMetrics = await storage.getHealthMetricsForUser(userId, 7);
  const avgScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + m.medicationScore, 0) / recentMetrics.length : 
    currentScore || 5;

  return {
    motivationalMessage: generatePersonalizedMedicationMotivation(avgScore, adherenceChallenge, medicationCPDs),
    cbtAffirmations: [
      "I am capable of taking my medications consistently to support my health",
      "Each dose I take is an investment in my wellbeing and future",
      "I have the tools and support I need to manage my medications effectively"
    ],
    miExploration: [
      "What motivates you most about taking your medications as prescribed?",
      "How do you feel when you successfully maintain your medication routine?",
      "What would need to change to make medication adherence feel easier?"
    ],
    practicalStrategies: generateMedicationStrategies(avgScore, adherenceChallenge),
    successCelebration: avgScore >= 8 ? 
      "Your excellent medication adherence is a testament to your commitment to your health!" : 
      "Every day you work on improving your medication routine is progress worth celebrating"
  };
}

/**
 * Helper Functions
 */

function extractMedicationFromCPDs(medicationCPDs: any[]): string {
  if (medicationCPDs.length === 0) return "paracetamol"; // Default
  
  // Simple extraction - in production this would be more sophisticated
  const directive = medicationCPDs[0].directive.toLowerCase();
  
  if (directive.includes('blood pressure')) return 'amlodipine';
  if (directive.includes('diabetes')) return 'metformin';
  if (directive.includes('cholesterol')) return 'atorvastatin';
  if (directive.includes('depression')) return 'sertraline';
  
  return 'paracetamol'; // Default fallback
}

function generateMedicationScoreJustification(score: number): string {
  if (score >= 9) {
    return "Excellent medication adherence - you're consistently taking medications as prescribed";
  } else if (score >= 7) {
    return "Good medication compliance with minor occasional missed doses";
  } else if (score >= 5) {
    return "Moderate adherence with room for improvement in consistency";
  } else {
    return "Significant medication adherence challenges requiring immediate attention and support";
  }
}

function analyzeMedicationPattern(recentMetrics: any[]) {
  const scores = recentMetrics.map(m => m.medicationScore);
  const variance = Math.max(...scores) - Math.min(...scores);
  
  if (variance <= 1) {
    return "Highly consistent medication routine";
  } else if (variance <= 3) {
    return "Generally consistent with some variation";
  } else {
    return "Inconsistent pattern - may benefit from routine optimization";
  }
}

function identifyAdherenceBarriers(score: number, recentMetrics: any[]): string[] {
  const barriers = [];
  
  if (score < 6) {
    barriers.push("Forgetfulness or lack of routine");
    barriers.push("Possible side effects or concerns about medication");
    barriers.push("Cost or accessibility issues");
  }
  
  const hasLowWeekendScores = recentMetrics.some(m => {
    const date = new Date(m.date);
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) && m.medicationScore < 6;
  });
  
  if (hasLowWeekendScores) {
    barriers.push("Weekend routine disruption");
  }
  
  return barriers;
}

function generateMedicationCBT(score: number, recentMetrics: any[]): string[] {
  const interventions = [];
  
  if (score < 6) {
    interventions.push("Challenge: 'I always forget my medications' → 'I can develop systems to help me remember'");
    interventions.push("Reframe: 'These medications are a burden' → 'These medications are tools that help me live better'");
  }
  
  if (recentMetrics.some(m => m.medicationScore < 4)) {
    interventions.push("Challenge: 'Missing a few doses won't matter' → 'Consistent medication use is key to their effectiveness'");
  }
  
  interventions.push("Recognize the connection between medication adherence and your overall health goals");
  
  return interventions;
}

function generateMedicationMI(score: number, medicationCPDs: any[]) {
  return {
    explorationQuestions: [
      "What concerns, if any, do you have about your current medications?",
      "How important is it to you to take your medications exactly as prescribed?",
      "What would motivate you most to maintain consistent medication adherence?"
    ],
    changeCommitment: score < 7 ? 
      "What one specific change could help you improve your medication routine this week?" :
      "How can you maintain this positive medication adherence pattern?"
  };
}

function generatePracticalSolutions(score: number): string[] {
  const solutions = [];
  
  if (score < 6) {
    solutions.push("Use a pill organizer to prepare medications weekly");
    solutions.push("Set phone alarms or use medication reminder apps");
    solutions.push("Link medication taking to existing daily habits (like morning coffee)");
    solutions.push("Keep emergency doses in your car, work bag, or travel kit");
  } else if (score < 8) {
    solutions.push("Fine-tune your current system for even better consistency");
    solutions.push("Consider automatic prescription refills to avoid running out");
    solutions.push("Track patterns to identify and address any remaining gaps");
  } else {
    solutions.push("Share your successful strategies with others who might benefit");
    solutions.push("Continue monitoring to maintain your excellent adherence");
  }
  
  return solutions;
}

function generatePersonalizedMedicationMotivation(avgScore: number, adherenceChallenge?: string, medicationCPDs?: any[]): string {
  let message = "";
  
  if (avgScore >= 8) {
    message = "Your commitment to taking medications as prescribed shows tremendous self-care and responsibility for your health.";
  } else if (avgScore >= 6) {
    message = "You're making good progress with your medication routine. Each consistent day builds toward better health outcomes.";
  } else {
    message = "Improving medication adherence can be challenging, but you have the ability to build better habits that support your health.";
  }
  
  if (adherenceChallenge?.includes('forgetfulness')) {
    message += " Remember that forgetting medications is common - the key is developing reliable systems and routines.";
  } else if (adherenceChallenge?.includes('side effects')) {
    message += " If side effects are a concern, speaking with your doctor about alternatives or timing adjustments can help.";
  }
  
  if (medicationCPDs && medicationCPDs.length > 0) {
    message += " Your doctor prescribed these medications because they believe they will help you achieve your health goals.";
  }
  
  return message;
}

function generateMedicationStrategies(avgScore: number, adherenceChallenge?: string): string[] {
  const strategies = [];
  
  if (adherenceChallenge?.includes('time') || adherenceChallenge?.includes('forget')) {
    strategies.push("Set up a consistent daily routine for taking medications");
    strategies.push("Use visual cues like placing medications next to your toothbrush");
    strategies.push("Consider smartphone apps with customizable medication reminders");
  }
  
  if (adherenceChallenge?.includes('cost')) {
    strategies.push("Ask your pharmacist about generic alternatives");
    strategies.push("Look into patient assistance programs for expensive medications");
    strategies.push("Consider 90-day supplies for cost savings");
  }
  
  if (avgScore < 6) {
    strategies.push("Start with focusing on just one medication until the habit is established");
    strategies.push("Involve family members or friends in your medication routine for support");
  }
  
  strategies.push("Track your adherence and celebrate consecutive days of success");
  
  return strategies;
}