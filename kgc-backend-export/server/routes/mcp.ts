/**
 * MCP Routes - Model Context Protocol endpoints
 * 
 * This file handles all MCP communication between the client-side host agent
 * and the server-side KGC tools for the patient dashboard experience.
 */

import { Router, Request, Response } from 'express';
import { kgcMCPServer, MCPRequest, MCPContext } from '../mcp/core/MCPServer';
import { storage } from '../storage';
import { securityManager } from '../securityManager';

const router = Router();

// Helper to extract MCP context from request
async function buildMCPContext(req: Request, userId: number): Promise<MCPContext> {
  const session = req.session as any;
  
  // Get user's care plan directives
  const carePlanDirectives = await storage.getActiveCarePlanDirectives(userId);
  
  // Get user's health metrics for context
  const healthMetrics = await storage.getLatestHealthMetricsForUser(userId);
  
  return {
    userId,
    userRole: session.userRole || 'patient',
    carePlanDirectives: carePlanDirectives || [],
    healthMetrics,
    sessionId: req.sessionID,
    ipAddress: securityManager.getClientIP(req),
    userAgent: req.get('User-Agent') || 'unknown'
  };
}

/**
 * Main MCP endpoint - handles all MCP protocol requests
 */
router.post('/api/mcp', async (req: Request, res: Response) => {
  try {
    const { request, userId } = req.body;
    
    if (!request || !userId) {
      return res.status(400).json({
        error: 'Missing required parameters: request and userId'
      });
    }
    
    // Validate MCP request structure
    if (!request.id || !request.method) {
      return res.status(400).json({
        error: 'Invalid MCP request: missing id or method'
      });
    }
    
    // Build MCP context
    const context = await buildMCPContext(req, userId);
    
    // Handle the MCP request
    const response = await kgcMCPServer.handleRequest(request as MCPRequest, context);
    
    res.json(response);
    
  } catch (error) {
    console.error('[MCP Route] Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error processing MCP request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * MCP Server Status endpoint
 */
router.get('/api/mcp/status', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'active',
      serverInfo: {
        name: 'KGC Healthcare MCP Server',
        version: '1.0.0',
        description: 'Model Context Protocol server for Keep Going Care healthcare platform'
      },
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        sampling: false
      },
      toolCount: kgcMCPServer['tools'].size,
      resourceCount: kgcMCPServer['resources'].size
    });
  } catch (error) {
    console.error('[MCP Route] Error getting status:', error);
    res.status(500).json({
      error: 'Failed to get MCP server status'
    });
  }
});

export default router;