/**
 * Memory Tools for the MCP System
 * 
 * Based on LangChain LangMem SDK concepts, these tools allow the agent to:
 * 1. Manage memories (create, update, delete)
 * 2. Search memories using semantic search
 * 
 * These tools are designed to be used by the LLM directly through function calling,
 * enabling the agent to self-manage its memory.
 */

import { enhancedMemoryManager, MemorySystem, MemoryType, ImportanceLevel } from './enhancedMemoryManager';
import { ChatMemory } from '@shared/schema';

/**
 * Search memory tool parameters
 */
export interface SearchMemoryParams {
  userId: number;
  query: string;
  memorySystem?: MemorySystem;
  type?: MemoryType;
  minImportance?: number;
  limit?: number;
}

/**
 * Result of a memory search operation
 */
export interface SearchMemoryResult {
  memories: ChatMemory[];
  count: number;
}

/**
 * Params for managing memories
 */
export interface ManageMemoryParams {
  userId: number;
  action: 'create' | 'update' | 'delete';
  content?: string;
  memoryId?: number;
  memorySystem?: MemorySystem; 
  type?: MemoryType;
  importance?: number;
  context?: any;
  expiresInHours?: number;
}

/**
 * Result of a memory management operation
 */
export interface ManageMemoryResult {
  success: boolean;
  memoryId?: number;
  message: string;
}

/**
 * Tool for searching memories
 */
export async function searchMemory(params: SearchMemoryParams): Promise<SearchMemoryResult> {
  try {
    // When memorySystem is not specified, prioritize semantic for general queries
    const system = params.memorySystem || MemorySystem.SEMANTIC;
    
    // Check if the query is related to food or diet
    const isFoodRelatedQuery = /food|diet|eat|meal|nutrition|breakfast|lunch|dinner|snack|vegetable|fruit|protein|carb|fat|cook|recipe/i.test(params.query);
    
    let memories: ChatMemory[] = [];
    
    // Search based on the memory system
    switch (system) {
      case MemorySystem.SEMANTIC:
        memories = await enhancedMemoryManager.getSemanticMemories(
          params.userId,
          params.query,
          params.minImportance,
          params.limit
        );
        break;
      case MemorySystem.PROCEDURAL:
        memories = await enhancedMemoryManager.getProceduralMemories(
          params.userId,
          params.query,
          params.minImportance,
          params.limit
        );
        break;
      case MemorySystem.EPISODIC:
        memories = await enhancedMemoryManager.getEpisodicMemories(
          params.userId,
          params.query,
          params.minImportance,
          params.limit
        );
        break;
      default:
        // Search all memory systems if none specified
        const semanticMemories = await enhancedMemoryManager.getSemanticMemories(
          params.userId,
          params.query,
          params.minImportance,
          params.limit ? Math.ceil(params.limit / 3) : undefined
        );
        
        const proceduralMemories = await enhancedMemoryManager.getProceduralMemories(
          params.userId,
          params.query,
          params.minImportance,
          params.limit ? Math.ceil(params.limit / 3) : undefined
        );
        
        const episodicMemories = await enhancedMemoryManager.getEpisodicMemories(
          params.userId,
          params.query,
          params.minImportance,
          params.limit ? Math.ceil(params.limit / 3) : undefined
        );
        
        // Combine results
        memories = [...semanticMemories, ...proceduralMemories, ...episodicMemories];
    }
    
    // If this is a food-related query, fetch additional food-specific memories and prioritize them
    if (isFoodRelatedQuery) {
      try {
        // Get all chat memories with food category tag and prioritize them
        const foodMemories = await enhancedMemoryManager.getMemories({
          userId: params.userId,
          minImportance: 0.3 // Lower minimum importance to include more food memories
        });
        
        // Filter out only food-related memories based on context metadata
        const foodSpecificMemories = foodMemories.filter((memory: ChatMemory) => {
          try {
            // Check if context has a food category
            const contextData = memory.context as Record<string, any>;
            if (contextData && contextData.category === 'food') {
              return true;
            }
            
            // Check if content contains food-related terms as fallback
            return /food|diet|eat|meal|nutrition|breakfast|lunch|dinner|snack|vegetable|fruit|protein|carb|fat|cook|recipe/i.test(memory.content);
          } catch {
            // If context can't be parsed, fall back to content matching
            return /food|diet|eat|meal|nutrition|breakfast|lunch|dinner|snack|vegetable|fruit|protein|carb|fat|cook|recipe/i.test(memory.content);
          }
        });
        
        // If we found food-specific memories, add them at the beginning of the results
        if (foodSpecificMemories.length > 0) {
          // Remove duplicates (memories already found in the original search)
          const existingIds = new Set(memories.map((m: ChatMemory) => m.id));
          const uniqueFoodMemories = foodSpecificMemories.filter((m: ChatMemory) => !existingIds.has(m.id));
          
          // Add unique food memories to the beginning of the result array
          memories = [...uniqueFoodMemories, ...memories];
          
          // Respect the original limit parameter
          if (params.limit && memories.length > params.limit) {
            memories = memories.slice(0, params.limit);
          }
        }
      } catch (error) {
        // Log error but continue with original memories if food-specific search fails
        console.error('Error fetching food-specific memories:', error);
      }
    }
    // Sort by importance and limit total results
    memories.sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5));
    
    if (params.limit) {
      memories = memories.slice(0, params.limit);
    }
    
    return {
      memories,
      count: memories.length
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error searching memory:', errorMessage);
    return {
      memories: [],
      count: 0
    };
  }
}

