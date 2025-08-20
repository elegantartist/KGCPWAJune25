/**
 * KGC MCP Server Implementation
 * 
 * This server implements the Anthropic Model Context Protocol (MCP) for the
 * Keep Going Care healthcare platform. It exposes healthcare-specific tools
 * that can be used by AI models to provide personalized patient support.
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import { CarePlanDirective, HealthMetric } from '@shared/schema';
import { auditLogger } from '../../auditLogger';
import { privacyProtectionAgent } from '../../services/privacyProtectionAgent';

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
  inputSchema: z.ZodSchema;
  handler: (params: any, context: MCPContext) => Promise<any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (uri: string, context: MCPContext) => Promise<any>;
}

export interface MCPContext {
  userId: number;
  userRole: 'patient' | 'doctor' | 'admin';
  carePlanDirectives: CarePlanDirective[];
  healthMetrics?: HealthMetric;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  sampling?: boolean;
}

export class KGCMCPServer extends EventEmitter {
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private capabilities: MCPCapabilities = {
    tools: true,
    resources: true,
    prompts: true,
    sampling: false
  };

  constructor() {
    super();
    this.initializeKGCTools();
    this.initializeKGCResources();
  }

  /**
   * Initialize KGC-specific MCP tools
   */
  private async initializeKGCTools(): Promise<void> {
    try {
      // Import and register all KGC tools
      const { healthMetricsTool } = await import('../tools/health-metrics');
      const { inspirationMachineDTool } = await import('../tools/inspiration-machine-d');
      const { mbpWizardTool } = await import('../tools/mbp-wizard');
      const { foodDatabaseTool } = await import('../tools/food-database');
      const { ewSupportTool } = await import('../tools/ew-support');
      const { progressMilestonesTool } = await import('../tools/progress-milestones');
      const { carePlanDirectivesTool } = await import('../tools/care-plan-directives');
      const { journalingTool } = await import('../tools/journaling');
      const { motivationalImagingTool } = await import('../tools/motivational-imaging');

      this.registerTool(healthMetricsTool);
      this.registerTool(inspirationMachineDTool);
      this.registerTool(mbpWizardTool);
      this.registerTool(foodDatabaseTool);
      this.registerTool(ewSupportTool);
      this.registerTool(progressMilestonesTool);
      this.registerTool(carePlanDirectivesTool);
      this.registerTool(journalingTool);
      this.registerTool(motivationalImagingTool);

      console.log(`[KGC MCP Server] Initialized ${this.tools.size} tools`);
    } catch (error) {
      console.error('[KGC MCP Server] Error initializing tools:', error);
    }
  }

  /**
   * Initialize KGC-specific MCP resources
   */
  private async initializeKGCResources(): Promise<void> {
    // Patient health data resources
    this.registerResource({
      uri: 'kgc://patient/health-metrics',
      name: 'Health Metrics',
      description: 'Patient daily self-scores and health tracking data',
      mimeType: 'application/json',
      handler: async (uri: string, context: MCPContext) => {
        return await this.getPatientHealthMetrics(context.userId);
      }
    });

    this.registerResource({
      uri: 'kgc://patient/care-plan-directives',
      name: 'Care Plan Directives',
      description: 'Active care plan directives from patient\'s doctor',
      mimeType: 'application/json',
      handler: async (uri: string, context: MCPContext) => {
        return context.carePlanDirectives;
      }
    });

    this.registerResource({
      uri: 'kgc://patient/progress-summary',
      name: 'Progress Summary',
      description: 'Patient progress summary and milestones',
      mimeType: 'application/json',
      handler: async (uri: string, context: MCPContext) => {
        return await this.getPatientProgressSummary(context.userId);
      }
    });

    console.log(`[KGC MCP Server] Initialized ${this.resources.size} resources`);
  }

  /**
   * Register an MCP tool
   */
  public registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[KGC MCP Server] Registered tool: ${tool.name}`);
  }

  /**
   * Register an MCP resource
   */
  public registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
    console.log(`[KGC MCP Server] Registered resource: ${resource.uri}`);
  }

  /**
   * Handle incoming MCP requests
   */
  public async handleRequest(request: MCPRequest, context: MCPContext): Promise<MCPResponse> {
    try {
      // Log the request for audit purposes
      await auditLogger.logDataAccess({
        userId: context.userId,
        dataType: 'mcp_request',
        operation: request.method,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { 
          method: request.method, 
          toolName: request.params?.name,
          sessionId: context.sessionId
        }
      });

      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        
        case 'tools/list':
          return this.handleToolsList(request);
        
        case 'tools/call':
          return await this.handleToolCall(request, context);
        
        case 'resources/list':
          return this.handleResourcesList(request);
        
        case 'resources/read':
          return await this.handleResourceRead(request, context);
        
        default:
          return {
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }
    } catch (error) {
      console.error('[KGC MCP Server] Error handling request:', error);
      return {
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Handle MCP initialize request
   */
  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: 'KGC Healthcare MCP Server',
          version: '1.0.0',
          description: 'Model Context Protocol server for Keep Going Care healthcare platform'
        }
      }
    };
  }

  /**
   * Handle tools list request
   */
  private handleToolsList(request: MCPRequest): MCPResponse {
    const toolsList = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema.shape ? 
        this.zodSchemaToJsonSchema(tool.inputSchema) : 
        tool.inputSchema
    }));

    return {
      id: request.id,
      result: {
        tools: toolsList
      }
    };
  }

  /**
   * Handle tool call request
   */
  private async handleToolCall(request: MCPRequest, context: MCPContext): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;
    
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        id: request.id,
        error: {
          code: -32602,
          message: `Tool not found: ${name}`
        }
      };
    }

    try {
      // Validate input parameters
      const validatedArgs = tool.inputSchema.parse(args);
      
      // Apply privacy protection if needed
      const protectedArgs = await privacyProtectionAgent.anonymizeData(
        JSON.stringify(validatedArgs),
        context.userId,
        `mcp-tool-${name}`
      );
      
      // Execute the tool
      const result = await tool.handler(
        JSON.parse(protectedArgs.anonymizedData), 
        context
      );

      // De-anonymize the result if needed
      const finalResult = protectedArgs.hasPersonalData ? 
        await privacyProtectionAgent.deanonymizeData(
          JSON.stringify(result),
          protectedArgs.sessionId
        ) : result;

      return {
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      console.error(`[KGC MCP Server] Error executing tool ${name}:`, error);
      return {
        id: request.id,
        error: {
          code: -32603,
          message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Handle resources list request
   */
  private handleResourcesList(request: MCPRequest): MCPResponse {
    const resourcesList = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));

    return {
      id: request.id,
      result: {
        resources: resourcesList
      }
    };
  }

  /**
   * Handle resource read request
   */
  private async handleResourceRead(request: MCPRequest, context: MCPContext): Promise<MCPResponse> {
    const { uri } = request.params;
    
    const resource = this.resources.get(uri);
    if (!resource) {
      return {
        id: request.id,
        error: {
          code: -32602,
          message: `Resource not found: ${uri}`
        }
      };
    }

    try {
      const data = await resource.handler(uri, context);
      
      return {
        id: request.id,
        result: {
          contents: [
            {
              uri,
              mimeType: resource.mimeType,
              text: JSON.stringify(data, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      console.error(`[KGC MCP Server] Error reading resource ${uri}:`, error);
      return {
        id: request.id,
        error: {
          code: -32603,
          message: `Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Convert Zod schema to JSON Schema (simplified)
   */
  private zodSchemaToJsonSchema(schema: z.ZodSchema): any {
    // This is a simplified conversion - in production you'd use a library like zod-to-json-schema
    if (schema instanceof z.ZodObject) {
      const properties: any = {};
      const shape = schema.shape;
      
      for (const [key, value] of Object.entries(shape)) {
        if (value instanceof z.ZodString) {
          properties[key] = { type: 'string' };
        } else if (value instanceof z.ZodNumber) {
          properties[key] = { type: 'number' };
        } else if (value instanceof z.ZodBoolean) {
          properties[key] = { type: 'boolean' };
        } else {
          properties[key] = { type: 'string' }; // fallback
        }
      }
      
      return {
        type: 'object',
        properties,
        required: Object.keys(shape)
      };
    }
    
    return { type: 'object' }; // fallback
  }

  /**
   * Helper methods for resource handlers
   */
  private async getPatientHealthMetrics(userId: number): Promise<any> {
    // Import storage here to avoid circular dependencies
    const { storage } = await import('../../storage');
    return await storage.getLatestHealthMetricsForUser(userId);
  }

  private async getPatientProgressSummary(userId: number): Promise<any> {
    // Import storage here to avoid circular dependencies
    const { storage } = await import('../../storage');
    return await storage.getProgressMilestonesForUser(userId);
  }
}

// Export singleton instance
export const kgcMCPServer = new KGCMCPServer();