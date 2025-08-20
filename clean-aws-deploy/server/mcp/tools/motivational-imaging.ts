/**
 * Motivational Imaging MCP Tool
 * 
 * Provides motivational image processing and enhancement capabilities
 * integrated with the "Keep Going" button and patient motivation system.
 */

import { z } from 'zod';
import { MCPTool, MCPContext } from '../core/MCPServer';
import { storage } from '../../storage';
import { auditLogger } from '../../auditLogger';

// Input schema for Motivational Imaging tool
const motivationalImagingInputSchema = z.object({
  userId: z.number(),
  action: z.enum(['upload_image', 'get_images', 'enhance_image', 'generate_motivation']),
  imageId: z.number().optional(),
  imageData: z.string().optional(),
  motivationalTheme: z.enum(['health', 'fitness', 'nutrition', 'recovery', 'achievement']).optional(),
  personalMessage: z.string().optional()
});

/**
 * Motivational Imaging Tool Implementation
 */
export const motivationalImagingTool: MCPTool = {
  name: 'motivational-imaging',
  description: 'Motivational image processing and enhancement integrated with Keep Going button and patient motivation',
  inputSchema: motivationalImagingInputSchema,
  handler: async (params: z.infer<typeof motivationalImagingInputSchema>, context: MCPContext) => {
    const { userId, action, imageId, imageData, motivationalTheme, personalMessage } = params;

    // Ensure user can only access their own data
    if (context.userRole === 'patient' && context.userId !== userId) {
      throw new Error('Access denied: Cannot access other patient\'s motivational images');
    }

    // Log the access for audit purposes
    await auditLogger.logDataAccess({
      userId: context.userId,
      accessedBy: context.userId,
      dataType: 'motivational_images',
      action: action === 'upload_image' ? 'write' : 'read',
      isAdminAccess: context.userRole === 'admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    try {
      switch (action) {
        case 'upload_image':
          return await uploadMotivationalImage(userId, context, imageData, motivationalTheme, personalMessage);
        
        case 'get_images':
          return await getMotivationalImages(userId, context);
        
        case 'enhance_image':
          return await enhanceMotivationalImage(userId, context, imageId, motivationalTheme);
        
        case 'generate_motivation':
          return await generateImageMotivation(userId, context, imageId, motivationalTheme);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[Motivational Imaging Tool] Error:', error);
      throw new Error(`Failed to process motivational imaging request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Upload and process a motivational image
 */
async function uploadMotivationalImage(userId: number, context: MCPContext, imageData?: string, motivationalTheme?: string, personalMessage?: string) {
  if (!imageData) {
    return {
      message: "Please provide image data to upload your motivational image.",
      uploadGuidelines: generateUploadGuidelines(),
      motivationalThemes: getAvailableThemes(),
      kgcFeatureSuggestions: [{
        feature: "Keep Going Button",
        reason: "Your uploaded image will be integrated with your daily motivation",
        urgency: "low"
      }]
    };
  }

  // Store motivational image (simplified - would use actual storage)
  const motivationalImage = {
    id: Date.now(),
    userId,
    imageData,
    theme: motivationalTheme || 'health',
    personalMessage: personalMessage || '',
    uploadedAt: new Date().toISOString(),
    enhancementLevel: 'basic'
  };

  // Generate motivational analysis of the image
  const imageAnalysis = analyzeMotivationalImage(imageData, motivationalTheme);
  
  // Create personalized motivational content
  const motivationalContent = generatePersonalizedMotivation(imageAnalysis, context.carePlanDirectives, personalMessage);

  return {
    success: true,
    imageId: motivationalImage.id,
    imageAnalysis,
    motivationalContent,
    integrationOptions: generateIntegrationOptions(motivationalImage),
    keepGoingIntegration: generateKeepGoingIntegration(motivationalImage, context.carePlanDirectives),
    nextSteps: [
      "Your image is now available in the Keep Going button",
      "Use the enhanced image for daily motivation",
      "Consider adding a personal message for deeper connection"
    ]
  };
}

/**
 * Get user's motivational images
 */
async function getMotivationalImages(userId: number, context: MCPContext) {
  // Mock motivational images - would retrieve from actual storage
  const mockImages = [
    {
      id: 1,
      theme: 'fitness',
      personalMessage: 'My goal body - staying strong and healthy',
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      enhancementLevel: 'enhanced',
      usageCount: 15
    },
    {
      id: 2,
      theme: 'achievement',
      personalMessage: 'Completing my first 5K run',
      uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      enhancementLevel: 'premium',
      usageCount: 8
    }
  ];

  return {
    images: mockImages,
    summary: {
      totalImages: mockImages.length,
      mostUsedTheme: 'fitness',
      totalMotivationalViews: mockImages.reduce((sum, img) => sum + img.usageCount, 0),
      recentActivity: "Active use of motivational images for daily inspiration"
    },
    insights: generateImageInsights(mockImages),
    recommendations: generateImageRecommendations(mockImages, context.carePlanDirectives),
    keepGoingStats: generateKeepGoingStats(mockImages)
  };
}

/**
 * Enhance a motivational image
 */
async function enhanceMotivationalImage(userId: number, context: MCPContext, imageId?: number, motivationalTheme?: string) {
  if (!imageId) {
    return {
      message: "Please specify an image ID to enhance.",
      availableImages: "Use get_images action to see your uploaded images"
    };
  }

  // Mock enhancement process
  const enhancementResult = {
    originalImageId: imageId,
    enhancedImageId: imageId + 1000,
    enhancementType: 'ai_optimization',
    improvements: [
      'Brightness and contrast optimization',
      'Motivational text overlay added',
      'Color enhancement for emotional impact',
      'Personal message integration'
    ],
    motivationalBoost: generateMotivationalBoost(motivationalTheme, context.carePlanDirectives)
  };

  return {
    enhancementResult,
    beforeAndAfter: {
      improvements: enhancementResult.improvements,
      emotionalImpact: 'Enhanced visual motivation and personal connection',
      keepGoingIntegration: 'Seamlessly integrated with your Keep Going button experience'
    },
    usageGuidance: generateEnhancedImageUsage(enhancementResult),
    cbtConnection: generateCBTImageConnection(motivationalTheme),
    miTechniques: generateMIImageTechniques(motivationalTheme)
  };
}

/**
 * Generate motivation based on image
 */
async function generateImageMotivation(userId: number, context: MCPContext, imageId?: number, motivationalTheme?: string) {
  const recentMetrics = await storage.getHealthMetricsForUser(userId, 7); // Last 7 days
  const avgScore = recentMetrics.length > 0 ? 
    recentMetrics.reduce((sum, m) => sum + (m.medicationScore + m.dietScore + m.exerciseScore) / 3, 0) / recentMetrics.length : 0;

  const imageMotivation = generateImageBasedMotivation(imageId, motivationalTheme, avgScore, context.carePlanDirectives);

  return {
    personalizedMotivation: imageMotivation,
    visualAffirmations: generateVisualAffirmations(motivationalTheme, context.carePlanDirectives),
    dailyReminders: generateDailyImageReminders(motivationalTheme),
    progressConnection: connectImageToProgress(avgScore, motivationalTheme),
    keepGoingMoments: generateKeepGoingMoments(imageMotivation),
    shareableQuotes: generateShareableQuotes(motivationalTheme, context.carePlanDirectives)
  };
}

/**
 * Helper Functions
 */

function generateUploadGuidelines(): string[] {
  return [
    "Choose images that inspire and motivate you personally",
    "Photos of your goals, achievements, or aspirations work well",
    "Family, nature, or fitness images can provide daily motivation",
    "Avoid images with negative associations or triggers",
    "Higher resolution images work best for enhancement features"
  ];
}

function getAvailableThemes(): any[] {
  return [
    {
      theme: 'health',
      description: 'General health and wellness motivation',
      examples: 'Healthy lifestyle images, medical success stories'
    },
    {
      theme: 'fitness',
      description: 'Exercise and physical activity motivation',
      examples: 'Workout goals, athletic achievements, active lifestyle'
    },
    {
      theme: 'nutrition',
      description: 'Healthy eating and nutrition goals',
      examples: 'Healthy meals, nutrition goals, cooking achievements'
    },
    {
      theme: 'recovery',
      description: 'Recovery and healing journey motivation',
      examples: 'Recovery milestones, healing progress, strength building'
    },
    {
      theme: 'achievement',
      description: 'Personal accomplishments and goal achievement',
      examples: 'Completed goals, celebrations, milestone moments'
    }
  ];
}

function analyzeMotivationalImage(imageData: string, motivationalTheme?: string): any {
  // Mock image analysis - would use actual computer vision
  return {
    theme: motivationalTheme || 'health',
    emotionalTone: 'positive',
    motivationalElements: [
      'Clear goal visualization',
      'Positive emotional association',
      'Personal relevance'
    ],
    suggestedEnhancements: [
      'Add personalized motivational text',
      'Optimize colors for emotional impact',
      'Include progress tracking elements'
    ],
    compatibilityScore: 9.2
  };
}

function generatePersonalizedMotivation(imageAnalysis: any, cpds: any[], personalMessage?: string): any {
  return {
    primaryMessage: personalMessage || "This image represents your commitment to your health goals",
    cpdConnection: connectImageToCPDs(imageAnalysis.theme, cpds),
    emotionalResonance: "Visual motivation creates powerful emotional connections to your goals",
    actionOriented: "Use this image daily to reinforce your commitment to positive health choices",
    progressReminder: "This image symbolizes where you're headed - every healthy choice brings you closer"
  };
}

function connectImageToCPDs(theme: string, cpds: any[]): string[] {
  const connections = [];
  
  for (const cpd of cpds) {
    const category = cpd.category.toLowerCase();
    
    if (theme === 'fitness' && category.includes('exercise')) {
      connections.push(`This fitness motivation supports your exercise directive: "${cpd.directive}"`);
    } else if (theme === 'nutrition' && category.includes('diet')) {
      connections.push(`This nutrition image aligns with your diet directive: "${cpd.directive}"`);
    } else if (theme === 'health' && category.includes('medication')) {
      connections.push(`This health motivation reinforces your medication directive: "${cpd.directive}"`);
    }
  }
  
  if (connections.length === 0) {
    connections.push("This motivational image supports your overall health and wellness journey");
  }
  
  return connections;
}

function generateIntegrationOptions(motivationalImage: any): any[] {
  return [
    {
      option: 'Keep Going Button',
      description: 'Display your image when you press the Keep Going button',
      benefit: 'Daily visual motivation and emotional connection'
    },
    {
      option: 'Dashboard Background',
      description: 'Use as a subtle background on your health dashboard',
      benefit: 'Constant gentle reminder of your goals'
    },
    {
      option: 'Achievement Celebration',
      description: 'Show when you achieve high health scores',
      benefit: 'Reinforce positive behaviors with personal motivation'
    },
    {
      option: 'Daily Check-in',
      description: 'Display during daily self-score submission',
      benefit: 'Connect scoring to your deeper motivations'
    }
  ];
}

function generateKeepGoingIntegration(motivationalImage: any, cpds: any[]): any {
  return {
    buttonBehavior: 'Image displays with personalized motivation when pressed',
    motivationalText: generateKeepGoingText(motivationalImage.theme, cpds),
    frequency: 'Available every time you need motivation throughout the day',
    emotionalImpact: 'Creates positive emotional association with health tracking',
    progressConnection: 'Links your visual goals to daily health choices'
  };
}

function generateKeepGoingText(theme: string, cpds: any[]): string {
  const relevantCPD = cpds.find(cpd => {
    const category = cpd.category.toLowerCase();
    return (theme === 'fitness' && category.includes('exercise')) ||
           (theme === 'nutrition' && category.includes('diet')) ||
           (theme === 'health' && category.includes('medication'));
  });

  if (relevantCPD) {
    return `Keep going! You're working toward your goal and following "${relevantCPD.directive}". Every step counts!`;
  }
  
  return "Keep going! This image represents your commitment to better health. You've got this!";
}

function generateImageInsights(images: any[]): string[] {
  return [
    "Your motivational images show strong commitment to health goals",
    "Regular use of visual motivation correlates with better health outcomes",
    "Personal images create stronger emotional connections than generic motivation"
  ];
}

function generateImageRecommendations(images: any[], cpds: any[]): string[] {
  const recommendations = [];
  
  if (images.length < 3) {
    recommendations.push("Consider uploading more images for variety in your daily motivation");
  }
  
  const themes = images.map(img => img.theme);
  if (!themes.includes('nutrition') && cpds.some(cpd => cpd.category.toLowerCase().includes('diet'))) {
    recommendations.push("Add nutrition-themed images to support your diet directive");
  }
  
  if (!themes.includes('fitness') && cpds.some(cpd => cpd.category.toLowerCase().includes('exercise'))) {
    recommendations.push("Include fitness images to reinforce your exercise goals");
  }
  
  recommendations.push("Update your personal messages to reflect your current goals");
  
  return recommendations;
}

function generateKeepGoingStats(images: any[]): any {
  const totalViews = images.reduce((sum, img) => sum + img.usageCount, 0);
  
  return {
    totalMotivationalViews: totalViews,
    averageViewsPerImage: Number((totalViews / images.length).toFixed(1)),
    mostInspiring: images.reduce((prev, current) => 
      prev.usageCount > current.usageCount ? prev : current
    ),
    motivationFrequency: 'High engagement with visual motivation tools'
  };
}

function generateMotivationalBoost(motivationalTheme?: string, cpds?: any[]): any {
  return {
    emotionalImpact: 'Enhanced visual appeal increases motivational effectiveness',
    personalConnection: 'AI optimization maintains your personal connection to the image',
    cpdAlignment: connectImageToCPDs(motivationalTheme || 'health', cpds || []),
    usageGuidance: 'Use enhanced image during challenging moments for maximum impact'
  };
}

function generateEnhancedImageUsage(enhancementResult: any): string[] {
  return [
    "Use your enhanced image as your primary Keep Going button motivation",
    "View the image when you need encouragement with health goals",
    "Set as your dashboard background for constant gentle motivation",
    "Share the enhanced version with family for accountability support"
  ];
}

function generateCBTImageConnection(motivationalTheme?: string): string[] {
  return [
    "Visual cues can help reframe negative thoughts about health challenges",
    "Your motivational image serves as evidence of your capability and goals",
    "Use the image to interrupt negative thought patterns",
    "Connect the visual motivation to behavioral change strategies"
  ];
}

function generateMIImageTechniques(motivationalTheme?: string): string[] {
  return [
    "What does this image represent about your deepest health values?",
    "How does viewing this image change your motivation to make healthy choices?",
    "What would achieving the goal in this image mean to you?",
    "How can this visual reminder support your commitment to change?"
  ];
}

function generateImageBasedMotivation(imageId?: number, motivationalTheme?: string, avgScore?: number, cpds?: any[]): any {
  let message = "Your motivational image reminds you of your health goals and the progress you're making.";
  
  if (avgScore && avgScore >= 8) {
    message = "Your excellent health scores show you're living up to the goals in your motivational image!";
  } else if (avgScore && avgScore < 6) {
    message = "Your motivational image reminds you why you started this journey - every step forward matters.";
  }
  
  return {
    mainMessage: message,
    imageConnection: "This visual reminder connects you to your deeper motivation",
    actionableStep: "Use this motivation to guide today's health choices",
    progressAffirmation: "You have the strength and capability shown in your chosen image"
  };
}

function generateVisualAffirmations(motivationalTheme?: string, cpds?: any[]): string[] {
  const affirmations = [
    "I am becoming the person I see in my motivational image",
    "Every healthy choice brings me closer to my visual goals",
    "I carry the strength and motivation of my image with me daily"
  ];
  
  if (motivationalTheme === 'fitness') {
    affirmations.push("My body is capable of amazing strength and endurance");
  } else if (motivationalTheme === 'nutrition') {
    affirmations.push("I nourish my body with choices that support my goals");
  }
  
  return affirmations;
}

function generateDailyImageReminders(motivationalTheme?: string): string[] {
  return [
    "Start your day by viewing your motivational image",
    "Use the image for inspiration during challenging moments",
    "End your day reflecting on progress toward your image goals",
    "Press the Keep Going button when you need visual motivation"
  ];
}

function connectImageToProgress(avgScore: number, motivationalTheme?: string): string {
  if (avgScore >= 8) {
    return "Your high health scores show you're successfully working toward the goals in your image";
  } else if (avgScore >= 6) {
    return "Your steady progress aligns with the journey toward your image goals";
  } else {
    return "Your image represents the destination - every healthy choice is a step in that direction";
  }
}

function generateKeepGoingMoments(imageMotivation: any): string[] {
  return [
    "When you feel unmotivated, press Keep Going to see your inspiring image",
    "Before making health choices, visualize your image goals",
    "Use your image as a reward for completing healthy actions",
    "Share your image motivation with supportive family and friends"
  ];
}

function generateShareableQuotes(motivationalTheme?: string, cpds?: any[]): string[] {
  return [
    "Every healthy choice is a step toward the person I'm becoming",
    "My goals are not just dreams - they're my daily motivation",
    "I carry my inspiration with me in every health decision",
    "Visual motivation transforms abstract goals into concrete daily actions"
  ];
}