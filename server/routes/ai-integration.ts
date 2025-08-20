/**
 * AI Integration Routes for CPD-Driven Decision Making
 * 
 * These routes handle the core AI functionality that drives tool selection
 * and response generation based on Care Plan Directives.
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

// Tool selection request schema
const toolSelectionSchema = z.object({
  prompt: z.string(),
  userMessage: z.string(),
  tools: z.array(z.any()),
  cpds: z.array(z.any()).optional(),
  healthMetrics: z.any().optional()
});

/**
 * CPD-Driven Tool Selection Endpoint
 * 
 * This is the core intelligence of the KGC system - it uses AI to analyze
 * user intent against Care Plan Directives and select the optimal tool.
 */
router.post('/tool-selection', async (req, res) => {
  try {
    const { prompt, userMessage, tools, cpds, healthMetrics } = toolSelectionSchema.parse(req.body);

    // Use OpenAI for tool selection with CPD context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are the KGC Supervisor Agent, an expert in Care Plan Directive compliance using CBT and MI techniques. Your prime directive is helping patients achieve honest 8-10 scores through CPD alignment.

Key principles:
1. Always prioritize tools that best support existing Care Plan Directives
2. Consider current health scores when recommending tools
3. Use CBT and MI approaches to encourage authentic scoring
4. Focus on sustainable behavior change, not quick fixes

Respond only with valid JSON matching the requested format.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const selectionText = completion.choices[0]?.message?.content;
    
    if (!selectionText) {
      throw new Error('No response from AI tool selection');
    }

    const selection = JSON.parse(selectionText);
    
    res.json({ selection });
  } catch (error) {
    console.error('Tool selection error:', error);
    res.status(500).json({ 
      error: 'Tool selection failed',
      selection: { tool_name: null }
    });
  }
});

/**
 * Search Parameter Extraction Endpoint
 */
router.post('/extract-search-params', async (req, res) => {
  try {
    const { query, prompt } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting structured data from natural language queries. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from parameter extraction');
    }

    const parameters = JSON.parse(responseText);
    
    res.json({ parameters });
  } catch (error) {
    console.error('Parameter extraction error:', error);
    res.status(500).json({ 
      error: 'Parameter extraction failed',
      parameters: null
    });
  }
});

/**
 * CPD-Enhanced Response Generation
 * 
 * Uses both OpenAI and Anthropic to generate responses that are specifically
 * tailored to support Care Plan Directive compliance.
 */
router.post('/generate-cpd-response', async (req, res) => {
  try {
    const { 
      toolResponse, 
      userQuery, 
      cpds, 
      healthMetrics, 
      cbtMiApproach = 'both' 
    } = req.body;

    // Build CPD-aware enhancement prompt
    const cpdContext = cpds && cpds.length > 0
      ? `Active Care Plan Directives:\n${cpds.map(cpd => `${cpd.category}: "${cpd.directive}"`).join('\n')}`
      : 'No active Care Plan Directives';

    const enhancementPrompt = `Enhance this tool response to better support Care Plan Directive compliance and encourage honest 8-10 scoring:

ORIGINAL RESPONSE:
${toolResponse}

PATIENT CONTEXT:
${cpdContext}

Current Health Scores: ${healthMetrics ? `Diet: ${healthMetrics.dietScore}/10, Exercise: ${healthMetrics.exerciseScore}/10, Medication: ${healthMetrics.medicationScore}/10` : 'Not available'}

ENHANCEMENT GOALS:
1. Clearly connect recommendations to specific Care Plan Directives
2. Use ${cbtMiApproach} techniques to encourage behavior change
3. Guide patient toward honest 8-10 scoring in relevant categories
4. Maintain encouraging, supportive tone while being realistic

Enhanced response should:
- Reference specific CPDs when relevant
- Include CBT reframing or MI questions as appropriate
- Encourage honest self-assessment
- Provide concrete steps toward 8-10 scores

Provide the enhanced response in clear, everyday language.`;

    // Use Anthropic for response enhancement (Claude is often better at nuanced health communication)
    const enhancedResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: enhancementPrompt
        }
      ]
    });

    const contentBlock = enhancedResponse.content[0];
    const enhancedText = (contentBlock && 'text' in contentBlock) ? contentBlock.text : toolResponse;

    res.json({ enhancedResponse: enhancedText });
  } catch (error) {
    console.error('Response enhancement error:', error);
    res.status(500).json({ 
      error: 'Response enhancement failed',
      enhancedResponse: req.body.toolResponse // Fallback to original
    });
  }
});

export default router;