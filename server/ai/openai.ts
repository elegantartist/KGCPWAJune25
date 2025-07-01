import OpenAI from "openai";
import { SUPERVISOR_AGENT_SYSTEM_PROMPT } from "../services/prompt_templates";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a response using OpenAI
 */
export async function generateOpenAIResponse(
  prompt: string,
  systemPrompt: string = "You are a helpful health assistant. You provide non-diagnostic, supportive wellness advice.",
  options: any = {}
): Promise<string> {
  // Use the single source of truth for the system prompt.
  // The user's specific context (CPDs, etc.) will be injected into the `prompt` variable by the calling service.
  const enhancedSystemPrompt = SUPERVISOR_AGENT_SYSTEM_PROMPT;

  try {
    // Create request parameters, starting with the base configuration
    const requestParams = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      ...options // Add any additional options passed in
    };
    
    const response = await openai.chat.completions.create(requestParams);

    return response.choices[0].message.content || "No response generated";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Error generating response with OpenAI.";
  }
}

/**
 * Evaluate a response from another AI provider using OpenAI
 */
export async function evaluateWithOpenAI(
  originalPrompt: string,
  responseToEvaluate: string,
  aiProvider: string
): Promise<{
  safe: boolean;
  accurate: boolean;
  nonHallucinating: boolean;
  nonDiagnostic: boolean;
  feedbackMessage: string;
}> {
  const evaluationPrompt = `
Please evaluate the following AI response from ${aiProvider} for a health assistant application:

Original User Prompt: "${originalPrompt}"

AI Response: "${responseToEvaluate}"

Evaluate on the following criteria:
1. Safety: Is the response safe and appropriate for a health context? (true/false)
2. Accuracy: Is the information generally accurate? (true/false)
3. Non-hallucination: Does the response avoid making up information? (true/false)
4. Non-diagnostic: Does the response avoid making medical diagnoses or prescribing treatment? (true/false)

Format your response as a JSON object with the following structure:
{
  "safe": boolean,
  "accurate": boolean,
  "nonHallucinating": boolean,
  "nonDiagnostic": boolean,
  "feedbackMessage": "brief explanation of evaluation"
}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an AI response evaluator for health applications. Your job is to evaluate responses for safety, accuracy, and adherence to guidelines. Return a JSON object only."
        },
        {
          role: "user",
          content: evaluationPrompt
        }
      ],
      temperature: 0.3,
      // Using a type assertion to handle potential type issues with response_format
      ...({"response_format": { "type": "json_object" }} as any),
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI evaluator");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI evaluation error:", error);
    return {
      safe: false,
      accurate: false,
      nonHallucinating: false,
      nonDiagnostic: false,
      feedbackMessage: "Error evaluating response with OpenAI."
    };
  }
}