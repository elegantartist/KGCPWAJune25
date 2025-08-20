/**
 * PPR Analysis Routes for Doctor Intelligence
 * 
 * These routes handle the AI-powered Patient Progress Report generation
 * that helps doctors make informed CPD updates.
 */

import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Initialize AI providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// PPR analysis request schema
const pprAnalysisSchema = z.object({
  patientData: z.object({
    patient: z.any(),
    healthScores: z.array(z.any()),
    chatHistory: z.array(z.any()),
    currentCPDs: z.array(z.any()),
    featureUsage: z.array(z.any()),
    previousPPRs: z.array(z.any()).optional()
  }),
  analysisType: z.enum(['compliance_focus', 'trend_analysis', 'cpd_optimization', 'engagement_analysis', 'comprehensive']),
  focusAreas: z.array(z.string())
});

// CPD recommendations request schema
const cpdRecommendationSchema = z.object({
  currentCPDs: z.array(z.any()),
  analysisResults: z.any(),
  patientProfile: z.any(),
  performanceData: z.object({
    averageScores: z.any(),
    complianceRates: z.any(),
    engagementLevel: z.string()
  })
});

/**
 * AI-Powered PPR Analysis Endpoint
 * 
 * Uses dual AI providers to analyze comprehensive patient data and identify
 * patterns that inform CPD optimization for 8-10 scoring achievement.
 */
router.post('/ppr-analysis', async (req, res) => {
  try {
    const { patientData, analysisType, focusAreas } = pprAnalysisSchema.parse(req.body);

    // Build comprehensive analysis prompt
    const analysisPrompt = `You are an expert healthcare analyst specializing in Patient Progress Reports for Care Plan Directive optimization. Your goal is to help doctors make informed CPD updates that guide patients toward consistent 8-10 health scores.

PATIENT DATA SUMMARY:
- Health Scores (30 days): ${patientData.healthScores.length} entries
- Chat Interactions: ${patientData.chatHistory.length} messages  
- Active CPDs: ${patientData.currentCPDs.length} directives
- Feature Usage: ${patientData.featureUsage.length} activities

ANALYSIS TYPE: ${analysisType}
FOCUS AREAS: ${focusAreas.join(', ')}

CURRENT CARE PLAN DIRECTIVES:
${patientData.currentCPDs.map((cpd: any) => `${cpd.category}: "${cpd.directive}"`).join('\n')}

RECENT HEALTH SCORES PATTERN:
${this.formatHealthScoresForAnalysis(patientData.healthScores)}

CHAT SENTIMENT INDICATORS:
${this.extractSentimentIndicators(patientData.chatHistory)}

ANALYSIS REQUIREMENTS:
1. Identify specific patterns preventing consistent 8-10 scoring
2. Assess CPD effectiveness and patient understanding
3. Detect engagement and motivation trends
4. Recommend precise CPD modifications

Provide analysis in this JSON format:
{
  "scoreAnalysis": {
    "medicationTrend": "improving|stable|declining",
    "dietTrend": "improving|stable|declining", 
    "exerciseTrend": "improving|stable|declining",
    "overallDirection": "string",
    "keyObservations": ["observation1", "observation2"]
  },
  "cpdPerformance": [
    {
      "category": "medication|diet|exercise",
      "complianceRate": number,
      "averageScore": number,
      "trend": "improving|stable|declining",
      "understanding": "excellent|good|fair|poor",
      "barriers": ["barrier1", "barrier2"]
    }
  ],
  "engagementLevel": "high|moderate|low",
  "sentimentScore": "positive|neutral|negative",
  "sentimentTrend": "improving|stable|declining",
  "helpSeekingFrequency": "high|moderate|low",
  "motivationalFactors": ["factor1", "factor2"],
  "complianceBarriers": ["barrier1", "barrier2"],
  "recommendedInterventions": ["intervention1", "intervention2"]
}`;

    // Use Claude for nuanced healthcare analysis
    const analysisResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: analysisPrompt
        }
      ]
    });

    const contentBlock = analysisResponse.content[0];
    const analysisText = (contentBlock && 'text' in contentBlock) ? contentBlock.text : '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Analysis parsing error:', parseError);
      analysis = this.generateFallbackAnalysis(patientData);
    }

    res.json({ analysis });
  } catch (error) {
    console.error('PPR analysis error:', error);
    res.status(500).json({ 
      error: 'PPR analysis failed',
      analysis: this.generateFallbackAnalysis(req.body.patientData || {})
    });
  }
});

/**
 * CPD Recommendations Generation Endpoint
 * 
 * Generates specific, actionable CPD updates based on comprehensive patient analysis.
 */
