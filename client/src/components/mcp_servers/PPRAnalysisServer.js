/**
 * PPR Analysis Server - Specialist Chef for Doctor Intelligence
 * 
 * This server handles Patient Progress Report generation for doctors,
 * analyzing all patient data to provide CPD update recommendations.
 */

import { apiRequest } from '@/lib/queryClient';

class PPRAnalysisServer {
  constructor() {
    this.name = 'PPRAnalysisServer';
    this.description = 'Generates comprehensive Patient Progress Reports for doctors with CPD recommendations';
  }

  /**
   * Execute PPR analysis for a specific patient
   * @param {string} argument - Doctor's request (e.g., "generate PPR for patient 123")
   * @param {object} context - Doctor context including patient ID, timeframe
   * @returns {Promise<string>} - Comprehensive PPR with CPD recommendations
   */
  async execute(argument, context = {}) {
    console.log(`[PPRAnalysisServer] Processing PPR request: "${argument}"`);
    
    try {
      // Extract patient ID and analysis parameters
      const analysisParams = await this.extractAnalysisParameters(argument, context);
      
      // Gather comprehensive patient data
      const patientData = await this.gatherPatientData(analysisParams.patientId, analysisParams.timeframe);
      
      // Perform multi-dimensional analysis
      const analysisResults = await this.performComprehensiveAnalysis(patientData, analysisParams);
      
      // Generate CPD recommendations
      const cpdRecommendations = await this.generateCPDRecommendations(analysisResults, patientData);
      
      // Format complete PPR for doctor
      return this.formatPPRForDoctor(analysisResults, cpdRecommendations, patientData);
      
    } catch (error) {
      console.error('[PPRAnalysisServer] Error:', error);
      return "Unable to generate Patient Progress Report at this time. Please verify patient access and try again.";
    }
  }

  /**
   * Extract analysis parameters from doctor's request
   */
  async extractAnalysisParameters(argument, context) {
    // Extract patient ID from argument or context
    const patientIdMatch = argument.match(/patient\s+(\d+)/i);
    const patientId = patientIdMatch ? parseInt(patientIdMatch[1]) : context.patientId;
    
    // Determine timeframe (default to last 30 days)
    const timeframeMatch = argument.match(/(\d+)\s+(day|week|month)s?/i);
    const timeframe = timeframeMatch ? {
      value: parseInt(timeframeMatch[1]),
      unit: timeframeMatch[2].toLowerCase()
    } : { value: 30, unit: 'day' };

    // Determine analysis focus
    const analysisType = this.determineAnalysisType(argument);

    return {
      patientId,
      timeframe,
      analysisType,
      requestingDoctorId: context.userId || context.doctorId
    };
  }

  /**
   * Determine what type of analysis the doctor wants
   */
  determineAnalysisType(argument) {
    const argLower = argument.toLowerCase();
    
    if (argLower.includes('compliance') || argLower.includes('adherence')) {
      return 'compliance_focus';
    }
    if (argLower.includes('trend') || argLower.includes('progress')) {
      return 'trend_analysis';
    }
    if (argLower.includes('cpd') || argLower.includes('directive') || argLower.includes('update')) {
      return 'cpd_optimization';
    }
    if (argLower.includes('sentiment') || argLower.includes('engagement')) {
      return 'engagement_analysis';
    }
    
    return 'comprehensive';
  }

  /**
   * Gather all relevant patient data for analysis
   */
  async gatherPatientData(patientId, timeframe) {
    try {
      const [
        patientInfo,
        healthScores,
        chatHistory,
        currentCPDs,
        featureUsage,
        previousPPRs
      ] = await Promise.allSettled([
        apiRequest(`/api/patients/${patientId}/profile`),
        apiRequest(`/api/patients/${patientId}/health-scores?timeframe=${timeframe.value}&unit=${timeframe.unit}`),
        apiRequest(`/api/patients/${patientId}/chat-history?timeframe=${timeframe.value}&unit=${timeframe.unit}`),
        apiRequest(`/api/patients/${patientId}/care-plan-directives/active`),
        apiRequest(`/api/patients/${patientId}/feature-usage?timeframe=${timeframe.value}&unit=${timeframe.unit}`),
        apiRequest(`/api/patients/${patientId}/progress-reports?limit=3`)
      ]);

      return {
        patient: patientInfo.status === 'fulfilled' ? patientInfo.value : {},
        healthScores: healthScores.status === 'fulfilled' ? healthScores.value : [],
        chatHistory: chatHistory.status === 'fulfilled' ? chatHistory.value : [],
        currentCPDs: currentCPDs.status === 'fulfilled' ? currentCPDs.value : [],
        featureUsage: featureUsage.status === 'fulfilled' ? featureUsage.value : [],
        previousPPRs: previousPPRs.status === 'fulfilled' ? previousPPRs.value : [],
        dataCompleteness: this.assessDataCompleteness([
          patientInfo, healthScores, chatHistory, currentCPDs, featureUsage
        ])
      };
    } catch (error) {
      console.error('[PPRAnalysisServer] Data gathering error:', error);
      throw new Error('Failed to gather patient data');
    }
  }

