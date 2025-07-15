// Supervisor Agent Service - Core AI Logic Integration Point
// This file provides the structure for Kiro to implement the AI logic

export interface SupervisorContext {
  userId: number;
  patientData: PatientData;
  cpdDirectives: CarePlanDirective[];
  recentInteractions: Interaction[];
  healthMetrics: HealthMetrics;
}

export interface PatientData {
  name: string;
  age: number;
  conditions: string[];
  preferences: Record<string, any>;
  progressData: ProgressData;
}

export interface CarePlanDirective {
  id: number;
  category: 'diet' | 'exercise' | 'medication' | 'wellness';
  directive: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  doctorId: number;
}

export interface HealthMetrics {
  dailyScores: DailyScore[];
  badges: Badge[];
  milestones: Milestone[];
  trends: HealthTrend[];
}

export interface SupervisorResponse {
  message: string;
  interventionType: 'chat' | 'toast' | 'feature_recommendation' | 'doctor_alert';
  urgency: 'low' | 'medium' | 'high';
  cpdAlignment: string[];
  followUpRequired: boolean;
  patientProgressReport?: PPRUpdate;
}

export class SupervisorAgentService {
  
  /**
   * MAIN AI INTEGRATION POINT - Core clinical orchestration
   * Generates contextual responses based on patient data and CPDs
   */
  async generateResponse(
    context: SupervisorContext,
    userMessage?: string
  ): Promise<SupervisorResponse> {
    
    try {
      // 1. Build comprehensive clinical context
      const clinicalContext = await this.buildClinicalContext(context, userMessage);
      
      // 2. Analyze patient state and determine intervention type
      const patientAnalysis = await this.analyzeCurrentState(context);
      
      // 3. Generate primary response using OpenAI
      const primaryResponse = await this.generatePrimaryResponse(clinicalContext, patientAnalysis);
      
      // 4. Validate with Anthropic for healthcare safety
      const validatedResponse = await this.validateResponse(primaryResponse, clinicalContext);
      
      // 5. Apply CBT/MI therapeutic techniques
      const therapeuticResponse = await this.applyTherapeuticTechniques(
        validatedResponse, 
        patientAnalysis,
        context.cpdDirectives
      );
      
      // 6. Determine intervention type and urgency
      const interventionType = this.determineInterventionType(patientAnalysis, userMessage);
      const urgency = this.assessUrgency(patientAnalysis, context.healthMetrics);
      
      // 7. Generate PPR update if needed
      const pprUpdate = await this.generatePPRUpdate(context, therapeuticResponse, patientAnalysis);
      
      return {
        message: therapeuticResponse,
        interventionType,
        urgency,
        cpdAlignment: this.identifyCPDAlignment(therapeuticResponse, context.cpdDirectives),
        followUpRequired: this.requiresFollowUp(patientAnalysis, urgency),
        patientProgressReport: pprUpdate
      };
      
    } catch (error) {
      console.error('Supervisor Agent error:', error);
      
      // Fallback response for system errors
      return {
        message: "I'm here to support your health journey. How can I help you today?",
        interventionType: 'chat',
        urgency: 'low',
        cpdAlignment: [],
        followUpRequired: false
      };
    }
  }

  /**
   * PATIENT MONITORING - Continuous analysis
   */
  async analyzePatientBehavior(context: SupervisorContext): Promise<PatientAnalysis> {
    
    try {
      // 1. Analyze daily score trends
      const scoreTrends = this.analyzeDailyScoreTrends(context.healthMetrics.dailyScores);
      
      // 2. Calculate CPD compliance levels
      const cpdCompliance = this.calculateCPDCompliance(context.cpdDirectives, context.healthMetrics);
      
      // 3. Assess engagement patterns
      const engagementLevel = this.assessEngagementLevel(context.recentInteractions);
      
      // 4. Determine risk level
      const riskLevel = this.calculateRiskLevel(scoreTrends, cpdCompliance, engagementLevel);
      
      // 5. Generate behavior patterns
      const behaviorPatterns = this.identifyBehaviorPatterns(context);
      
      // 6. Create intervention recommendations
      const interventionRecommendations = this.generateInterventionRecommendations(
        riskLevel, 
        behaviorPatterns, 
        context.cpdDirectives
      );
      
      return {
        complianceScore: cpdCompliance,
        riskLevel,
        behaviorPatterns,
        interventionRecommendations
      };
      
    } catch (error) {
      console.error('Patient behavior analysis error:', error);
      
      // Return safe defaults
      return {
        complianceScore: 50,
        riskLevel: 'medium',
        behaviorPatterns: [],
        interventionRecommendations: []
      };
    }
  }