router.post('/cpd-recommendations', async (req, res) => {
  try {
    const { currentCPDs, analysisResults, patientProfile, performanceData } = cpdRecommendationSchema.parse(req.body);

    const recommendationPrompt = `You are a healthcare expert specializing in Care Plan Directive optimization. Based on comprehensive patient analysis, provide specific CPD update recommendations that will guide the patient toward consistent 8-10 health scores.

CURRENT PATIENT PERFORMANCE:
- Average Scores: Medication ${performanceData.averageScores.medication}/10, Diet ${performanceData.averageScores.diet}/10, Exercise ${performanceData.averageScores.exercise}/10
- Compliance Rates: Medication ${performanceData.complianceRates.medication}%, Diet ${performanceData.complianceRates.diet}%, Exercise ${performanceData.complianceRates.exercise}%
- Engagement Level: ${performanceData.engagementLevel}

CURRENT CPDs:
${currentCPDs.map((cpd: any) => `${cpd.category}: "${cpd.directive}"`).join('\n')}

ANALYSIS INSIGHTS:
- Overall Direction: ${analysisResults.scoreAnalysis?.overallDirection || 'Not available'}
- Key Barriers: ${analysisResults.complianceBarriers?.join(', ') || 'Not identified'}
- Motivational Factors: ${analysisResults.motivationalFactors?.join(', ') || 'Not identified'}

RECOMMENDATION CRITERIA:
1. CPDs must be specific, measurable, and achievable
2. Focus on addressing identified barriers to 8-10 scoring
3. Leverage patient's motivational factors
4. Consider cognitive load and complexity
5. Align with patient's demonstrated capabilities

For each CPD category needing updates, provide recommendations in this JSON format:
{
  "recommendations": [
    {
      "category": "medication|diet|exercise",
      "currentDirective": "current directive text",
      "recommendedDirective": "new optimized directive text",
      "rationale": "specific reason based on analysis",
      "expectedImpact": "predicted improvement in scoring",
      "implementationNotes": "guidance for doctor on introducing change",
      "successMetrics": "how to measure if the new CPD is working"
    }
  ],
  "overallStrategy": "summary of the CPD optimization approach",
  "timelineRecommendation": "when to evaluate effectiveness",
  "monitoringFocus": "what to watch for in next period"
}

Only recommend changes where analysis clearly indicates the current CPD is suboptimal. If current CPDs are working well, indicate no changes needed.`;

    // Use OpenAI for structured recommendation generation
    const recommendationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert healthcare analyst specializing in Care Plan Directive optimization. Provide precise, evidence-based recommendations that help patients achieve consistent 8-10 health scores."
        },
        {
          role: "user",
          content: recommendationPrompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const recommendationText = recommendationResponse.choices[0]?.message?.content;
    
    let recommendations;
    try {
      recommendations = JSON.parse(recommendationText || '{}');
    } catch (parseError) {
      console.error('Recommendations parsing error:', parseError);
      recommendations = this.generateFallbackRecommendations(currentCPDs);
    }

    res.json({ recommendations: recommendations.recommendations || [] });
  } catch (error) {
    console.error('CPD recommendations error:', error);
    res.status(500).json({ 
      error: 'CPD recommendations failed',
      recommendations: this.generateFallbackRecommendations(req.body.currentCPDs || [])
    });
  }
});

/**
 * Helper functions for the router
 */
function formatHealthScoresForAnalysis(healthScores: any[]) {
  if (!healthScores || healthScores.length === 0) {
    return 'No health scores available';
  }
  
  const recent = healthScores.slice(-7); // Last 7 entries
  return recent.map((score: any) => 
    `${score.date || 'Recent'}: Med ${score.medicationScore || 0}, Diet ${score.dietScore || 0}, Exercise ${score.exerciseScore || 0}`
  ).join('\n');
}

function extractSentimentIndicators(chatHistory: any[]) {
  if (!chatHistory || chatHistory.length === 0) {
    return 'No chat history available';
  }
  
  // Simple keyword analysis for sentiment indicators
  const positiveWords = ['good', 'great', 'better', 'improved', 'motivated', 'confident'];
  const negativeWords = ['difficult', 'hard', 'struggling', 'frustrated', 'tired', 'challenging'];
  
  const recentMessages = chatHistory.slice(-10);
  const positiveCount = recentMessages.filter((msg: any) => 
    positiveWords.some(word => msg.content?.toLowerCase().includes(word))
  ).length;
  
  const negativeCount = recentMessages.filter((msg: any) => 
    negativeWords.some(word => msg.content?.toLowerCase().includes(word))
  ).length;
  
  return `Recent sentiment indicators: ${positiveCount} positive, ${negativeCount} negative expressions`;
}

function generateFallbackAnalysis(patientData: any) {
  return {
    scoreAnalysis: {
      medicationTrend: 'stable',
      dietTrend: 'stable',
      exerciseTrend: 'stable',
      overallDirection: 'Unable to analyze - limited data',
      keyObservations: ['AI analysis unavailable', 'Manual review recommended']
    },
    cpdPerformance: [],
    engagementLevel: 'moderate',
    sentimentScore: 'neutral',
    sentimentTrend: 'stable',
    helpSeekingFrequency: 'moderate',
    motivationalFactors: ['Manual assessment needed'],
    complianceBarriers: ['Analysis unavailable'],
    recommendedInterventions: ['Schedule patient consultation']
  };
}

function generateFallbackRecommendations(currentCPDs: any[]) {
  return [{
    category: 'general',
    currentDirective: 'Current directives',
    recommendedDirective: 'Manual review recommended',
    rationale: 'AI analysis unavailable',
    expectedImpact: 'Unknown - requires manual assessment',
    implementationNotes: 'Conduct comprehensive patient review',
    successMetrics: 'Manual monitoring required'
  }];
}

export default router;