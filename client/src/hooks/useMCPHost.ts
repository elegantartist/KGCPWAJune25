/**
 * MCP Host Hook for Client-Side Model Context Protocol
 * 
 * This hook implements the client-side MCP host agent that communicates
 * with the KGC MCP server to provide enhanced patient experiences.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// MCP Protocol Types
export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  sampling?: boolean;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  description: string;
  capabilities: MCPCapabilities;
}

export interface MCPHostState {
  isConnected: boolean;
  isInitialized: boolean;
  serverInfo?: MCPServerInfo;
  availableTools: MCPTool[];
  availableResources: MCPResource[];
  error?: string;
}

/**
 * MCP Host Hook
 */
export function useMCPHost(userId: number) {
  const [state, setState] = useState<MCPHostState>({
    isConnected: false,
    isInitialized: false,
    availableTools: [],
    availableResources: []
  });
  
  const [requestCounter, setRequestCounter] = useState(0);
  const { toast } = useToast();

  /**
   * Generate unique request ID
   */
  const generateRequestId = useCallback(() => {
    setRequestCounter(prev => prev + 1);
    return `mcp-${Date.now()}-${requestCounter}`;
  }, [requestCounter]);

  /**
   * Send MCP request to server
   */
  const sendMCPRequest = useCallback(async (method: string, params?: any): Promise<MCPResponse> => {
    const request: MCPRequest = {
      id: generateRequestId(),
      method,
      params
    };

    try {
      const response = await apiRequest('POST', '/api/mcp', {
        request,
        userId
      });
      
      return response as MCPResponse;
    } catch (error) {
      console.error('[MCP Host] Request failed:', error);
      throw new Error(`MCP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [generateRequestId, userId]);

  /**
   * Initialize MCP connection
   */
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: undefined }));
      
      // Send initialize request
      const response = await sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
          sampling: false
        },
        clientInfo: {
          name: 'KGC Patient Dashboard',
          version: '1.0.0',
          description: 'Keep Going Care patient dashboard MCP client'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const serverInfo = response.result;
      
      // Get available tools
      const toolsResponse = await sendMCPRequest('tools/list');
      const tools = toolsResponse.error ? [] : toolsResponse.result?.tools || [];
      
      // Get available resources
      const resourcesResponse = await sendMCPRequest('resources/list');
      const resources = resourcesResponse.error ? [] : resourcesResponse.result?.resources || [];

      setState(prev => ({
        ...prev,
        isConnected: true,
        isInitialized: true,
        serverInfo,
        availableTools: tools,
        availableResources: resources
      }));

      console.log('[MCP Host] Successfully connected to KGC MCP Server');
      console.log('[MCP Host] Available tools:', tools.map((t: MCPTool) => t.name));
      console.log('[MCP Host] Available resources:', resources.map((r: MCPResource) => r.uri));

    } catch (error) {
      console.error('[MCP Host] Initialization failed:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isInitialized: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      }));
    }
  }, [sendMCPRequest]);

  /**
   * Call an MCP tool
   */
  const callTool = useCallback(async (toolName: string, args: any = {}) => {
    if (!state.isConnected) {
      throw new Error('MCP server not connected');
    }

    try {
      const response = await sendMCPRequest('tools/call', {
        name: toolName,
        arguments: { ...args, userId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.result;
    } catch (error) {
      console.error(`[MCP Host] Tool call failed for ${toolName}:`, error);
      throw error;
    }
  }, [state.isConnected, sendMCPRequest, userId]);

  /**
   * Read an MCP resource
   */
  const readResource = useCallback(async (uri: string) => {
    if (!state.isConnected) {
      throw new Error('MCP server not connected');
    }

    try {
      const response = await sendMCPRequest('resources/read', { uri });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.result;
    } catch (error) {
      console.error(`[MCP Host] Resource read failed for ${uri}:`, error);
      throw error;
    }
  }, [state.isConnected, sendMCPRequest]);

  /**
   * Enhanced patient query processing using multiple MCP tools
   */
  const processPatientQuery = useCallback(async (query: string, context?: any) => {
    if (!state.isConnected) {
      throw new Error('MCP server not connected');
    }

    try {
      // Analyze query to determine which tools might be relevant
      const relevantTools = analyzeQueryForTools(query, state.availableTools);
      
      console.log('[MCP Host] Processing patient query:', query);
      console.log('[MCP Host] Relevant tools identified:', relevantTools);

      // Gather context from resources
      const healthMetrics = await readResource('kgc://patient/health-metrics').catch(() => null);
      const carePlanDirectives = await readResource('kgc://patient/care-plan-directives').catch(() => null);
      
      // Execute relevant tools based on query analysis
      const toolResults = await Promise.allSettled(
        relevantTools.map(async (toolName) => {
          const result = await callTool(toolName, {
            query,
            context: {
              ...context,
              healthMetrics: healthMetrics?.contents?.[0] ? JSON.parse(healthMetrics.contents[0].text) : null,
              carePlanDirectives: carePlanDirectives?.contents?.[0] ? JSON.parse(carePlanDirectives.contents[0].text) : null
            }
          });
          return { tool: toolName, result };
        })
      );

      // Process results and compile response
      const successfulResults = toolResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedResults = toolResults
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      if (failedResults.length > 0) {
        console.warn('[MCP Host] Some tool calls failed:', failedResults);
      }

      return {
        query,
        toolResults: successfulResults,
        errors: failedResults,
        recommendations: compileRecommendations(successfulResults),
        suggestedFeatures: compileSuggestedFeatures(successfulResults)
      };

    } catch (error) {
      console.error('[MCP Host] Query processing failed:', error);
      throw error;
    }
  }, [state.isConnected, state.availableTools, readResource, callTool]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (userId && !state.isInitialized) {
      initialize();
    }
  }, [userId, state.isInitialized, initialize]);

  /**
   * Reconnect if connection lost
   */
  useEffect(() => {
    if (state.error && !state.isConnected) {
      const reconnectTimer = setTimeout(() => {
        console.log('[MCP Host] Attempting to reconnect...');
        initialize();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [state.error, state.isConnected, initialize]);

  return {
    // Connection state
    isConnected: state.isConnected,
    isInitialized: state.isInitialized,
    error: state.error,
    serverInfo: state.serverInfo,
    
    // Available capabilities
    availableTools: state.availableTools,
    availableResources: state.availableResources,
    
    // Core methods
    initialize,
    callTool,
    readResource,
    processPatientQuery,
    
    // Direct tool shortcuts for common operations
    getHealthMetrics: useCallback(() => callTool('health-metrics', { action: 'get_latest' }), [callTool]),
    getHealthTrends: useCallback((period: string = '30days') => callTool('health-metrics', { action: 'get_trends', period }), [callTool]),
    searchFood: useCallback((query: string) => callTool('food-database', { action: 'search', query }), [callTool]),
    getMealIdeas: useCallback((preferences?: any) => callTool('inspiration-machine-d', { action: 'get_ideas', preferences }), [callTool]),
    findMedications: useCallback((medication: string) => callTool('mbp-wizard', { action: 'search', medication }), [callTool]),
    findExercise: useCallback((location?: string, type?: string) => callTool('ew-support', { action: 'search', location, type }), [callTool]),
    getProgressMilestones: useCallback(() => callTool('progress-milestones', { action: 'get_status' }), [callTool])
  };
}

/**
 * Analyze patient query to determine relevant tools
 */
function analyzeQueryForTools(query: string, availableTools: MCPTool[]): string[] {
  const queryLower = query.toLowerCase();
  const relevantTools: string[] = [];

  // Health metrics keywords
  if (queryLower.includes('score') || queryLower.includes('health') || queryLower.includes('progress') || 
      queryLower.includes('medication') || queryLower.includes('diet') || queryLower.includes('exercise')) {
    relevantTools.push('health-metrics');
  }

  // Food and nutrition keywords
  if (queryLower.includes('food') || queryLower.includes('meal') || queryLower.includes('eat') || 
      queryLower.includes('nutrition') || queryLower.includes('recipe') || queryLower.includes('cook')) {
    relevantTools.push('food-database');
    relevantTools.push('inspiration-machine-d');
  }

  // Medication keywords
  if (queryLower.includes('medication') || queryLower.includes('medicine') || queryLower.includes('drug') || 
      queryLower.includes('pharmacy') || queryLower.includes('prescription')) {
    relevantTools.push('mbp-wizard');
  }

  // Exercise keywords
  if (queryLower.includes('exercise') || queryLower.includes('gym') || queryLower.includes('fitness') || 
      queryLower.includes('workout') || queryLower.includes('activity') || queryLower.includes('physical')) {
    relevantTools.push('ew-support');
  }

  // Progress and achievement keywords
  if (queryLower.includes('progress') || queryLower.includes('achievement') || queryLower.includes('milestone') || 
      queryLower.includes('reward') || queryLower.includes('badge')) {
    relevantTools.push('progress-milestones');
  }

  // Care plan keywords
  if (queryLower.includes('care plan') || queryLower.includes('directive') || queryLower.includes('doctor') || 
      queryLower.includes('goal')) {
    relevantTools.push('care-plan-directives');
  }

  // If no specific keywords found, include health metrics as default
  if (relevantTools.length === 0) {
    relevantTools.push('health-metrics');
  }

  // Remove duplicates and ensure tools exist
  return Array.from(new Set(relevantTools)).filter(toolName => 
    availableTools.some(tool => tool.name === toolName)
  );
}

/**
 * Compile recommendations from tool results
 */
function compileRecommendations(toolResults: any[]): string[] {
  const recommendations: string[] = [];
  
  toolResults.forEach(({ tool, result }) => {
    if (result?.recommendations) {
      recommendations.push(...result.recommendations);
    }
    if (result?.insights) {
      recommendations.push(...result.insights);
    }
  });

  return Array.from(new Set(recommendations)); // Remove duplicates
}

/**
 * Compile suggested KGC features from tool results
 */
function compileSuggestedFeatures(toolResults: any[]): any[] {
  const features: any[] = [];
  
  toolResults.forEach(({ tool, result }) => {
    if (result?.kgcFeatureSuggestions) {
      features.push(...result.kgcFeatureSuggestions);
    }
    if (result?.suggestedFeatures) {
      features.push(...result.suggestedFeatures);
    }
  });

  // Remove duplicates based on feature name
  const uniqueFeatures = features.filter((feature, index, self) => 
    index === self.findIndex(f => f.feature === feature.feature)
  );

  return uniqueFeatures;
}