  /**
   * Perform comprehensive multi-dimensional analysis
   */
  async performComprehensiveAnalysis(patientData, params) {
    try {
      // Use AI to analyze the complete patient dataset
      const analysisResponse = await apiRequest('/api/ai/ppr-analysis', {
        method: 'POST',
        body: JSON.stringify({
          patientData,
          analysisType: params.analysisType,
          focusAreas: [
            'score_trends',
            'cpd_compliance',
            'engagement_patterns',
            'sentiment_analysis',
            'behavioral_insights'
          ]
        })
      });

      return analysisResponse.analysis || this.generateFallbackAnalysis(patientData);
    } catch (error) {
      console.error('[PPRAnalysisServer] Analysis error:', error);
      return this.generateFallbackAnalysis(patientData);
    }
  }

  /**
   * Generate CPD update recommendations based on analysis
   */
  async generateCPDRecommendations(analysisResults, patientData) {
    try {
      const recommendationResponse = await apiRequest('/api/ai/cpd-recommendations', {
        method: 'POST',
        body: JSON.stringify({
          currentCPDs: patientData.currentCPDs,
          analysisResults,
          patientProfile: patientData.patient,
          performanceData: {
            averageScores: this.calculateAverageScores(patientData.healthScores),
            complianceRates: this.calculateComplianceRates(patientData.healthScores),
            engagementLevel: this.calculateEngagementLevel(patientData)
          }
        })
      });

      return recommendationResponse.recommendations || this.generateFallbackRecommendations(patientData);
    } catch (error) {
      console.error('[PPRAnalysisServer] CPD recommendation error:', error);
      return this.generateFallbackRecommendations(patientData);
    }
  }

