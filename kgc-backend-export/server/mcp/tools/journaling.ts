/**
 * Journaling MCP Tool
 * 
 * Provides journaling capabilities for health journey documentation
 * with CBT and MI techniques for self-reflection and progress tracking.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for Journaling tool
const journalingInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['create_entry', 'get_entries', 'analyze_patterns', 'guided_reflection']),
  entryText: z.string().optional(),
  category: z.enum(['general', 'medication', 'diet', 'exercise', 'emotional', 'goals']).optional(),
  mood: z.enum(['excellent', 'good', 'neutral', 'challenging', 'difficult']).optional(),
  timePeriod: z.enum(['week', 'month', 'quarter']).optional().default('month')
});

/**
 * Journaling Tool Implementation
 */
export const journalingTool: MCPTool = {
  name: 'journaling',
  description: 'Health journey documentation with CBT and MI techniques for self-reflection and progress tracking',
  inputSchema: journalingInputSchema,
  handler: async (params: z.infer<typeof journalingInputSchema>, context: MCPContext) => {
    const { userId, action, entryText, category, mood, timePeriod } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s journal entries');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      accessedBy: context.userId,
      dataType: 'journaling',
      action: action === 'create_entry' ? 'write' : 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'create_entry':
          return await createJournalEntry(userId, context, entryText, category, mood);
        
        case 'get_entries':
          return await getJournalEntries(userId, context, category, timePeriod);
        
        case 'analyze_patterns':
          return await analyzeJournalPatterns(userId, context, timePeriod);
        
        case 'guided_reflection':
          return await generateGuidedReflection(userId, context, category);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Journaling Tool] Error:', error);
      throw new Error(`Failed to process journaling request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Create a new journal entry
 */
async function createJournalEntry(userId: number, context: MCPContext, entryText?: string, category?: string, mood?: string) {
  if (!entryText) {
    return {
      message: "Please provide text for your journal entry.",
      guidedPrompts: generateGuidedPrompts(category, context.carePlanDirectives),
      kgcFeatureSuggestions: [{
        feature: "Daily Self-Scores",
        reason: "Track quantitative progress alongside your journal reflections",
        urgency: "low"
      }]
    };
  }

  // Store journal entry (simplified - would use actual storage)
  const journalEntry = {
    id: Date.now(),
    userId,
    entryText,
    category: category || 'general',
    mood: mood || 'neutral',
    createdAt: new Date().toISOString(),
    cpdAlignment: analyzeCPDAlignment(entryText, context.carePlanDirectives)
  };

  return {
    success: true,
    entryId: journalEntry.id,
    entryPreview: entryText.substring(0, 100) + (entryText.length > 100 ? '...' : ''),
    cbtInsights: generateCBTInsightsFromEntry(entryText, category),
    reflectionPrompts: generateReflectionPrompts(entryText, category, context.carePlanDirectives),
    emotionalAwareness: generateEmotionalAwareness(entryText, mood),
    nextSteps: generateNextStepsFromEntry(entryText, category, context.carePlanDirectives)
  };
}

/**
 * Get journal entries with filtering
 */
async function getJournalEntries(userId: number, context: MCPContext, category?: string, timePeriod?: string) {
  // Mock journal entries - would retrieve from actual storage
  const mockEntries = [
    {
      id: 1,
      entryText: "Today I successfully took all my medications on time and felt really good about it.",
      category: 'medication',
      mood: 'good',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      entryText: "Struggled with my diet today. Had fast food for lunch but made a healthy dinner.",
      category: 'diet',
      mood: 'challenging',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    }
  ];

  const filteredEntries = category ? 
    mockEntries.filter(entry => entry.category === category) : 
    mockEntries;

  return {
    entries: filteredEntries,
    summary: {
      totalEntries: filteredEntries.length,
      categoryBreakdown: generateCategoryBreakdown(filteredEntries),
      moodTrends: generateMoodTrends(filteredEntries),
      cpdProgress: analyzeCPDProgressFromEntries(filteredEntries, context.carePlanDirectives)
    },
    insights: generateJournalInsights(filteredEntries),
    encouragement: generateEncouragementFromEntries(filteredEntries)
  };
}

/**
 * Analyze patterns in journal entries
 */
async function analyzeJournalPatterns(userId: number, context: MCPContext, timePeriod?: string) {
  // Mock analysis - would analyze actual entries
  const patterns = {
    writingFrequency: {
      averageEntriesPerWeek: 3.5,
      trend: 'increasing',
      consistency: 'good'
    },
    emotionalPatterns: {
      dominantMood: 'good',
      moodVariability: 'moderate',
      positiveEntries: 65,
      challengingEntries: 35
    },
    topicFocus: {
      mostDiscussed: 'medication adherence',
      leastDiscussed: 'exercise motivation',
      emerging: 'emotional eating patterns'
    },
    cpdAlignment: {
      medicationMentions: 8,
      dietMentions: 5,
      exerciseMentions: 3,
      overallAlignment: 'good'
    }
  };

  return {
    patterns,
    cbtInsights: generatePatternCBTInsights(patterns),
    miReflections: generatePatternMIReflections(patterns),
    recommendations: generatePatternRecommendations(patterns, context.carePlanDirectives),
    growthAreas: identifyGrowthAreas(patterns),
    strengthAreas: identifyStrengthAreas(patterns)
  };
}

/**
 * Generate guided reflection prompts
 */
async function generateGuidedReflection(userId: number, context: MCPContext, category?: string) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId, 7);
  const avgScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + (m.medicationScore + m.dietScore + m.exerciseScore) / 3, 0) / recentMetrics.length : 0;

  const reflectionPrompts = generateCategorySpecificPrompts(category, context.carePlanDirectives, avgScore);

  return {
    guidedReflection: {
      category: category || 'general',
      prompts: reflectionPrompts,
      cbtFramework: generateCBTReflectionFramework(category),
      miTechniques: generateMIReflectionTechniques(category),
      scoringConnection: generateScoringConnectionPrompts(avgScore, category)
    },
    reflectionGoals: generateReflectionGoals(category, context.carePlanDirectives),
    writingTips: generateWritingTips(category),
    privacyAssurance: "Your journal entries are private and secure. Use this space for honest self-reflection."
  };
}

/**
 * Helper Functions
 */

function generateGuidedPrompts(category?: string, cpds?: any[]): string[] {
  const prompts = [];
  
  if (category === 'medication') {
    prompts.push("How did I feel about my medication routine today?");
    prompts.push("What helped me remember to take my medications?");
    prompts.push("Were there any challenges with my medication adherence?");
  } else if (category === 'diet') {
    prompts.push("What food choices am I proud of today?");
    prompts.push("How did my meals align with my care plan directives?");
    prompts.push("What emotions influenced my eating today?");
  } else if (category === 'exercise') {
    prompts.push("How did physical activity make me feel today?");
    prompts.push("What motivated me to be active (or what prevented me)?");
    prompts.push("How can I build on today's activity tomorrow?");
  } else {
    prompts.push("What am I grateful for in my health journey today?");
    prompts.push("What challenge did I overcome or progress did I make?");
    prompts.push("How can I support my health goals tomorrow?");
  }
  
  return prompts;
}

function analyzeCPDAlignment(entryText: string, cpds: any[]): any {
  const alignment = [];
  
  for (const cpd of cpds) {
    const category = cpd.category.toLowerCase();
    const directive = cpd.directive.toLowerCase();
    
    if (entryText.toLowerCase().includes(category) || 
        entryText.toLowerCase().includes(directive.split(' ')[0])) {
      alignment.push({
        category: cpd.category,
        mentioned: true,
        sentiment: analyzeTextSentiment(entryText)
      });
    }
  }
  
  return alignment;
}

function analyzeTextSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['good', 'great', 'excellent', 'proud', 'success', 'happy', 'better'];
  const negativeWords = ['difficult', 'struggle', 'hard', 'challenging', 'failed', 'worried'];
  
  const textLower = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function generateCBTInsightsFromEntry(entryText: string, category?: string): string[] {
  const insights = [];
  const sentiment = analyzeTextSentiment(entryText);
  
  if (sentiment === 'negative') {
    insights.push("Notice any 'all or nothing' thinking patterns in your entry");
    insights.push("Consider what evidence supports or challenges negative thoughts");
    insights.push("Reframe setbacks as learning opportunities rather than failures");
  } else if (sentiment === 'positive') {
    insights.push("Recognize this positive experience as evidence of your capability");
    insights.push("Consider what specific actions contributed to this success");
    insights.push("How can you replicate these positive patterns?");
  }
  
  insights.push("Journaling helps increase awareness of thoughts and behaviors");
  
  return insights;
}

function generateReflectionPrompts(entryText: string, category?: string, cpds?: any[]): string[] {
  const prompts = [];
  
  prompts.push("What emotions am I experiencing as I write this?");
  prompts.push("What patterns do I notice in my thoughts or behaviors?");
  prompts.push("How does this experience connect to my health goals?");
  
  if (cpds && cpds.length > 0) {
    prompts.push("How does this relate to my care plan directives?");
  }
  
  return prompts;
}

function generateEmotionalAwareness(entryText: string, mood?: string): any {
  return {
    identifiedMood: mood || 'neutral',
    emotionalThemes: extractEmotionalThemes(entryText),
    copingStrategies: generateCopingStrategies(mood),
    emotionalGrowth: "Regular journaling builds emotional intelligence and self-awareness"
  };
}

function extractEmotionalThemes(text: string): string[] {
  const themes = [];
  const textLower = text.toLowerCase();
  
  if (textLower.includes('stress') || textLower.includes('anxious')) {
    themes.push('stress management');
  }
  if (textLower.includes('proud') || textLower.includes('accomplish')) {
    themes.push('achievement and pride');
  }
  if (textLower.includes('frustrated') || textLower.includes('difficult')) {
    themes.push('frustration and challenges');
  }
  
  return themes.length > 0 ? themes : ['general reflection'];
}

function generateCopingStrategies(mood?: string): string[] {
  if (mood === 'challenging' || mood === 'difficult') {
    return [
      "Practice deep breathing or mindfulness",
      "Reach out to your support network",
      "Focus on small, achievable steps",
      "Remember that difficult days are temporary"
    ];
  } else if (mood === 'excellent' || mood === 'good') {
    return [
      "Acknowledge and celebrate this positive experience",
      "Consider what contributed to feeling good",
      "Use this momentum for tomorrow's goals",
      "Share your success with supportive people"
    ];
  }
  
  return [
    "Continue regular self-reflection through journaling",
    "Notice patterns in your thoughts and feelings",
    "Be patient and kind with yourself"
  ];
}

function generateNextStepsFromEntry(entryText: string, category?: string, cpds?: any[]): string[] {
  const steps = [];
  const sentiment = analyzeTextSentiment(entryText);
  
  if (sentiment === 'negative') {
    steps.push("Identify one small action to improve tomorrow");
    steps.push("Consider what support or resources might help");
  } else if (sentiment === 'positive') {
    steps.push("Plan how to maintain this positive momentum");
    steps.push("Consider sharing this success with your healthcare team");
  }
  
  steps.push("Continue regular journaling to track patterns");
  
  return steps;
}

function generateCategoryBreakdown(entries: any[]): any {
  const breakdown: any = {};
  
  entries.forEach(entry => {
    breakdown[entry.category] = (breakdown[entry.category] || 0) + 1;
  });
  
  return breakdown;
}

function generateMoodTrends(entries: any[]): any {
  const moodCounts: any = {};
  
  entries.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });
  
  return {
    distribution: moodCounts,
    trend: 'stable', // Would calculate actual trend
    predominantMood: Object.entries(moodCounts).reduce((a, b) => moodCounts[a[0]] > moodCounts[b[0]] ? a : b)[0]
  };
}

function analyzeCPDProgressFromEntries(entries: any[], cpds: any[]): any {
  return {
    medicationMentions: entries.filter(e => e.category === 'medication').length,
    dietMentions: entries.filter(e => e.category === 'diet').length,
    exerciseMentions: entries.filter(e => e.category === 'exercise').length,
    overallEngagement: 'active'
  };
}

function generateJournalInsights(entries: any[]): string[] {
  return [
    "Your journaling shows consistent self-reflection and awareness",
    "You're actively engaging with your health journey through writing",
    "Regular journaling can help identify patterns and track progress"
  ];
}

function generateEncouragementFromEntries(entries: any[]): string {
  return "Your commitment to journaling shows dedication to understanding and improving your health journey. Keep reflecting and growing!";
}

function generatePatternCBTInsights(patterns: any): string[] {
  return [
    "Your writing patterns show increasing self-awareness over time",
    "Notice how journaling helps identify thought patterns and behaviors",
    "Use your journal insights to challenge unhelpful thinking patterns"
  ];
}

function generatePatternMIReflections(patterns: any): string[] {
  return [
    "What themes do you notice emerging in your journal entries?",
    "How has your relationship with your health goals changed through journaling?",
    "What insights from your writing surprise you most?"
  ];
}

function generatePatternRecommendations(patterns: any, cpds: any[]): string[] {
  const recommendations = [];
  
  if (patterns.emotionalPatterns.challengingEntries > 50) {
    recommendations.push("Consider focusing on coping strategies and emotional support");
  }
  
  if (patterns.cpdAlignment.exerciseMentions < 3) {
    recommendations.push("Try writing more about your physical activity experiences");
  }
  
  recommendations.push("Continue regular journaling to maintain self-awareness");
  
  return recommendations;
}

function identifyGrowthAreas(patterns: any): string[] {
  return [
    "Emotional regulation during challenging times",
    "Connecting daily experiences to long-term health goals",
    "Building self-compassion in your writing"
  ];
}

function identifyStrengthAreas(patterns: any): string[] {
  return [
    "Consistent journaling habit",
    "Honest self-reflection",
    "Connecting experiences to health directives"
  ];
}

function generateCategorySpecificPrompts(category?: string, cpds?: any[], avgScore?: number): string[] {
  const prompts = [];
  
  if (category === 'medication') {
    prompts.push("Reflect on your medication routine and any challenges you've faced");
    prompts.push("How do you feel when you successfully take your medications as prescribed?");
    prompts.push("What strategies help you maintain medication adherence?");
  } else if (category === 'emotional') {
    prompts.push("What emotions have been present in your health journey lately?");
    prompts.push("How do your feelings impact your health choices?");
    prompts.push("What emotional support do you need right now?");
  } else {
    prompts.push("What aspect of your health journey do you want to explore today?");
    prompts.push("How have you grown or changed through your health tracking?");
    prompts.push("What are you most grateful for in your health journey?");
  }
  
  return prompts;
}

function generateCBTReflectionFramework(category?: string): any {
  return {
    thoughtAwareness: "Notice your thoughts without judgment",
    evidenceExamination: "What evidence supports or challenges these thoughts?",
    behaviorConnection: "How do your thoughts influence your health behaviors?",
    reframing: "How might you view this situation differently?"
  };
}

function generateMIReflectionTechniques(category?: string): any {
  return {
    exploration: "What matters most to you about your health?",
    ambivalence: "What part of you wants to change? What part resists?",
    values: "How do your health choices align with your deeper values?",
    confidence: "What gives you confidence in your ability to succeed?"
  };
}

function generateScoringConnectionPrompts(avgScore: number, category?: string): string[] {
  const prompts = [];
  
  if (avgScore >= 8) {
    prompts.push("How does achieving high scores make you feel?");
    prompts.push("What contributes to your success in maintaining good scores?");
  } else if (avgScore < 6) {
    prompts.push("What challenges affect your daily scores?");
    prompts.push("How can journaling help you understand your scoring patterns?");
  } else {
    prompts.push("What would help you move from good scores to excellent scores?");
  }
  
  return prompts;
}

function generateReflectionGoals(category?: string, cpds?: any[]): string[] {
  return [
    "Increase self-awareness through regular writing",
    "Identify patterns that support or hinder health goals",
    "Process emotions related to health journey",
    "Track progress and celebrate growth over time"
  ];
}

function generateWritingTips(category?: string): string[] {
  return [
    "Write honestly without censoring yourself",
    "Focus on your feelings and experiences, not just facts",
    "Don't worry about grammar or perfect writing",
    "Set aside 10-15 minutes of uninterrupted time",
    "Consider writing at the same time each day to build the habit"
  ];
}