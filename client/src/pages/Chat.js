/**
 * Chat.js - The Host (Head Chef)
 * 
 * This is the main chat interface that implements the Supervisor-Agent architecture.
 * It acts as the "Head Chef" that receives customer orders (user messages), determines
 * what specialist tools are needed, and coordinates the response.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { routeRequest, getAvailableTools } from '@/components/mcp_client/router.js';
import { apiRequest } from '@/lib/queryClient';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userId] = useState(2); // Reuben Collins - Patient
  const [userContext, setUserContext] = useState({});
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user context (CPDs, health data, etc.)
  useEffect(() => {
    loadUserContext();
  }, []);

  /**
   * Load user context including Care Plan Directives and recent health data
   */
  const loadUserContext = async () => {
    try {
      const [cpdsResponse, healthResponse] = await Promise.allSettled([
        apiRequest('/api/care-plan-directives'),
        apiRequest('/api/health-metrics/latest')
      ]);

      setUserContext({
        userId,
        carePlanDirectives: cpdsResponse.status === 'fulfilled' ? cpdsResponse.value : [],
        healthMetrics: healthResponse.status === 'fulfilled' ? healthResponse.value : null
      });
    } catch (error) {
      console.error('[Chat] Error loading user context:', error);
    }
  };

  /**
   * Stage 1: Supervisor Agent - Intent Recognition and Tool Selection
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Step 1: Use LLM to determine the best tool and extract core query
      const toolSelection = await selectAppropriateTools(inputValue);
      
      if (toolSelection.tool_name) {
        // Step 2: Route to the appropriate specialist server with CPD guidance
        const enrichedContext = {
          ...userContext,
          cpdGuidance: toolSelection.cpd_alignment,
          primeDirective: {
            goal: 'achieve_8_10_scores',
            focus: 'cpd_compliance',
            approach: toolSelection.cpd_alignment?.cbt_mi_approach || 'both'
          }
        };

        const response = await routeRequest(
          toolSelection.tool_name, 
          toolSelection.argument || inputValue,
          enrichedContext
        );

        // Step 3: Display the response
        const assistantMessage = {
          id: Date.now() + 1,
          text: response,
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback for unrecognized requests
        const fallbackMessage = {
          id: Date.now() + 1,
          text: "I'm not sure how to help with that specific request. You can ask me about health metrics, meal planning, exercise options, medication support, or other health-related topics.",
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('[Chat] Error processing message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I encountered an issue processing your request. Please try again or rephrase your question.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  /**
   * CPD-Driven Tool Selection - The Core AI Decision Making Process
   * 
   * This function implements the fundamental KGC intelligence:
   * 1. Analyzes user intent against their Care Plan Directives
   * 2. Selects tools that best support CPD compliance and 8-10 scoring
   * 3. Primes the response generation with CBT/MI context
   */
  const selectAppropriateTools = async (userMessage) => {
    try {
      const availableTools = getAvailableTools();
      const cpds = userContext.carePlanDirectives || [];
      const healthMetrics = userContext.healthMetrics || {};

      // Build CPD-aware prompt that drives tool selection
      const cpdContext = cpds.length > 0 
        ? cpds.map(cpd => `${cpd.category}: "${cpd.directive}"`).join('\n')
        : 'No active Care Plan Directives';

      const currentScores = healthMetrics 
        ? `Diet: ${healthMetrics.dietScore || 'unknown'}/10, Exercise: ${healthMetrics.exerciseScore || 'unknown'}/10, Medication: ${healthMetrics.medicationScore || 'unknown'}/10`
        : 'No recent health scores';

      const prompt = `As the KGC Supervisor Agent, your prime directive is to help this patient consistently achieve 8-10 scores in all health categories through Care Plan Directive compliance using CBT and MI techniques.

PATIENT CONTEXT:
Care Plan Directives:
${cpdContext}

Current Health Scores:
${currentScores}

User Message: "${userMessage}"

AVAILABLE TOOLS:
${availableTools.map(tool => `${tool.name}: ${tool.description}`).join('\n')}

DECISION FRAMEWORK:
1. Which Care Plan Directive(s) does this message relate to most strongly?
2. Which tool can best support CPD compliance and move scores toward 8-10?
3. What CBT/MI approach should be used (motivation, behavior change, reflection)?

Respond with JSON:
{
  "tool_name": "exact_tool_name_from_list",
  "argument": "core_user_query",
  "cpd_alignment": {
    "primary_cpd": "which CPD category this supports",
    "compliance_opportunity": "how this can improve 8-10 scoring",
    "cbt_mi_approach": "motivational_interviewing|cognitive_behavioral_therapy|both"
  },
  "reasoning": "why this tool best supports CPD compliance"
}

If no tool matches, return {"tool_name": null}`;

      const response = await apiRequest('/api/ai/tool-selection', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          userMessage,
          tools: availableTools,
          cpds,
          healthMetrics
        })
      });

      return response.selection || { tool_name: null };
    } catch (error) {
      console.error('[Chat] CPD-driven tool selection error:', error);
      return { tool_name: null };
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">KGC Health Assistant</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          Supervisor-Agent Architecture
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Welcome to your KGC Health Assistant</p>
            <p className="text-sm">Ask me about exercise options, meal planning, health metrics, medication support, or any health-related topic.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${
              message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing your request...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your health goals, find local fitness options, get meal ideas..."
            className="flex-1 min-h-[60px] resize-none"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            size="lg"
            className="px-6"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}