/**
 * Tool for managing memories (create, update, delete)
 */
export async function manageMemory(params: ManageMemoryParams): Promise<ManageMemoryResult> {
  try {
    switch (params.action) {
      case 'create':
        return await createMemory(params);
      case 'update':
        return await updateMemory(params);
      case 'delete':
        return await deleteMemory(params);
      default:
        return {
          success: false,
          message: `Unknown action: ${params.action}`
        };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in manageMemory (${params.action}):`, error);
    return {
      success: false,
      message: `Error: ${errorMessage}`
    };
  }
}

/**
 * Create a new memory
 */
async function createMemory(params: ManageMemoryParams): Promise<ManageMemoryResult> {
  if (!params.content) {
    return {
      success: false,
      message: 'Content is required for creating a memory'
    };
  }
  
  const system = params.memorySystem || MemorySystem.SEMANTIC;
  const type = params.type || MemoryType.MEDIUM_TERM;
  const importance = params.importance || ImportanceLevel.MEDIUM;
  
  // Calculate expiration date if specified
  let expiresAt: Date | null = null;
  if (params.expiresInHours) {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + params.expiresInHours);
  }
  
  // Default context if not provided
  const context = params.context || {};
  
  try {
    let memory: ChatMemory;
    
    // Create appropriate memory type
    switch (system) {
      case MemorySystem.SEMANTIC:
        memory = await enhancedMemoryManager.createSemanticMemory(
          params.userId,
          params.content,
          importance,
          type,
          context,
          expiresAt
        );
        break;
      case MemorySystem.PROCEDURAL:
        memory = await enhancedMemoryManager.createProceduralMemory(
          params.userId,
          params.content,
          importance,
          type,
          context,
          expiresAt
        );
        break;
      case MemorySystem.EPISODIC:
        memory = await enhancedMemoryManager.createEpisodicMemory(
          params.userId,
          params.content,
          importance,
          type,
          context,
          expiresAt
        );
        break;
      default:
        return {
          success: false,
          message: `Unknown memory system: ${system}`
        };
    }
    
    return {
      success: true,
      memoryId: memory.id,
      message: `Memory created with ID ${memory.id}`
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating memory:', error);
    return {
      success: false,
      message: `Error creating memory: ${errorMessage}`
    };
  }
}

/**
 * Update an existing memory
 * Note: This is a simplified implementation. In a production system,
 * you would want to check if the memory exists and belongs to the user.
 */
async function updateMemory(params: ManageMemoryParams): Promise<ManageMemoryResult> {
  // This is a stub function as the current implementation doesn't directly support
  // updating memories. Instead, we create a new one and let the consolidation process
  // handle merging similar memories.
  return {
    success: false,
    message: 'Memory updating not directly supported. Create a new memory instead.'
  };
}

/**
 * Delete a memory
 * Note: This is a simplified implementation. In a production system,
 * you would want to check if the memory exists and belongs to the user.
 */
async function deleteMemory(params: ManageMemoryParams): Promise<ManageMemoryResult> {
  // This is a stub function as the current implementation doesn't directly support
  // deleting memories. In a real implementation, we would need to add this functionality.
  return {
    success: false,
    message: 'Memory deletion not directly supported.'
  };
}

/**
 * Generate memory tool definitions for OpenAI function calling
 */
export function getMemoryToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "searchMemory",
        description: "Search for memories relevant to the current conversation",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "number",
              description: "The ID of the user whose memories to search"
            },
            query: {
              type: "string",
              description: "The search query to find relevant memories"
            },
            memorySystem: {
              type: "string",
              enum: ["semantic", "procedural", "episodic"],
              description: "The type of memory system to search (semantic=facts, procedural=behaviors, episodic=experiences)"
            },
            type: {
              type: "string",
              enum: ["short_term", "medium_term", "long_term"],
              description: "The retention type of memory to search"
            },
            minImportance: {
              type: "number",
              description: "Minimum importance score for memories (0.0-1.0)"
            },
            limit: {
              type: "number",
              description: "Maximum number of memories to return"
            }
          },
          required: ["userId", "query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "manageMemory",
        description: "Create, update, or delete memories",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "number",
              description: "The ID of the user whose memories to manage"
            },
            action: {
              type: "string",
              enum: ["create", "update", "delete"],
              description: "The action to perform on the memory"
            },
            content: {
              type: "string",
              description: "The content of the memory (required for create and update)"
            },
            memoryId: {
              type: "number",
              description: "The ID of the memory to update or delete (required for update and delete)"
            },
            memorySystem: {
              type: "string",
              enum: ["semantic", "procedural", "episodic"],
              description: "The type of memory system (required for create)"
            },
            type: {
              type: "string",
              enum: ["short_term", "medium_term", "long_term"],
              description: "The retention type of the memory (required for create)"
            },
            importance: {
              type: "number",
              description: "Importance score for the memory between 0.0 and 1.0 (higher = more important)"
            },
            context: {
              type: "object",
              description: "Additional context for the memory"
            },
            expiresInHours: {
              type: "number",
              description: "Hours until the memory expires (null = never expires)"
            }
          },
          required: ["userId", "action"]
        }
      }
    }
  ];
}