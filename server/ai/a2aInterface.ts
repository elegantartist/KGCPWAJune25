/**
 * Agent-to-Agent (A2A) Communication Interface Implementation
 * 
 * This implements A2A-compatible interfaces for agent coordination
 * while maintaining full compatibility with existing KGC functionality
 */

export interface A2AAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'busy' | 'offline';
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  action: string;
  payload: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface A2ACommunicationChannel {
  sendMessage(message: A2AMessage): Promise<void>;
  receiveMessage(): Promise<A2AMessage | null>;
  subscribe(agentId: string, handler: (message: A2AMessage) => Promise<void>): void;
  unsubscribe(agentId: string): void;
}

/**
 * A2A-compatible agent coordinator for KGC
 * Maintains all existing privacy and security controls
 */
export class KGCAgentCoordinator implements A2ACommunicationChannel {
  private agents: Map<string, A2AAgent> = new Map();
  private messageHandlers: Map<string, (message: A2AMessage) => Promise<void>> = new Map();
  private messageQueue: A2AMessage[] = [];
  private isActive = false;
  
  constructor() {
    this.initializeKGCAgents();
  }
  
  async start(): Promise<void> {
    if (this.isActive) return;
    
    console.log('[A2A] Starting agent coordination system...');
    this.isActive = true;
    console.log('[A2A] Agent coordinator active');
  }
  
  async stop(): Promise<void> {
    if (!this.isActive) return;
    
    console.log('[A2A] Stopping agent coordination system...');
    this.isActive = false;
    console.log('[A2A] Agent coordinator stopped');
  }
  
  async sendMessage(message: A2AMessage): Promise<void> {
    if (!this.isActive) {
      throw new Error('A2A coordinator not active');
    }
    
    console.log(`[A2A] Sending message from ${message.from} to ${message.to}: ${message.action}`);
    
    // Add to message queue for processing
    this.messageQueue.push(message);
    
    // Process message immediately if handler exists
    const handler = this.messageHandlers.get(message.to);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`[A2A] Error processing message for ${message.to}:`, error);
      }
    }
  }
  
  async receiveMessage(): Promise<A2AMessage | null> {
    if (!this.isActive) {
      throw new Error('A2A coordinator not active');
    }
    
    return this.messageQueue.shift() || null;
  }
  
  subscribe(agentId: string, handler: (message: A2AMessage) => Promise<void>): void {
    console.log(`[A2A] Agent ${agentId} subscribed to message handling`);
    this.messageHandlers.set(agentId, handler);
  }
  
  unsubscribe(agentId: string): void {
    console.log(`[A2A] Agent ${agentId} unsubscribed from message handling`);
    this.messageHandlers.delete(agentId);
  }
  
  // Get list of available agents
  getAvailableAgents(): A2AAgent[] {
    return Array.from(this.agents.values());
  }
  
  // Register a new agent
  registerAgent(agent: A2AAgent): void {
    console.log(`[A2A] Registering agent: ${agent.name} (${agent.id})`);
    this.agents.set(agent.id, agent);
  }
  
  // Update agent status
  updateAgentStatus(agentId: string, status: 'active' | 'busy' | 'offline'): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      console.log(`[A2A] Agent ${agentId} status updated to: ${status}`);
    }
  }
  
  // Find agents by capability
  findAgentsByCapability(capability: string): A2AAgent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.capabilities.includes(capability) && agent.status === 'active'
    );
  }
  
  // Create a standardized message
  createMessage(
    from: string,
    to: string,
    action: string,
    payload: any,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): A2AMessage {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      type: 'request',
      action,
      payload,
      timestamp: new Date(),
      priority
    };
  }
  
  private initializeKGCAgents(): void {
    // Register existing KGC agents with A2A capabilities
    
    this.registerAgent({
      id: 'supervisor-agent',
      name: 'Supervisor Agent',
      description: 'Central coordinator for patient interactions',
      capabilities: ['coordination', 'context-management', 'response-generation'],
      status: 'active'
    });
    
    this.registerAgent({
      id: 'privacy-protection-agent',
      name: 'Privacy Protection Agent',
      description: 'Handles PII anonymization and de-anonymization',
      capabilities: ['privacy-anonymize', 'privacy-deanonymize', 'pii-protection'],
      status: 'active'
    });
    
    this.registerAgent({
      id: 'multi-ai-evaluator',
      name: 'Multi-AI Evaluator',
      description: 'Evaluates responses using multiple AI models',
      capabilities: ['response-evaluation', 'quality-assurance', 'compliance-check'],
      status: 'active'
    });
    
    this.registerAgent({
      id: 'motivational-image-processor',
      name: 'Motivational Image Processor',
      description: 'Processes and analyzes motivational images',
      capabilities: ['image-analysis', 'motivation-assessment', 'visual-content'],
      status: 'active'
    });
    
    this.registerAgent({
      id: 'dietary-inspiration-agent',
      name: 'Dietary Inspiration Agent',
      description: 'Provides dietary recommendations and recipes',
      capabilities: ['recipe-search', 'dietary-guidance', 'nutrition-advice'],
      status: 'active'
    });
    
    this.registerAgent({
      id: 'exercise-wellness-agent',
      name: 'Exercise & Wellness Agent',
      description: 'Provides exercise and wellness recommendations',
      capabilities: ['exercise-guidance', 'wellness-advice', 'fitness-planning'],
      status: 'active'
    });
    
    this.registerAgent({
      id: 'medication-price-agent',
      name: 'Medication Best Price Agent',
      description: 'Searches for best medication prices',
      capabilities: ['price-search', 'medication-info', 'pharmacy-comparison'],
      status: 'active'
    });
  }
}

// Singleton instance for application-wide use
export const kgcAgentCoordinator = new KGCAgentCoordinator();