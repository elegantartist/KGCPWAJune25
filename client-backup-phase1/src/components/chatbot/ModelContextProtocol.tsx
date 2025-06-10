import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

// Interface for Care Plan Directive
export interface CarePlanDirective {
  id: number;
  userId: number;
  directive: string;
  category: string;
  targetValue: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Feature Usage
export interface FeatureUsage {
  id: number;
  userId: number;
  featureName: string;
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
}

// Interface for Chat Memory
export interface ChatMemory {
  id: number;
  userId: number;
  type: string;
  content: string;
  context: unknown;
  expiresAt: Date | null;
  createdAt: Date;
}

// Interface for Recommendation
export interface Recommendation {
  id: number;
  userId: number;
  directiveId: number | null;
  recommendedFeature: string;
  wasFollowed: boolean | null;
  scoreBeforeRecommendation: number | null;
  scoreAfterRecommendation: number | null;
  createdAt: Date;
  directive?: string; // Optional field added by the WebSocket server
}

// Interface for Patient Progress Report (PPR)
export interface PatientProgressReport {
  id: number;
  userId: number;
  doctorId: number;
  requestDate: Date;
  completionDate: Date | null;
  healthMetrics: {
    current: {
      dietScore: number;
      exerciseScore: number;
      medicationScore: number;
    };
    previous: {
      dietScore: number;
      exerciseScore: number;
      medicationScore: number;
    } | null;
  };
  featureUsageSummary: {
    featureName: string;
    usageCount: number;
    lastUsed: Date;
  }[];
  keepGoingSequenceCount: number;
  significantImprovements: string[];
  ongoingChallenges: string[];
  suggestedCarePlanDirectives: {
    directive: string;
    category: string;
    rationale: string;
  }[];
  status: 'requested' | 'in_progress' | 'completed';
  notes: string;
}

// Interface for AI validation response
export interface ValidatedAIResponse {
  primaryResponse: string;
  provider: string;
  alternativeResponses: Array<{
    provider: string;
    response: string;
  }>;
  evaluationSummary: string;
  allResponsesValid: boolean;
}

// WebSocket message types
type WebSocketMessage = 
  | { type: 'record_feature_usage', userId: number, featureName: string }
  | { type: 'feature_usage_recorded', success: boolean, featureName: string }
  | { type: 'request_recommendation', userId: number }
  | { type: 'recommendation', recommendation: Recommendation | null, message?: string }
  | { type: 'check_for_updated_cpds', userId: number }
  | { type: 'updated_cpds_available', updated: boolean, newDirectives?: CarePlanDirective[] }
  | { type: 'ppr_requested', userId: number, doctorId: number, requestId: number }
  | { type: 'ppr_status_update', requestId: number, status: string, report?: PatientProgressReport }
  | { type: 'error', message: string };

export class ModelContextProtocol {
  private static instance: ModelContextProtocol | null = null;
  private ws: WebSocket | null = null;
  private userId: number;
  private onRecommendationReceived: (recommendation: Recommendation | null) => void;
  private onConnectionChange: (connected: boolean) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 second delay
  
  // Singleton pattern - Get existing instance or create new one
  public static getInstance(
    userId: number, 
    onRecommendationReceived: (recommendation: Recommendation | null) => void = () => {},
    onConnectionChange: (connected: boolean) => void = () => {}
  ): ModelContextProtocol {
    if (!ModelContextProtocol.instance) {
      ModelContextProtocol.instance = new ModelContextProtocol(userId, onRecommendationReceived, onConnectionChange);
    } else if (ModelContextProtocol.instance.userId !== userId) {
      // If user ID changes, create a new instance
      ModelContextProtocol.instance.disconnect();
      ModelContextProtocol.instance = new ModelContextProtocol(userId, onRecommendationReceived, onConnectionChange);
    }
    
    return ModelContextProtocol.instance;
  }
  
  constructor(
    userId: number, 
    onRecommendationReceived: (recommendation: Recommendation | null) => void,
    onConnectionChange: (connected: boolean) => void = () => {}
  ) {
    this.userId = userId;
    this.onRecommendationReceived = onRecommendationReceived;
    this.onConnectionChange = onConnectionChange;
    this.connect();
  }
  