  /**
   * Format complete PPR for doctor review
   */
  formatPPRForDoctor(analysisResults, cpdRecommendations, patientData) {
    const patient = patientData.patient;
    const averageScores = this.calculateAverageScores(patientData.healthScores);
    const complianceRates = this.calculateComplianceRates(patientData.healthScores);

    let ppr = `# Patient Progress Report\n\n`;
    ppr += `**Patient**: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})\n`;
    ppr += `**Report Generated**: ${new Date().toLocaleDateString()}\n`;
    ppr += `**Analysis Period**: Last 30 days\n`;
    ppr += `**Data Completeness**: ${patientData.dataCompleteness}%\n\n`;

    // Executive Summary
    ppr += `## Executive Summary\n\n`;
    ppr += this.generateExecutiveSummary(analysisResults, averageScores, complianceRates);

    // Current Health Performance
    ppr += `\n## Current Health Performance\n\n`;
    ppr += this.formatHealthPerformance(averageScores, complianceRates, patientData.healthScores);

    // CPD Compliance Analysis
    ppr += `\n## Care Plan Directive Compliance\n\n`;
    ppr += this.formatCPDCompliance(patientData.currentCPDs, analysisResults);

    // Engagement & Sentiment Analysis
    ppr += `\n## Patient Engagement Analysis\n\n`;
    ppr += this.formatEngagementAnalysis(analysisResults, patientData);

    // CPD Update Recommendations
    ppr += `\n## Care Plan Directive Recommendations\n\n`;
    ppr += this.formatCPDRecommendations(cpdRecommendations);

    // Action Items for Doctor
    ppr += `\n## Recommended Actions\n\n`;
    ppr += this.generateActionItems(analysisResults, cpdRecommendations);

    return ppr;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(analysisResults, averageScores, complianceRates) {
    const overallScore = (averageScores.medication + averageScores.diet + averageScores.exercise) / 3;
    const overallCompliance = (complianceRates.medication + complianceRates.diet + complianceRates.exercise) / 3;

    let summary = `**Overall Health Score**: ${overallScore.toFixed(1)}/10\n`;
    summary += `**CPD Compliance Rate**: ${overallCompliance.toFixed(1)}%\n`;
    summary += `**Engagement Level**: ${analysisResults.engagementLevel || 'Moderate'}\n`;
    summary += `**Sentiment Trend**: ${analysisResults.sentimentTrend || 'Stable'}\n\n`;

    if (overallScore >= 8) {
      summary += `Patient demonstrates excellent adherence to care plan with consistently high scores. Consider maintaining current CPDs while monitoring for sustained compliance.\n`;
    } else if (overallScore >= 6) {
      summary += `Patient shows good progress but has opportunities for improvement. Current CPDs may need refinement to support consistent 8-10 scoring.\n`;
    } else {
      summary += `Patient requires focused intervention. CPD adjustments recommended to improve engagement and scoring consistency.\n`;
    }

    return summary;
  }

  /**
   * Format health performance section
   */
  formatHealthPerformance(averageScores, complianceRates, recentScores) {
    let performance = `### Score Averages (Last 30 Days)\n`;
    performance += `- **Medication**: ${averageScores.medication.toFixed(1)}/10 (${complianceRates.medication.toFixed(1)}% compliance)\n`;
    performance += `- **Diet**: ${averageScores.diet.toFixed(1)}/10 (${complianceRates.diet.toFixed(1)}% compliance)\n`;
    performance += `- **Exercise**: ${averageScores.exercise.toFixed(1)}/10 (${complianceRates.exercise.toFixed(1)}% compliance)\n\n`;

    performance += `### Trend Analysis\n`;
    const trends = this.calculateTrends(recentScores);
    performance += `- **Medication**: ${trends.medication}\n`;
    performance += `- **Diet**: ${trends.diet}\n`;
    performance += `- **Exercise**: ${trends.exercise}\n\n`;

    performance += `### Target Achievement\n`;
    const targetAchievement = this.calculateTargetAchievement(averageScores);
    performance += `- **Categories at 8+**: ${targetAchievement.categoriesAt8Plus}/3\n`;
    performance += `- **Days with all scores 8+**: ${targetAchievement.perfectDays || 0}\n`;

    return performance;
  }

  /**
   * Format CPD compliance section
   */
  formatCPDCompliance(currentCPDs, analysisResults) {
    if (!currentCPDs || currentCPDs.length === 0) {
      return `No active Care Plan Directives found. Consider establishing specific, measurable directives for this patient.\n`;
    }

    let compliance = `### Current Directives Performance\n\n`;
    
    currentCPDs.forEach((cpd, index) => {
      const performance = analysisResults.cpdPerformance?.[index] || {};
      compliance += `**${cpd.category}**: "${cpd.directive}"\n`;
      compliance += `- Compliance Rate: ${performance.complianceRate || 'Unknown'}%\n`;
      compliance += `- Average Score: ${performance.averageScore || 'N/A'}/10\n`;
      compliance += `- Trend: ${performance.trend || 'Stable'}\n`;
      compliance += `- Patient Understanding: ${performance.understanding || 'Good'}\n\n`;
    });

    return compliance;
  }

  /**
   * Format engagement analysis section
   */
  formatEngagementAnalysis(analysisResults, patientData) {
    let engagement = `### Chat Interaction Patterns\n`;
    engagement += `- **Messages Sent**: ${patientData.chatHistory.length || 0}\n`;
    engagement += `- **Avg Messages/Day**: ${this.calculateDailyAverage(patientData.chatHistory)}\n`;
    engagement += `- **Sentiment Score**: ${analysisResults.sentimentScore || 'Neutral'}\n`;
    engagement += `- **Help-Seeking Frequency**: ${analysisResults.helpSeekingFrequency || 'Moderate'}\n\n`;

    engagement += `### Feature Usage\n`;
    if (patientData.featureUsage && patientData.featureUsage.length > 0) {
      patientData.featureUsage.forEach(feature => {
        engagement += `- **${feature.featureName}**: ${feature.usageCount} times\n`;
      });
    } else {
      engagement += `- Limited feature usage data available\n`;
    }

    return engagement;
  }

  /**
   * Format CPD recommendations section
   */
  formatCPDRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return `Current CPDs appear well-aligned with patient needs. Continue monitoring progress.\n`;
    }

    let recs = `### Specific Recommendations\n\n`;
    
    recommendations.forEach((rec, index) => {
      recs += `**${index + 1}. ${rec.category} Directive**\n`;
      recs += `- **Current**: ${rec.currentDirective}\n`;
      recs += `- **Recommended**: ${rec.recommendedDirective}\n`;
      recs += `- **Rationale**: ${rec.rationale}\n`;
      recs += `- **Expected Impact**: ${rec.expectedImpact}\n\n`;
    });

