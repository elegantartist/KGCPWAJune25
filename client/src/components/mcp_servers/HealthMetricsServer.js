/**
 * Health Metrics Server - Specialist Chef for Health Score Analysis
 * 
 * This server handles all health metrics analysis, providing CBT and MI
 * insights focused on achieving 8-10 scores through CPD compliance.
 */

import { apiRequest } from '@/lib/queryClient';

class HealthMetricsServer {
  constructor() {
    this.name = 'HealthMetricsServer';
    this.description = 'Analyzes health scores with CBT/MI techniques for CPD compliance';
  }

  /**
   * Execute health metrics analysis with CPD-driven insights
   * @param {string} argument - Raw user input about health scores
   * @param {object} context - User context including current scores, CPDs, prime directive
   * @returns {Promise<string>} - Formatted health analysis
   */
  async execute(argument, context = {}) {
    console.log(`[HealthMetricsServer] Processing: "${argument}" with CPD guidance:`, context.cpdGuidance);
    
    try {
      // Extract what type of analysis is needed
      const analysisType = await this.determineAnalysisType(argument);
      
      // Get user's health data
      const healthData = await this.getHealthData(context.userId);
      
      // Perform CPD-driven analysis based on prime directive
      switch (analysisType) {
        case 'current_scores':
          return this.analyzeCPDCompliance(healthData, context);
        case 'trends':
          return this.analyzeProgressToward8to10(healthData, context);
        case 'cpd_compliance':
          return this.generateCPDComplianceReport(healthData, context);
        case 'motivation':
          return this.generateCBTMIMotivation(healthData, context);
        default:
          return this.generateComprehensiveCPDAnalysis(healthData, context);
      }
      
    } catch (error) {
      console.error('[HealthMetricsServer] Error:', error);
      return "I'm having trouble accessing your health data right now. Your consistent tracking is valuable - please try again in a moment.";
    }
  }

  /**
   * Determine analysis type from user request
   */
  async determineAnalysisType(argument) {
    const argLower = argument.toLowerCase();
    
    if (argLower.includes('current') || argLower.includes('today') || argLower.includes('latest')) {
      return 'current_scores';
    }
    if (argLower.includes('trend') || argLower.includes('progress') || argLower.includes('improve')) {
      return 'trends';
    }
    if (argLower.includes('care plan') || argLower.includes('directive') || argLower.includes('compliance')) {
      return 'cpd_compliance';
    }
    if (argLower.includes('motivat') || argLower.includes('encourage') || argLower.includes('help')) {
      return 'motivation';
    }
    
    return 'comprehensive';
  }

  /**
   * Get user's health data from the backend
   */
  async getHealthData(userId) {
    try {
      const response = await apiRequest(`/api/health-metrics/latest?userId=${userId}`);
      return response.result || {};
    } catch (error) {
      console.error('[HealthMetricsServer] Failed to get health data:', error);
      return {};
    }
  }

  /**
   * CPD Compliance Analysis - Core Prime Directive Function
   */
  analyzeCPDCompliance(healthData, context) {
    const scores = healthData.currentScores || {};
    const { medicationScore = 0, dietScore = 0, exerciseScore = 0 } = scores;
    const cpds = context.carePlanDirectives || [];

    let analysis = `**Your Health Scores & Care Plan Compliance** 📊\n\n`;
    
    // Score presentation with CPD context
    analysis += this.formatScoresWithCPDContext(scores, cpds);
    
    // CPD-specific compliance analysis
    analysis += this.generateCPDSpecificInsights(scores, cpds, context);
    
    // Path to 8-10 scoring
    analysis += this.generatePathTo8to10(scores, cpds, context);

    return analysis;
  }

  /**
   * Format scores with Care Plan Directive context
   */
  formatScoresWithCPDContext(scores, cpds) {
    const { medicationScore = 0, dietScore = 0, exerciseScore = 0 } = scores;
    
    let formatted = `**Current Scores**:\n`;
    formatted += `💊 Medication: ${medicationScore}/10`;
    if (this.hasCPDForCategory('medication', cpds)) {
      formatted += ` ${this.getComplianceIndicator(medicationScore)}`;
    }
    formatted += `\n`;
    
    formatted += `🥗 Diet: ${dietScore}/10`;
    if (this.hasCPDForCategory('diet', cpds)) {
      formatted += ` ${this.getComplianceIndicator(dietScore)}`;
    }
    formatted += `\n`;
    
    formatted += `🏃 Exercise: ${exerciseScore}/10`;
    if (this.hasCPDForCategory('exercise', cpds)) {
      formatted += ` ${this.getComplianceIndicator(exerciseScore)}`;
    }
    formatted += `\n\n`;

    const averageScore = (medicationScore + dietScore + exerciseScore) / 3;
    formatted += `📈 Overall Average: ${averageScore.toFixed(1)}/10\n\n`;

    return formatted;
  }

  /**
   * Generate CPD-specific insights for each category
   */
  generateCPDSpecificInsights(scores, cpds, context) {
    if (cpds.length === 0) {
      return `**Care Plan Status**: No active Care Plan Directives found. Contact your doctor to establish personalized health directives.\n\n`;
    }

    let insights = `**Care Plan Directive Analysis**:\n`;

    cpds.forEach(cpd => {
      const categoryScore = this.getCategoryScore(cpd.category, scores);
      const compliance = this.getComplianceLevel(categoryScore);
      
      insights += `\n**${cpd.category.toUpperCase()}** (Score: ${categoryScore}/10)\n`;
      insights += `Directive: "${cpd.directive}"\n`;
      insights += `Compliance: ${compliance}\n`;
      
      if (categoryScore < 8) {
        insights += this.generateCBTMIGuidance(cpd.category, categoryScore, context);
      } else {
        insights += `✅ Excellent compliance! You're successfully following this directive.\n`;
      }
    });

    return insights + '\n';
  }

