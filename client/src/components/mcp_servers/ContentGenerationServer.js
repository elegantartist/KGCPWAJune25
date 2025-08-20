/**
 * Content Generation Server - Specialist Chef for Health Content
 * 
 * This server handles content generation requests that don't fit other tools,
 * with strong focus on CPD compliance and motivational content.
 */

import { apiRequest } from '@/lib/queryClient';

class ContentGenerationServer {
  constructor() {
    this.name = 'ContentGenerationServer';
    this.description = 'Generates motivational and educational health content';
  }

  /**
   * Execute content generation with CPD alignment
   * @param {string} argument - Raw user content request
   * @param {object} context - User context including CPDs, scores
   * @returns {Promise<string>} - Generated content
   */
  async execute(argument, context = {}) {
    console.log(`[ContentGenerationServer] Processing: "${argument}"`);
    
    try {
      const contentType = this.determineContentType(argument);
      
      switch (contentType) {
        case 'motivation':
          return this.generateMotivationalContent(argument, context);
        case 'education':
          return this.generateEducationalContent(argument, context);
        case 'cpd_reminder':
          return this.generateCPDReminder(argument, context);
        case 'progress_celebration':
          return this.generateProgressCelebration(argument, context);
        default:
          return this.generateGeneralHealthContent(argument, context);
      }
      
    } catch (error) {
      console.error('[ContentGenerationServer] Error:', error);
      return "I encountered an issue generating that content. Your health journey matters - please try rephrasing your request.";
    }
  }

  /**
   * Determine what type of content to generate
   */
  determineContentType(argument) {
    const argLower = argument.toLowerCase();
    
    if (argLower.includes('motivat') || argLower.includes('encourage') || argLower.includes('inspire')) {
      return 'motivation';
    }
    if (argLower.includes('learn') || argLower.includes('explain') || argLower.includes('understand')) {
      return 'education';
    }
    if (argLower.includes('care plan') || argLower.includes('directive') || argLower.includes('remind')) {
      return 'cpd_reminder';
    }
    if (argLower.includes('progress') || argLower.includes('achievement') || argLower.includes('success')) {
      return 'progress_celebration';
    }
    
    return 'general';
  }

  /**
   * Generate motivational content with CBT/MI techniques
   */
  async generateMotivationalContent(argument, context) {
    const scores = context.healthMetrics || {};
    const cpds = context.carePlanDirectives || [];
    const approach = context.cpdGuidance?.cbt_mi_approach || 'both';

    let content = `**Your Health Journey Motivation** 🌟\n\n`;

    // Personal motivation based on current state
    const averageScore = this.calculateAverageScore(scores);
    
    if (averageScore >= 8) {
      content += `You're achieving excellent health scores (${averageScore.toFixed(1)}/10)! Your commitment to your care plan is truly inspiring.\n\n`;
      content += `**Strength Recognition**: You've proven you can maintain outstanding health habits consistently.\n\n`;
    } else if (averageScore >= 6) {
      content += `You're making solid progress (${averageScore.toFixed(1)}/10) on your health journey. Every day you engage with your care plan is meaningful.\n\n`;
      content += `**Growth Mindset**: You're building the skills and habits that will serve you for life.\n\n`;
    } else {
      content += `Every step you take in tracking and improving your health is valuable. Your awareness and engagement are the foundation of positive change.\n\n`;
      content += `**Starting Strong**: Beginning this journey shows courage and commitment to your wellbeing.\n\n`;
    }

    // CPD-specific motivation
    if (cpds.length > 0) {
      content += `**Care Plan Connection**:\n`;
      cpds.forEach(cpd => {
        const categoryScore = this.getCategoryScore(cpd.category, scores);
        content += `• ${cpd.category}: "${cpd.directive}" (Current: ${categoryScore}/10)\n`;
      });
      content += '\n';
    }

    // CBT/MI techniques
    if (approach.includes('cognitive_behavioral_therapy') || approach === 'both') {
      content += `**CBT Affirmations**:\n`;
      content += `• I am capable of making healthy choices consistently\n`;
      content += `• Each healthy decision builds my confidence and wellbeing\n`;
      content += `• I have the power to create positive change in my health\n\n`;
    }

    if (approach.includes('motivational_interviewing') || approach === 'both') {
      content += `**Reflection Questions**:\n`;
      content += `• What aspect of your health journey makes you feel most proud?\n`;
      content += `• How do you want to feel about your health habits one month from now?\n`;
      content += `• What would achieving consistent 8-10 scores mean to you?\n\n`;
    }

    content += `**Remember**: Your goal is honest 8-10 scores across all categories. This shows you're successfully following your care plan and taking excellent care of your health.`;

    return content;
  }