  /**
   * DOCTOR REPORTING - PPR Generation
   */
  async generatePPR(
    patientId: number,
    timeframe: 'weekly' | 'monthly'
  ): Promise<PatientProgressReport> {
    
    try {
      // 1. Gather patient data for the timeframe
      const context = await this.gatherPatientContext(patientId, timeframe);
      
      // 2. Calculate CPD compliance for each directive
      const cpdCompliance = await this.generateCPDComplianceReport(context);
      
      // 3. Generate clinical observations using AI analysis
      const clinicalObservations = await this.generateClinicalObservations(context);
      
      // 4. Create recommended actions for doctor
      const recommendedActions = await this.generateRecommendedActions(context, cpdCompliance);
      
      // 5. Determine reporting period
      const period = this.calculateReportingPeriod(timeframe);
      
      return {
        patientId,
        period,
        cpdCompliance,
        clinicalObservations,
        recommendedActions
      };
      
    } catch (error) {
      console.error('PPR generation error:', error);
      throw new Error(`Failed to generate PPR for patient ${patientId}: ${error.message}`);
    }
  }

  /**
   * FEATURE INTEGRATION - AI-powered content curation
   */
  async curateContent(
    feature: 'inspiration-d' | 'inspiration-ew' | 'motivation',
    context: SupervisorContext
  ): Promise<CuratedContent[]> {
    
    try {
      // 1. Analyze patient preferences and CPD requirements
      const curationCriteria = this.buildCurationCriteria(feature, context);
      
      // 2. Generate AI-powered content recommendations
      const contentRecommendations = await this.generateContentRecommendations(
        feature, 
        curationCriteria, 
        context.cpdDirectives
      );
      
      // 3. Apply safety filtering
      const safeContent = this.applySafetyFiltering(contentRecommendations, context.patientData);
      
      // 4. Score content relevance based on CPD alignment
      const scoredContent = this.scoreContentRelevance(safeContent, context.cpdDirectives);
      
      // 5. Rank and limit to top 10 recommendations
      const curatedContent = this.rankAndLimitContent(scoredContent, 10);
      
      return curatedContent;
      
    } catch (error) {
      console.error('Content curation error:', error);
      
      // Return safe fallback content
      return this.getFallbackContent(feature);
    }
  }

  // ========================================
  // HELPER METHODS - Core AI Implementation
  // ========================================

  /**
   * Build comprehensive clinical context for AI processing
   */
  private async buildClinicalContext(context: SupervisorContext, userMessage?: string): Promise<string> {
    const contextParts = [
      `Patient: ${context.patientData.name}, Age: ${context.patientData.age}`,
      `Conditions: ${context.patientData.conditions.join(', ')}`,
      `Active CPDs: ${context.cpdDirectives.map(cpd => `${cpd.category}: ${cpd.directive}`).join('; ')}`,
      `Recent Health Scores: ${this.formatHealthScores(context.healthMetrics.dailyScores)}`,
      `Current Progress: ${this.formatProgressData(context.patientData.progressData)}`,
    ];
    
    if (userMessage) {
      contextParts.push(`Patient Query: "${userMessage}"`);
    }
    
    return contextParts.join('\n');
  }

  /**
   * Analyze current patient state for intervention planning
   */
  private async analyzeCurrentState(context: SupervisorContext): Promise<PatientAnalysis> {
    return await this.analyzePatientBehavior(context);
  }