  /**
   * Generate CBT/MI guidance for specific categories
   */
  generateCBTMIGuidance(category, score, context) {
    const approach = context.cpdGuidance?.cbt_mi_approach || 'both';
    let guidance = '';

    if (approach.includes('cognitive_behavioral_therapy') || approach === 'both') {
      guidance += `🧠 **CBT Insight**: ${this.getCBTReframe(category, score)}\n`;
    }

    if (approach.includes('motivational_interviewing') || approach === 'both') {
      guidance += `💭 **MI Question**: ${this.getMIQuestion(category, score)}\n`;
    }

    return guidance;
  }

  /**
   * Generate path to achieving 8-10 scores
   */
  generatePathTo8to10(scores, cpds, context) {
    const { medicationScore = 0, dietScore = 0, exerciseScore = 0 } = scores;
    const scoresBelow8 = [
      { category: 'medication', score: medicationScore },
      { category: 'diet', score: dietScore },
      { category: 'exercise', score: exerciseScore }
    ].filter(item => item.score < 8);

    if (scoresBelow8.length === 0) {
      return `🌟 **Outstanding Achievement**: All your scores are 8-10! You're demonstrating excellent care plan compliance and health commitment.\n\n` +
             `**Maintenance Strategy**: Continue with the habits that are working. Your consistency proves you can maintain excellent health scores.\n`;
    }

    let pathGuidance = `🎯 **Your Path to 8-10 Scores**:\n\n`;
    
    pathGuidance += `**Focus Areas** (${scoresBelow8.length} categories need attention):\n`;
    scoresBelow8.forEach(item => {
      const relevantCPD = cpds.find(cpd => cpd.category.toLowerCase().includes(item.category));
      pathGuidance += `• ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}: ${item.score}/10 → Target: 8-10\n`;
      if (relevantCPD) {
        pathGuidance += `  Focus: "${relevantCPD.directive}"\n`;
      }
      pathGuidance += `  ${this.getSpecificActionStep(item.category, item.score)}\n\n`;
    });

    pathGuidance += `**Prime Directive Reminder**: Honest 8-10 scores indicate you're successfully managing your health according to your doctor's care plan.\n`;

    return pathGuidance;
  }

  /**
   * Helper methods for CPD integration
   */
  hasCPDForCategory(category, cpds) {
    return cpds.some(cpd => cpd.category.toLowerCase().includes(category));
  }

  getComplianceIndicator(score) {
    if (score >= 8) return '✅ Excellent';
    if (score >= 6) return '⚠️ Improving';
    return '🔄 Needs Focus';
  }

  getComplianceLevel(score) {
    if (score >= 8) return 'Excellent Compliance';
    if (score >= 6) return 'Good Progress';
    if (score >= 4) return 'Developing Habits';
    return 'Building Foundation';
  }

  getCategoryScore(category, scores) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('medication')) return scores.medicationScore || 0;
    if (categoryLower.includes('diet') || categoryLower.includes('nutrition')) return scores.dietScore || 0;
    if (categoryLower.includes('exercise') || categoryLower.includes('physical')) return scores.exerciseScore || 0;
    return 0;
  }

  getCBTReframe(category, score) {
    const reframes = {
      medication: score < 4 ? 
        'Instead of "I keep forgetting my medication," try "I\'m building a routine that supports my health."' :
        'Your medication routine is developing. Each day you take it is progress toward better health.',
      diet: score < 4 ?
        'Replace "I can\'t stick to healthy eating" with "I\'m learning what foods make me feel my best."' :
        'Your nutrition choices are improving. Focus on progress, not perfection.',
      exercise: score < 4 ?
        'Change "I hate exercising" to "I\'m finding activities that energize me."' :
        'Your activity level is building. Movement is medicine for your body and mind.'
    };
    return reframes[category] || 'You\'re making progress in building healthy habits.';
  }

  getMIQuestion(category, score) {
    const questions = {
      medication: score < 6 ?
        'What would help you feel more confident about taking your medication consistently?' :
        'What\'s working well with your current medication routine?',
      diet: score < 6 ?
        'What kind of eating pattern would feel sustainable and enjoyable for you?' :
        'Which healthy foods have you been enjoying most lately?',
      exercise: score < 6 ?
        'What type of physical activity has brought you joy in the past?' :
        'How do you feel after being active?'
    };
    return questions[category] || 'What small change would feel most achievable for you right now?';
  }

  getSpecificActionStep(category, score) {
    const steps = {
      medication: 'Set phone reminders or link taking medication to an existing daily habit',
      diet: 'Choose one meal to align more closely with your care plan directive',
      exercise: 'Start with 10-15 minutes of activity you actually enjoy'
    };
    return steps[category] || 'Take one small step that feels manageable today';
  }

  /**
   * Other analysis methods (trends, motivation, etc.)
   */
  analyzeProgressToward8to10(healthData, context) {
    return this.analyzeCPDCompliance(healthData, context);
  }

  generateCPDComplianceReport(healthData, context) {
    return this.analyzeCPDCompliance(healthData, context);
  }

  generateCBTMIMotivation(healthData, context) {
    return this.analyzeCPDCompliance(healthData, context);
  }

  generateComprehensiveCPDAnalysis(healthData, context) {
    return this.analyzeCPDCompliance(healthData, context);
  }
}

export default new HealthMetricsServer();