  /**
   * Generate educational content aligned with CPDs
   */
  async generateEducationalContent(argument, context) {
    const cpds = context.carePlanDirectives || [];
    
    let content = `**Health Education** 📚\n\n`;

    if (argument.toLowerCase().includes('care plan') || argument.toLowerCase().includes('directive')) {
      content += `**Understanding Care Plan Directives**:\n\n`;
      content += `Care Plan Directives are specific health instructions created by your doctor based on your individual needs. They guide your daily health choices and help you achieve optimal wellbeing.\n\n`;
      
      if (cpds.length > 0) {
        content += `**Your Current Directives**:\n`;
        cpds.forEach(cpd => {
          content += `• **${cpd.category}**: ${cpd.directive}\n`;
        });
        content += '\n';
        content += `**Following Your CPDs**: Achieving 8-10 scores in each category means you're successfully implementing your doctor's guidance.\n\n`;
      } else {
        content += `**Next Steps**: Contact your doctor to establish personalized Care Plan Directives that will guide your health journey.\n\n`;
      }
    }

    if (argument.toLowerCase().includes('score') || argument.toLowerCase().includes('8-10')) {
      content += `**Understanding 8-10 Health Scores**:\n\n`;
      content += `• **8-9/10**: Excellent compliance with your care plan - you're consistently following your doctor's guidance\n`;
      content += `• **10/10**: Outstanding adherence - you're exceeding expectations in that health category\n`;
      content += `• **Honesty**: Accurate scoring helps your doctor understand your progress and adjust care as needed\n\n`;
      content += `**The Goal**: Consistent 8-10 scores across diet, exercise, and medication show you're managing your health excellently according to your care plan.\n\n`;
    }

    content += `**Remember**: This app is a Class 1 Software as a Medical Device designed to support your doctor's care plan, not replace medical advice.`;

    return content;
  }

  /**
   * Generate CPD reminder content
   */
  async generateCPDReminder(argument, context) {
    const cpds = context.carePlanDirectives || [];
    
    if (cpds.length === 0) {
      return `**Care Plan Status**: You don't have any active Care Plan Directives yet. Consider discussing your health goals with your doctor during your next appointment to establish personalized guidance.`;
    }

    let content = `**Your Care Plan Directive Reminders** 📋\n\n`;
    
    cpds.forEach((cpd, index) => {
      const categoryScore = this.getCategoryScore(cpd.category, context.healthMetrics || {});
      content += `**${index + 1}. ${cpd.category.toUpperCase()}**\n`;
      content += `Directive: "${cpd.directive}"\n`;
      content += `Current Score: ${categoryScore}/10\n`;
      content += `Status: ${this.getComplianceStatus(categoryScore)}\n\n`;
    });

    content += `**Daily Focus**: Each directive is designed to help you achieve optimal health. Aim for honest 8-10 scores to show you're successfully following your doctor's guidance.\n\n`;
    content += `**Need Support?**: Use the KGC features that align with each directive to build sustainable healthy habits.`;

    return content;
  }

  /**
   * Generate progress celebration content
   */
  async generateProgressCelebration(argument, context) {
    const scores = context.healthMetrics || {};
    const cpds = context.carePlanDirectives || [];
    
    let content = `**Celebrating Your Health Progress** 🎉\n\n`;

    const highScores = this.getHighScores(scores);
    const improvements = this.getImprovements(scores); // Would need historical data

    if (highScores.length > 0) {
      content += `**Excellent Achievements**:\n`;
      highScores.forEach(category => {
        content += `• ${category.name}: ${category.score}/10 - Outstanding compliance!\n`;
      });
      content += '\n';
    }

    if (cpds.length > 0) {
      content += `**Care Plan Success**:\n`;
      const successfulCPDs = cpds.filter(cpd => {
        const score = this.getCategoryScore(cpd.category, scores);
        return score >= 8;
      });

      if (successfulCPDs.length > 0) {
        content += `You're successfully following ${successfulCPDs.length} out of ${cpds.length} Care Plan Directives:\n`;
        successfulCPDs.forEach(cpd => {
          content += `• ${cpd.category}: "${cpd.directive}"\n`;
        });
        content += '\n';
      }
    }

    content += `**Keep Building**: Every healthy choice you make strengthens your commitment to your wellbeing. Your consistency in following your care plan is creating lasting positive change.\n\n`;
    content += `**Next Steps**: Continue the habits that are working and focus on areas where you can reach that 8-10 range.`;

    return content;
  }

  /**
   * Generate general health content
   */
  async generateGeneralHealthContent(argument, context) {
    return this.generateMotivationalContent(argument, context);
  }

  /**
   * Helper methods
   */
  calculateAverageScore(scores) {
    const validScores = [
      scores.medicationScore || 0,
      scores.dietScore || 0,
      scores.exerciseScore || 0
    ].filter(score => score > 0);
    
    return validScores.length > 0 ? validScores.reduce((a, b) => a + b) / validScores.length : 0;
  }

  getCategoryScore(category, scores) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('medication')) return scores.medicationScore || 0;
    if (categoryLower.includes('diet') || categoryLower.includes('nutrition')) return scores.dietScore || 0;
    if (categoryLower.includes('exercise') || categoryLower.includes('physical')) return scores.exerciseScore || 0;
    return 0;
  }

  getComplianceStatus(score) {
    if (score >= 8) return 'Excellent compliance';
    if (score >= 6) return 'Good progress';
    if (score >= 4) return 'Building habits';
    return 'Needs focus';
  }

  getHighScores(scores) {
    const categories = [
      { name: 'Medication', score: scores.medicationScore || 0 },
      { name: 'Diet', score: scores.dietScore || 0 },
      { name: 'Exercise', score: scores.exerciseScore || 0 }
    ];
    
    return categories.filter(cat => cat.score >= 8);
  }

  getImprovements(scores) {
    // Would need historical data to determine improvements
    // For now, return empty array
    return [];
  }
}

export default new ContentGenerationServer();