  /**
   * Generate primary response using OpenAI
   */
  private async generatePrimaryResponse(clinicalContext: string, analysis: PatientAnalysis): Promise<string> {
    try {
      // This would integrate with OpenAI API
      // For now, return contextual response based on analysis
      if (analysis.riskLevel === 'high') {
        return this.generateHighRiskResponse(analysis);
      } else if (analysis.complianceScore < 60) {
        return this.generateLowComplianceResponse(analysis);
      } else {
        return this.generateEncouragementResponse(analysis);
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return "I'm here to support your health journey. How are you feeling today?";
    }
  }

  /**
   * Validate response with Anthropic for healthcare safety
   */
  private async validateResponse(response: string, context: string): Promise<string> {
    try {
      // This would integrate with Anthropic API for validation
      // For now, apply basic safety checks
      if (this.containsUnsafeContent(response)) {
        return "Let's focus on your health goals. How can I support you today?";
      }
      return response;
    } catch (error) {
      console.error('Anthropic validation error:', error);
      return response; // Return original if validation fails
    }
  }

  /**
   * Apply CBT/MI therapeutic techniques
   */
  private async applyTherapeuticTechniques(
    response: string, 
    analysis: PatientAnalysis, 
    cpds: CarePlanDirective[]
  ): Promise<string> {
    
    // Apply Cognitive Behavioral Therapy patterns
    if (analysis.riskLevel === 'high') {
      return this.applyCBTReframing(response, analysis);
    }
    
    // Apply Motivational Interviewing techniques
    if (analysis.complianceScore < 70) {
      return this.applyMotivationalInterviewing(response, cpds);
    }
    
    // Apply positive reinforcement for good compliance
    return this.applyPositiveReinforcement(response, analysis);
  }

  /**
   * Determine appropriate intervention type
   */
  private determineInterventionType(analysis: PatientAnalysis, userMessage?: string): 'chat' | 'toast' | 'feature_recommendation' | 'doctor_alert' {
    if (analysis.riskLevel === 'high') {
      return 'doctor_alert';
    }
    if (userMessage) {
      return 'chat';
    }
    if (analysis.complianceScore < 50) {
      return 'feature_recommendation';
    }
    return 'toast';
  }

  /**
   * Assess urgency level
   */
  private assessUrgency(analysis: PatientAnalysis, healthMetrics: HealthMetrics): 'low' | 'medium' | 'high' {
    if (analysis.riskLevel === 'high') return 'high';
    if (analysis.complianceScore < 40) return 'medium';
    return 'low';
  }

  /**
   * Generate PPR update for doctor reporting
   */
  private async generatePPRUpdate(
    context: SupervisorContext, 
    response: string, 
    analysis: PatientAnalysis
  ): Promise<PPRUpdate | undefined> {
    
    if (analysis.riskLevel === 'high' || analysis.complianceScore < 50) {
      return {
        patientId: context.userId,
        timestamp: new Date(),
        clinicalNote: `Patient interaction: ${response.substring(0, 200)}...`,
        riskLevel: analysis.riskLevel,
        complianceScore: analysis.complianceScore,
        recommendedAction: this.getRecommendedAction(analysis)
      };
    }
    
    return undefined;
  }

  /**
   * Identify CPD alignment in response
   */
  private identifyCPDAlignment(response: string, cpds: CarePlanDirective[]): string[] {
    const alignments: string[] = [];
    
    cpds.forEach(cpd => {
      if (response.toLowerCase().includes(cpd.category) || 
          response.toLowerCase().includes(cpd.directive.toLowerCase().substring(0, 20))) {
        alignments.push(cpd.category);
      }
    });
    
    return alignments;
  }

  /**
   * Determine if follow-up is required
   */
  private requiresFollowUp(analysis: PatientAnalysis, urgency: 'low' | 'medium' | 'high'): boolean {
    return urgency === 'high' || analysis.complianceScore < 40;
  }

  // ========================================
  // ANALYSIS HELPER METHODS
  // ========================================

  private analyzeDailyScoreTrends(dailyScores: DailyScore[]): any {
    // Analyze trends in daily scores
    const recentScores = dailyScores.slice(-7); // Last 7 days
    const average = recentScores.reduce((sum, score) => sum + score.average, 0) / recentScores.length;
    const trend = recentScores.length > 1 ? 
      (recentScores[recentScores.length - 1].average - recentScores[0].average) : 0;
    
    return { average, trend, recentScores };
  }

  private calculateCPDCompliance(cpds: CarePlanDirective[], healthMetrics: HealthMetrics): number {
    // Calculate overall CPD compliance based on health metrics
    const recentScores = healthMetrics.dailyScores.slice(-7);
    if (recentScores.length === 0) return 50;
    
    const averageScore = recentScores.reduce((sum, score) => sum + score.average, 0) / recentScores.length;
    return Math.round((averageScore / 10) * 100); // Convert 1-10 scale to percentage
  }

  private assessEngagementLevel(interactions: Interaction[]): number {
    // Assess patient engagement based on recent interactions
    const recentInteractions = interactions.slice(-10);
    const engagementScore = recentInteractions.length * 10; // Simple engagement metric
    return Math.min(engagementScore, 100);
  }

  private calculateRiskLevel(scoreTrends: any, compliance: number, engagement: number): 'low' | 'medium' | 'high' {
    if (compliance < 40 || scoreTrends.average < 4 || engagement < 30) {
      return 'high';
    }
    if (compliance < 70 || scoreTrends.average < 6 || engagement < 60) {
      return 'medium';
    }
    return 'low';
  }

  private identifyBehaviorPatterns(context: SupervisorContext): BehaviorPattern[] {
    // Identify behavioral patterns from patient data
    const patterns: BehaviorPattern[] = [];
    
    // Example pattern identification
    const recentScores = context.healthMetrics.dailyScores.slice(-7);
    if (recentScores.every(score => score.average < 5)) {
      patterns.push({
        type: 'consistent_low_scores',
        description: 'Patient consistently scoring below 5/10',
        frequency: 'daily',
        impact: 'negative'
      });
    }
    
    return patterns;
  }

  private generateInterventionRecommendations(
    riskLevel: 'low' | 'medium' | 'high',
    patterns: BehaviorPattern[],
    cpds: CarePlanDirective[]
  ): InterventionRecommendation[] {
    
    const recommendations: InterventionRecommendation[] = [];
    
    if (riskLevel === 'high') {
      recommendations.push({
        type: 'immediate_support',
        description: 'Provide immediate motivational support',
        priority: 'high',
        suggestedFeatures: ['enhanced-chatbot', 'motivation']
      });
    }
    
    return recommendations;
  }

  // ========================================
  // RESPONSE GENERATION HELPERS
  // ========================================

  private generateHighRiskResponse(analysis: PatientAnalysis): string {
    return "I notice you might be facing some challenges with your health goals. Remember, every small step counts, and I'm here to support you. Would you like to talk about what's been difficult lately?";
  }

  private generateLowComplianceResponse(analysis: PatientAnalysis): string {
    return "I can see you're working on your health journey. Sometimes it takes time to build new habits. What's one small thing we could focus on today to help you feel more confident about your progress?";
  }

  private generateEncouragementResponse(analysis: PatientAnalysis): string {
    return "You're doing great with your health goals! Your consistency is really showing. Keep up the excellent work - your efforts are making a real difference.";
  }

  private applyCBTReframing(response: string, analysis: PatientAnalysis): string {
    return `${response} Remember, setbacks are a normal part of any health journey. What matters most is how we learn and move forward from here.`;
  }

  private applyMotivationalInterviewing(response: string, cpds: CarePlanDirective[]): string {
    const primaryCPD = cpds.find(cpd => cpd.priority === 'high') || cpds[0];
    return `${response} I'm curious - what drew you to focus on ${primaryCPD?.category} in the first place? What would achieving this goal mean to you?`;
  }

  private applyPositiveReinforcement(response: string, analysis: PatientAnalysis): string {
    return `${response} Your commitment to your health is inspiring, and your doctor will be pleased to see your progress.`;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private formatHealthScores(dailyScores: DailyScore[]): string {
    const recent = dailyScores.slice(-3);
    return recent.map(score => `${score.date}: ${score.average}/10`).join(', ');
  }

  private formatProgressData(progressData: ProgressData): string {
    return `Milestones completed: ${progressData.milestonesCompleted || 0}, Badges earned: ${progressData.badgesEarned || 0}`;
  }

  private containsUnsafeContent(response: string): boolean {
    const unsafePatterns = ['medical advice', 'diagnosis', 'prescription', 'emergency'];
    return unsafePatterns.some(pattern => response.toLowerCase().includes(pattern));
  }

  private getRecommendedAction(analysis: PatientAnalysis): string {
    if (analysis.riskLevel === 'high') {
      return 'Consider scheduling follow-up appointment';
    }
    return 'Continue monitoring patient progress';
  }

  // ========================================
  // PPR GENERATION HELPER METHODS
  // ========================================

  private async gatherPatientContext(patientId: number, timeframe: 'weekly' | 'monthly'): Promise<SupervisorContext> {
    // This would fetch real patient data from database
    // For now, return mock context
    return {
      userId: patientId,
      patientData: {
        name: 'Patient Name',
        age: 45,
        conditions: ['metabolic syndrome'],
        preferences: {},
        progressData: {
          milestonesCompleted: 3,
          badgesEarned: 2,
          streakDays: 7,
          totalInteractions: 25
        }
      },
      cpdDirectives: [],
      recentInteractions: [],
      healthMetrics: {
        dailyScores: [],
        badges: [],
        milestones: [],
        trends: []
      }
    };
  }

  private async generateCPDComplianceReport(context: SupervisorContext): Promise<CPDCompliance[]> {
    return context.cpdDirectives.map(cpd => ({
      cpdId: cpd.id,
      category: cpd.category,
      directive: cpd.directive,
      complianceScore: this.calculateCPDCompliance(context.cpdDirectives, context.healthMetrics),
      trend: 'stable' as const
    }));
  }

  private async generateClinicalObservations(context: SupervisorContext): Promise<ClinicalObservation[]> {
    const observations: ClinicalObservation[] = [];
    
    // Analyze compliance patterns
    const compliance = this.calculateCPDCompliance(context.cpdDirectives, context.healthMetrics);
    if (compliance < 60) {
      observations.push({
        type: 'compliance',
        observation: 'Patient showing decreased adherence to care plan directives',
        evidence: ['Daily scores below target', 'Missed check-ins'],
        clinicalRelevance: 'May indicate need for CPD adjustment or additional support',
        recommendedAction: 'Review CPD complexity and patient barriers'
      });
    }

    return observations;
  }

  private async generateRecommendedActions(context: SupervisorContext, cpdCompliance: CPDCompliance[]): Promise<RecommendedAction[]> {
    const actions: RecommendedAction[] = [];
    
    // Check for low compliance
    const lowComplianceCPDs = cpdCompliance.filter(cpd => cpd.complianceScore < 60);
    if (lowComplianceCPDs.length > 0) {
      actions.push({
        type: 'cpd_adjustment',
        description: 'Consider simplifying or adjusting care plan directives with low compliance',
        priority: 'medium',
        timeline: 'Next appointment'
      });
    }

    return actions;
  }

  private calculateReportingPeriod(timeframe: 'weekly' | 'monthly'): DateRange {
    const end = new Date();
    const start = new Date();
    
    if (timeframe === 'weekly') {
      start.setDate(end.getDate() - 7);
    } else {
      start.setMonth(end.getMonth() - 1);
    }
    
    return { start, end };
  }

  // ========================================
  // CONTENT CURATION HELPER METHODS
  // ========================================

  private buildCurationCriteria(feature: string, context: SupervisorContext): any {
    return {
      feature,
      patientAge: context.patientData.age,
      conditions: context.patientData.conditions,
      preferences: context.patientData.preferences,
      cpdCategories: context.cpdDirectives.map(cpd => cpd.category),
      complianceLevel: this.calculateCPDCompliance(context.cpdDirectives, context.healthMetrics)
    };
  }

  private async generateContentRecommendations(
    feature: string, 
    criteria: any, 
    cpds: CarePlanDirective[]
  ): Promise<CuratedContent[]> {
    
    // This would integrate with AI content curation
    // For now, return mock recommendations based on feature type
    const mockContent: CuratedContent[] = [];
    
    if (feature === 'inspiration-d') {
      mockContent.push({
        id: 'recipe-1',
        type: 'recipe',
        title: 'Heart-Healthy Mediterranean Bowl',
        url: 'https://example.com/recipe-1',
        relevanceScore: 0.9,
        cpdAlignment: ['diet'],
        safetyNotes: ['Low sodium', 'Diabetic friendly']
      });
    }
    
    return mockContent;
  }

  private applySafetyFiltering(content: CuratedContent[], patientData: PatientData): CuratedContent[] {
    // Apply safety filters based on patient conditions
    return content.filter(item => {
      // Example: Filter out high-intensity exercises for certain conditions
      if (patientData.conditions.includes('heart condition') && 
          item.type === 'exercise' && 
          item.title.toLowerCase().includes('high intensity')) {
        return false;
      }
      return true;
    });
  }

  private scoreContentRelevance(content: CuratedContent[], cpds: CarePlanDirective[]): CuratedContent[] {
    return content.map(item => {
      // Score based on CPD alignment
      const alignmentScore = item.cpdAlignment.length / Math.max(cpds.length, 1);
      item.relevanceScore = Math.min(item.relevanceScore + alignmentScore * 0.3, 1.0);
      return item;
    });
  }

  private rankAndLimitContent(content: CuratedContent[], limit: number): CuratedContent[] {
    return content
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private getFallbackContent(feature: string): CuratedContent[] {
    // Return safe fallback content when curation fails
    const fallbackContent: Record<string, CuratedContent[]> = {
      'inspiration-d': [{
        id: 'fallback-recipe',
        type: 'recipe',
        title: 'Simple Healthy Meal Ideas',
        url: '#',
        relevanceScore: 0.5,
        cpdAlignment: ['diet'],
        safetyNotes: ['General healthy eating guidelines']
      }],
      'inspiration-ew': [{
        id: 'fallback-exercise',
        type: 'exercise',
        title: 'Gentle Movement Exercises',
        url: '#',
        relevanceScore: 0.5,
        cpdAlignment: ['exercise'],
        safetyNotes: ['Low impact', 'Suitable for beginners']
      }],
      'motivation': [{
        id: 'fallback-motivation',
        type: 'article',
        title: 'Daily Motivation for Health Goals',
        url: '#',
        relevanceScore: 0.5,
        cpdAlignment: ['wellness'],
        safetyNotes: ['Positive reinforcement']
      }]
    };

    return fallbackContent[feature] || [];
  }
}

// Type definitions for Kiro's implementation
export interface PatientAnalysis {
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  behaviorPatterns: BehaviorPattern[];
  interventionRecommendations: InterventionRecommendation[];
}

export interface PatientProgressReport {
  patientId: number;
  period: DateRange;
  cpdCompliance: CPDCompliance[];
  clinicalObservations: ClinicalObservation[];
  recommendedActions: RecommendedAction[];
}

export interface CuratedContent {
  id: string;
  type: 'video' | 'article' | 'exercise' | 'recipe';
  title: string;
  url: string;
  relevanceScore: number;
  cpdAlignment: string[];
  safetyNotes?: string[];
}

// Additional missing type definitions
export interface DailyScore {
  date: string;
  diet: number;
  exercise: number;
  medication: number;
  average: number;
}

export interface Badge {
  id: string;
  type: 'exercise' | 'meal' | 'medication';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedDate: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: Date;
}

export interface HealthTrend {
  category: string;
  trend: 'improving' | 'stable' | 'declining';
  value: number;
}

export interface Interaction {
  id: string;
  type: 'chat' | 'feature_usage' | 'score_submission';
  timestamp: Date;
  data: any;
}

export interface ProgressData {
  milestonesCompleted: number;
  badgesEarned: number;
  streakDays: number;
  totalInteractions: number;
}

export interface BehaviorPattern {
  type: string;
  description: string;
  frequency: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface InterventionRecommendation {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedFeatures: string[];
}

export interface PPRUpdate {
  patientId: number;
  timestamp: Date;
  clinicalNote: string;
  riskLevel: 'low' | 'medium' | 'high';
  complianceScore: number;
  recommendedAction: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CPDCompliance {
  cpdId: number;
  category: string;
  directive: string;
  complianceScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ClinicalObservation {
  type: 'behavioral' | 'compliance' | 'engagement' | 'concern';
  observation: string;
  evidence: string[];
  clinicalRelevance: string;
  recommendedAction: string;
}

export interface RecommendedAction {
  type: 'cpd_adjustment' | 'follow_up' | 'feature_recommendation';
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
}

// Export singleton instance for use across the application
export const supervisorAgent = new SupervisorAgentService();