    return recs;
  }

  /**
   * Generate action items for doctor
   */
  generateActionItems(analysisResults, recommendations) {
    let actions = `### Immediate Actions\n`;
    
    if (recommendations && recommendations.length > 0) {
      actions += `1. **Review CPD Updates**: Consider implementing ${recommendations.length} recommended directive changes\n`;
    }
    
    actions += `2. **Schedule Follow-up**: Patient consultation recommended within 2 weeks\n`;
    actions += `3. **Monitor Trends**: Focus on improving scores below 8/10\n`;
    
    if (analysisResults.engagementLevel === 'Low') {
      actions += `4. **Engagement Intervention**: Patient showing reduced engagement - consider motivational support\n`;
    }

    actions += `\n### Long-term Monitoring\n`;
    actions += `- Track progress toward consistent 8-10 scoring\n`;
    actions += `- Monitor CPD compliance rates\n`;
    actions += `- Assess need for directive complexity adjustments\n`;

    return actions;
  }

  /**
   * Helper methods for calculations
   */
  calculateAverageScores(healthScores) {
    if (!healthScores || healthScores.length === 0) {
      return { medication: 0, diet: 0, exercise: 0 };
    }

    const totals = healthScores.reduce((acc, score) => ({
      medication: acc.medication + (score.medicationScore || 0),
      diet: acc.diet + (score.dietScore || 0),
      exercise: acc.exercise + (score.exerciseScore || 0)
    }), { medication: 0, diet: 0, exercise: 0 });

    return {
      medication: totals.medication / healthScores.length,
      diet: totals.diet / healthScores.length,
      exercise: totals.exercise / healthScores.length
    };
  }

  calculateComplianceRates(healthScores) {
    if (!healthScores || healthScores.length === 0) {
      return { medication: 0, diet: 0, exercise: 0 };
    }

    const compliantCounts = healthScores.reduce((acc, score) => ({
      medication: acc.medication + ((score.medicationScore || 0) >= 8 ? 1 : 0),
      diet: acc.diet + ((score.dietScore || 0) >= 8 ? 1 : 0),
      exercise: acc.exercise + ((score.exerciseScore || 0) >= 8 ? 1 : 0)
    }), { medication: 0, diet: 0, exercise: 0 });

    return {
      medication: (compliantCounts.medication / healthScores.length) * 100,
      diet: (compliantCounts.diet / healthScores.length) * 100,
      exercise: (compliantCounts.exercise / healthScores.length) * 100
    };
  }

  calculateEngagementLevel(patientData) {
    const chatCount = patientData.chatHistory?.length || 0;
    const featureUsage = patientData.featureUsage?.length || 0;
    const scoreEntries = patientData.healthScores?.length || 0;

    if (chatCount >= 20 && featureUsage >= 5 && scoreEntries >= 20) return 'High';
    if (chatCount >= 10 && featureUsage >= 3 && scoreEntries >= 15) return 'Moderate';
    return 'Low';
  }

  calculateTrends(recentScores) {
    // Simple trend calculation - compare first half vs second half
    if (!recentScores || recentScores.length < 4) {
      return { medication: 'Insufficient data', diet: 'Insufficient data', exercise: 'Insufficient data' };
    }

    const midpoint = Math.floor(recentScores.length / 2);
    const firstHalf = recentScores.slice(0, midpoint);
    const secondHalf = recentScores.slice(midpoint);

    const firstAvg = this.calculateAverageScores(firstHalf);
    const secondAvg = this.calculateAverageScores(secondHalf);

    return {
      medication: secondAvg.medication > firstAvg.medication ? 'Improving' : secondAvg.medication < firstAvg.medication ? 'Declining' : 'Stable',
      diet: secondAvg.diet > firstAvg.diet ? 'Improving' : secondAvg.diet < firstAvg.diet ? 'Declining' : 'Stable',
      exercise: secondAvg.exercise > firstAvg.exercise ? 'Improving' : secondAvg.exercise < firstAvg.exercise ? 'Declining' : 'Stable'
    };
  }

  calculateTargetAchievement(averageScores) {
    const categoriesAt8Plus = [
      averageScores.medication >= 8,
      averageScores.diet >= 8,
      averageScores.exercise >= 8
    ].filter(Boolean).length;

    return { categoriesAt8Plus };
  }

  calculateDailyAverage(chatHistory) {
    if (!chatHistory || chatHistory.length === 0) return 0;
    return (chatHistory.length / 30).toFixed(1); // Assuming 30-day period
  }

  assessDataCompleteness(dataResults) {
    const completeness = dataResults.filter(result => result.status === 'fulfilled').length;
    return Math.round((completeness / dataResults.length) * 100);
  }

  generateFallbackAnalysis(patientData) {
    return {
      engagementLevel: this.calculateEngagementLevel(patientData),
      sentimentTrend: 'Unable to analyze',
      cpdPerformance: []
    };
  }

  generateFallbackRecommendations(patientData) {
    return [{
      category: 'General',
      currentDirective: 'Current directives',
      recommendedDirective: 'Consider reviewing directives based on recent performance',
      rationale: 'AI analysis unavailable - manual review recommended',
      expectedImpact: 'Improved patient engagement and scoring'
    }];
  }
}

export default new PPRAnalysisServer();