  private connect() {
    // Close any existing connection
    if (this.ws) {
      this.ws.close();
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('MCP WebSocket connection established');
      this.reconnectAttempts = 0;
      this.onConnectionChange(true);
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Handle different message types
        if (message.type === 'recommendation') {
          console.log('Received recommendation message:', message);
          console.log('Recommendation data:', message.recommendation);
          this.onRecommendationReceived(message.recommendation);
        }
        else if (message.type === 'error') {
          console.error('MCP Error:', message.message);
        }
        else if (message.type === 'feature_usage_recorded') {
          console.log(`Feature usage recorded: ${message.featureName}`);
        }
        else if (message.type === 'updated_cpds_available') {
          console.log('Updated CPDs available:', message.updated);
          if (message.updated && message.newDirectives) {
            console.log('New directives received:', message.newDirectives);
            // Here we would trigger appropriate UI updates or notifications
            // This will be implemented when the doctor dashboard is integrated
          }
        }
        else if (message.type === 'ppr_status_update') {
          console.log('PPR status update for request:', message.requestId, 'Status:', message.status);
          if (message.report) {
            console.log('Patient Progress Report generated:', message.report);
            // Handle newly generated patient progress report
            // This will be implemented when the doctor dashboard is integrated
          }
        }
      } catch (error) {
        console.error('Error parsing MCP message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('MCP WebSocket connection closed');
      this.onConnectionChange(false);
      
      // Try to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`Attempting to reconnect to MCP in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
          this.connect();
        }, delay);
      } else {
        console.error('Maximum MCP reconnection attempts reached');
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('MCP WebSocket error:', error);
    };
  }
  
  // Record feature usage
  public recordFeatureUsage(featureName: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'record_feature_usage',
        userId: this.userId,
        featureName
      };
      
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot record feature usage: MCP WebSocket not connected');
    }
  }
  
  // Request a recommendation
  public requestRecommendation() {
    console.log('Attempting to request recommendation for user ID:', this.userId);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket is open, sending recommendation request');
      const message: WebSocketMessage = {
        type: 'request_recommendation',
        userId: this.userId
      };
      
      console.log('Sending message:', JSON.stringify(message));
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot request recommendation: MCP WebSocket not connected');
      console.log('WebSocket state:', this.ws ? this.ws.readyState : 'null');
    }
  }
  
  // Close the connection
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  // Check if connected
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  // Generate a validated response using the MCP system
  public async generateValidatedResponse(
    prompt: string, 
    systemPrompt?: string,
    healthCategory?: string
  ): Promise<ValidatedAIResponse> {
    console.log('Generating validated response with prompt:', prompt);
    try {
      const response = await apiRequest<ValidatedAIResponse>('POST', '/api/mcp/generate', {
        prompt,
        systemPrompt,
        healthCategory
      });
      
      // Record that the chatbot feature was used
      this.recordFeatureUsage('chatbot');
      
      return response;
    } catch (error) {
      console.error('Error generating validated response:', error);
      return {
        primaryResponse: "I'm sorry, but I'm having trouble processing your request right now. Could you try again in a moment?",
        provider: "error",
        alternativeResponses: [],
        evaluationSummary: "Error generating response",
        allResponsesValid: false
      };
    }
  }
  
  // Check for updated Care Plan Directives from the doctor
  public checkForUpdatedCPDs(callback?: (directives: CarePlanDirective[]) => void) {
    console.log('Checking for updated CPDs for user ID:', this.userId);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Setup a one-time listener for the response
      const messageHandler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data) as WebSocketMessage;
          
          if (response.type === 'updated_cpds_available' && response.updated && response.newDirectives) {
            console.log('Received updated CPDs:', response.newDirectives);
            
            // Broadcast the updated CPDs
            if (callback) {
              callback(response.newDirectives);
            }
            
            // Remove the one-time listener
            this.ws?.removeEventListener('message', messageHandler);
          }
        } catch (error) {
          console.error('Error processing CPD update response:', error);
        }
      };
      
      // Add a temporary listener for this specific response
      this.ws.addEventListener('message', messageHandler);
      
      // Send the request
      const message: WebSocketMessage = {
        type: 'check_for_updated_cpds',
        userId: this.userId
      };
      
      console.log('Sending check_for_updated_cpds message');
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot check for updated CPDs: MCP WebSocket not connected');
      console.log('WebSocket state:', this.ws ? this.ws.readyState : 'null');
    }
  }
  
  // Handle a doctor's request for a Patient Progress Report
  public handlePPRRequest(requestId: number, doctorId: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'ppr_requested',
        userId: this.userId,
        doctorId: doctorId,
        requestId: requestId
      };
      
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot handle PPR request: MCP WebSocket not connected');
    }
  }
}

// React hook for using the MCP in components
export function useMCP(userId: number) {
  const [mcp, setMcp] = useState<ModelContextProtocol | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [carePlanDirectives, setCarePlanDirectives] = useState<CarePlanDirective[]>([]);
  
  useEffect(() => {
    // Use the singleton pattern to get or create an MCP instance
    const mcpInstance = ModelContextProtocol.getInstance(
      userId,
      (newRecommendation) => setRecommendation(newRecommendation),
      (connected) => setIsConnected(connected)
    );
    
    setMcp(mcpInstance);
    
    // Fetch initial CPDs on first load
    fetchActiveCarePlanDirectives(userId)
      .then(directives => {
        console.log('Initial CPDs loaded:', directives);
        setCarePlanDirectives(directives);
      })
      .catch(error => {
        console.error('Error loading initial CPDs:', error);
      });
    
    // No cleanup needed for singleton instance
  }, [userId]);
  
  // Helper functions to use the MCP
  const recordFeatureUsage = (featureName: string) => {
    mcp?.recordFeatureUsage(featureName);
  };
  
  const requestRecommendation = () => {
    mcp?.requestRecommendation();
  };
  
  const generateValidatedResponse = async (
    prompt: string,
    systemPrompt?: string,
    healthCategory?: string
  ): Promise<ValidatedAIResponse | null> => {
    if (mcp) {
      return mcp.generateValidatedResponse(prompt, systemPrompt, healthCategory);
    }
    return null;
  };
  
  // Doctor dashboard integration functions
  const checkForUpdatedCPDs = (callback?: (directives: CarePlanDirective[]) => void) => {
    console.log('Checking for updated Care Plan Directives');
    mcp?.checkForUpdatedCPDs((newDirectives) => {
      console.log('Updated CPDs received:', newDirectives);
      
      // Update the local state with new directives
      setCarePlanDirectives(newDirectives);
      
      // Call the callback if provided
      if (callback) {
        callback(newDirectives);
      }
    });
  };
  
  const handlePPRRequest = (requestId: number, doctorId: number) => {
    mcp?.handlePPRRequest(requestId, doctorId);
  };
  
  return {
    mcp,
    isConnected,
    recommendation,
    carePlanDirectives,
    recordFeatureUsage,
    requestRecommendation,
    generateValidatedResponse,
    checkForUpdatedCPDs,
    handlePPRRequest
  };
}

// Function to fetch care plan directives
export async function fetchCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
  return apiRequest<CarePlanDirective[]>('GET', `/api/users/${userId}/care-plan-directives`);
}

// Function to fetch active care plan directives 
export async function fetchActiveCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
  return apiRequest<CarePlanDirective[]>('GET', `/api/users/${userId}/care-plan-directives/active`);
}

// Function to fetch feature usage
export async function fetchFeatureUsage(userId: number, featureName?: string): Promise<FeatureUsage[]> {
  const url = featureName
    ? `/api/users/${userId}/feature-usage?feature=${encodeURIComponent(featureName)}`
    : `/api/users/${userId}/feature-usage`;
    
  return apiRequest<FeatureUsage[]>('GET', url);
}

// Function to fetch most used features
export async function fetchMostUsedFeatures(userId: number, limit: number = 5): Promise<FeatureUsage[]> {
  return apiRequest<FeatureUsage[]>('GET', `/api/users/${userId}/feature-usage/most-used?limit=${limit}`);
}

// Function to fetch chat memories
export async function fetchChatMemories(userId: number, type?: string): Promise<ChatMemory[]> {
  const url = type
    ? `/api/users/${userId}/chat-memories?type=${encodeURIComponent(type)}`
    : `/api/users/${userId}/chat-memories`;
    
  return apiRequest<ChatMemory[]>('GET', url);
}

// Function to fetch recommendations
export async function fetchRecommendations(userId: number): Promise<Recommendation[]> {
  return apiRequest<Recommendation[]>('GET', `/api/users/${userId}/recommendations`);
}

// Function to fetch recent recommendations
export async function fetchRecentRecommendations(userId: number, limit: number = 5): Promise<Recommendation[]> {
  return apiRequest<Recommendation[]>('GET', `/api/users/${userId}/recommendations/recent?limit=${limit}`);
}

// Function to fetch successful recommendations
export async function fetchSuccessfulRecommendations(userId: number): Promise<Recommendation[]> {
  return apiRequest<Recommendation[]>('GET', `/api/users/${userId}/recommendations/successful`);
}

// Function to fetch patient progress reports
export async function fetchPatientProgressReports(userId: number): Promise<PatientProgressReport[]> {
  return apiRequest<PatientProgressReport[]>('GET', `/api/users/${userId}/progress-reports`);
}

// Function to fetch a specific patient progress report
export async function fetchPatientProgressReport(reportId: number): Promise<PatientProgressReport> {
  return apiRequest<PatientProgressReport>('GET', `/api/progress-reports/${reportId}`);
}

// Function to check if there are any pending PPR requests from doctors
export async function checkPendingPPRRequests(userId: number): Promise<{
  hasPendingRequests: boolean;
  requests: { id: number; doctorId: number; requestDate: Date }[];
}> {
  return apiRequest<{
    hasPendingRequests: boolean;
    requests: { id: number; doctorId: number; requestDate: Date }[];
  }>('GET', `/api/users/${userId}/progress-reports/pending`);
}