/**
 * Enhanced Memory Manager based on LangMem SDK concepts
 * This service handles the three-tier memory system for the MCP architecture:
 * 1. Semantic Memory: What the agent knows (facts, relationships, entities)
 * 2. Procedural Memory: How the agent should respond (behaviors, rules)
 * 3. Episodic Memory: Past interactions and experiences
 */

import { db } from '../db';
import { ChatMemory, InsertChatMemory, chatMemory } from '@shared/schema';
import { eq, and, lt, desc, sql } from 'drizzle-orm';
import type { QueryResult } from 'drizzle-orm';
import { OpenAI } from 'openai';
import type { APIError } from 'openai';

// Initialize OpenAI client for embeddings
let openai: OpenAI;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} else {
  console.warn('OPENAI_API_KEY not provided, vector embeddings will not work.');
}

// Memory System types
export enum MemorySystem {
  SEMANTIC = 'semantic',   // What the agent knows (facts, knowledge)
  PROCEDURAL = 'procedural', // How the agent should respond (behaviors, rules)
  EPISODIC = 'episodic'    // Past experiences and interactions
}

// Memory Importance levels
export enum ImportanceLevel {
  LOW = 0.2,
  MEDIUM = 0.5,
  HIGH = 0.8,
  CRITICAL = 1.0
}

// Memory Types (within each system)
export enum MemoryType {
  SHORT_TERM = 'short_term',   // Expires quickly (hours to a day)
  MEDIUM_TERM = 'medium_term', // Expires in days to weeks
  LONG_TERM = 'long_term'      // Permanent (never expires)
}

// Structure for complex memory queries
export interface MemoryQuery {
  userId: number;
  text?: string;             // For semantic search
  memorySystem?: MemorySystem;
  type?: MemoryType;
  minImportance?: number;
  limit?: number;
  includeExpired?: boolean;
}

// Utility for working with offline sync
export interface OfflineSyncOperation {
  type: 'create' | 'update' | 'delete';
  memory: Partial<ChatMemory>;
  timestamp: Date;
}

/**
 * Enhanced Memory Manager Service
 * Implements the LangMem architecture with support for:
 * - Three-tier memory system
 * - Vector-based similarity search 
 * - Offline-first operations with sync
 * - Memory consolidation
 */
export class EnhancedMemoryManager {
  // In-memory cache for offline operation
  private offlineMemoryCache: Map<number, ChatMemory[]> = new Map();
  private pendingSyncOperations: OfflineSyncOperation[] = [];
  private isOnline: boolean = true;

  /**
   * Set connection state for the memory manager
   */
  public setConnectionState(isOnline: boolean): void {
    // If we're transitioning from offline to online, trigger sync
    if (!this.isOnline && isOnline) {
      this.syncOfflineOperations();
    }
    this.isOnline = isOnline;
  }

  /**
   * Get the connection state
   */
  public getConnectionState(): boolean {
    return this.isOnline;
  }

  /**
   * Create a new memory
   * Works in both online and offline modes
   */
  public async createMemory(memory: InsertChatMemory): Promise<ChatMemory> {
    try {
      // Add embeddings if text search is enabled and we're online
      if (this.isOnline && openai && memory.content) {
        const embeddings = await this.generateEmbeddings(memory.content);
        memory.embeddings = JSON.stringify(embeddings);
      }

      // If we're online, store in the database
      if (this.isOnline) {
        const [createdMemory] = await db.insert(chatMemory).values(memory).returning();
        return createdMemory;
      } else {
        // Otherwise, store in the offline cache
        const offlineMemory: ChatMemory = {
          id: Date.now(), // Temporary ID
          ...memory,
          createdAt: new Date(),
          accessCount: 0,
          lastAccessed: null
        } as ChatMemory;
        
        // Add to offline cache
        const userMemories = this.offlineMemoryCache.get(memory.userId) || [];
        userMemories.push(offlineMemory);
        this.offlineMemoryCache.set(memory.userId, userMemories);
        
        // Record pending operation
        this.pendingSyncOperations.push({
          type: 'create',
          memory: offlineMemory,
          timestamp: new Date()
        });
        
        return offlineMemory;
      }
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories based on complex query parameters
   * Works in both online and offline modes
   */
  public async getMemories(query: MemoryQuery): Promise<ChatMemory[]> {
    try {
      if (this.isOnline) {
        return await this.getOnlineMemories(query);
      } else {
        return this.getOfflineMemories(query);
      }
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }

  /**
   * Get memories from database when online
   */
  private async getOnlineMemories(query: MemoryQuery): Promise<ChatMemory[]> {
    const conditions = [eq(chatMemory.userId, query.userId)];
    
    // Apply filters
    if (query.memorySystem) {
      conditions.push(eq(chatMemory.memorySystem, query.memorySystem));
    }
    
    if (query.type) {
      conditions.push(eq(chatMemory.type, query.type));
    }
    
    if (query.minImportance) {
      conditions.push(sql`${chatMemory.importance} >= ${query.minImportance}`);
    }
    
    // Don't return expired memories unless specifically requested
    if (!query.includeExpired) {
      conditions.push(
        sql`${chatMemory.expiresAt} IS NULL OR ${chatMemory.expiresAt} > NOW()`
      );
    }
    
    // Apply vector similarity search if text query is provided and we have OpenAI API
    if (query.text && openai) {
      const embeddings = await this.generateEmbeddings(query.text);
      // For PostgreSQL with pgvector extension, we would use:
      // sql`embeddings <-> ${JSON.stringify(embeddings)}`
      // But for now, we'll just fetch and do client-side filtering
    }
    
    let dbQuery = db.select()
      .from(chatMemory)
      .where(and(...conditions))
      .orderBy(desc(chatMemory.createdAt));
    
    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }
    
    const memories = await dbQuery;
    
    // Update access counts for retrieved memories
    const memoryIds = memories.map(m => m.id);
    if (memoryIds.length > 0) {
      // Use proper parameterized query with the "in" operator from drizzle-orm
      // This avoids SQL injection and incorrect string conversion issues
      await db.update(chatMemory)
        .set({ 
          lastAccessed: new Date(),
          accessCount: sql`${chatMemory.accessCount} + 1`
        })
        .where(
          // Use the SQL template properly to handle array of IDs
          sql`${chatMemory.id} IN (${sql.join(memoryIds, sql`, `)})`
        );
    }
    
    // If we did a text search and have embeddings, sort by similarity
    if (query.text && openai) {
      const queryEmbeddings = await this.generateEmbeddings(query.text);
      // Sort by cosine similarity (client-side)
      return this.sortBySimilarity(memories, queryEmbeddings);
    }
    
    return memories;
  }

  /**
   * Get memories from offline cache
   */
  private getOfflineMemories(query: MemoryQuery): ChatMemory[] {
    const userMemories = this.offlineMemoryCache.get(query.userId) || [];
    
    // Filter memories based on query parameters
    let filteredMemories = userMemories.filter(memory => {
      // Check memory system
      if (query.memorySystem && memory.memorySystem !== query.memorySystem) {
        return false;
      }
      
      // Check memory type
      if (query.type && memory.type !== query.type) {
        return false;
      }
      
      // Check importance level
      if (query.minImportance && (memory.importance || 0) < query.minImportance) {
        return false;
      }
      
      // Check expiration
      if (!query.includeExpired && memory.expiresAt && new Date(memory.expiresAt) < new Date()) {
        return false;
      }
      
      return true;
    });
    
    // Sort by creation date (newest first)
    filteredMemories.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply limit if specified
    if (query.limit && query.limit > 0) {
      filteredMemories = filteredMemories.slice(0, query.limit);
    }
    
    // Update access metadata for retrieved memories
    filteredMemories.forEach(memory => {
      memory.lastAccessed = new Date();
      memory.accessCount = (memory.accessCount || 0) + 1;
    });
    
    return filteredMemories;
  }

  /**
   * Delete expired memories
   */
  public async deleteExpiredMemories(): Promise<number> {
    if (!this.isOnline) {
      // Can't perform database operations when offline
      return 0;
    }
    
    try {
      const result = await db.delete(chatMemory)
        .where(and(
          sql`${chatMemory.expiresAt} IS NOT NULL`,
          lt(chatMemory.expiresAt, new Date())
        ));
      return result.count || 0;
    } catch (error) {
      console.error("Error deleting expired memories:", error);
      return 0;
    }
  }

  /**
   * Sync offline operations when connection is restored
   */
  private async syncOfflineOperations(): Promise<void> {
    if (this.pendingSyncOperations.length === 0) {
      return;
    }
    
    console.log(`Syncing ${this.pendingSyncOperations.length} pending memory operations`);
    
    // Sort operations by timestamp
    const sortedOperations = [...this.pendingSyncOperations]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Process each operation
    for (const operation of sortedOperations) {
      try {
        if (operation.type === 'create') {
          const memory = operation.memory as InsertChatMemory;
          if (!memory.embeddings && memory.content && openai) {
            const embeddings = await this.generateEmbeddings(memory.content);
            memory.embeddings = JSON.stringify(embeddings);
          }
          await db.insert(chatMemory).values(memory);
        }
        // Other operation types like 'update' and 'delete' would be handled here
      } catch (error) {
        console.error(`Error syncing operation ${operation.type}:`, error);
      }
    }
    
    // Clear pending operations and offline cache
    this.pendingSyncOperations = [];
    this.offlineMemoryCache.clear();
  }

  /**
   * Generate embeddings for a text using OpenAI
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    if (!openai) {
      return [];
    }
    
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return [];
    }
  }

  /**
   * Sort memories by similarity to query embeddings
   */
  private sortBySimilarity(memories: ChatMemory[], queryEmbeddings: number[]): ChatMemory[] {
    // Calculate cosine similarity for each memory
    const memoriesWithSimilarity = memories.map(memory => {
      let similarity = 0;
      
      // Parse embeddings if available
      try {
        if (memory.embeddings) {
          const memoryEmbeddings = JSON.parse(memory.embeddings);
          similarity = this.calculateCosineSimilarity(queryEmbeddings, memoryEmbeddings);
        }
      } catch (error) {
        console.error('Error parsing memory embeddings:', error);
      }
      
      return { memory, similarity };
    });
    
    // Sort by similarity (highest first)
    memoriesWithSimilarity.sort((a, b) => b.similarity - a.similarity);
    
    // Return just the memories
    return memoriesWithSimilarity.map(m => m.memory);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * Create a semantic memory (what the agent knows)
   */
  public async createSemanticMemory(
    userId: number,
    content: string,
    importance: number = ImportanceLevel.MEDIUM,
    type: MemoryType = MemoryType.LONG_TERM,
    context: any = {},
    expiresAt: Date | null = null
  ): Promise<ChatMemory> {
    const memory: InsertChatMemory = {
      userId,
      memorySystem: MemorySystem.SEMANTIC,
      type,
      content,
      importance,
      context,
      expiresAt
    };
    
    return this.createMemory(memory);
  }

  /**
   * Create a procedural memory (how the agent should respond)
   */
  public async createProceduralMemory(
    userId: number,
    content: string,
    importance: number = ImportanceLevel.HIGH,
    type: MemoryType = MemoryType.LONG_TERM,
    context: any = {},
    expiresAt: Date | null = null
  ): Promise<ChatMemory> {
    const memory: InsertChatMemory = {
      userId,
      memorySystem: MemorySystem.PROCEDURAL,
      type,
      content,
      importance,
      context,
      expiresAt
    };
    
    return this.createMemory(memory);
  }

  /**
   * Create an episodic memory (past experiences)
   */
  public async createEpisodicMemory(
    userId: number,
    content: string,
    importance: number = ImportanceLevel.MEDIUM,
    type: MemoryType = MemoryType.MEDIUM_TERM,
    context: any = {},
    expiresAt: Date | null = null
  ): Promise<ChatMemory> {
    const memory: InsertChatMemory = {
      userId,
      memorySystem: MemorySystem.EPISODIC,
      type,
      content,
      importance,
      context,
      expiresAt
    };
    
    return this.createMemory(memory);
  }

  /**
   * Retrieve semantic memories (what the agent knows)
   */
  public async getSemanticMemories(
    userId: number,
    searchText?: string,
    minImportance?: number,
    limit?: number
  ): Promise<ChatMemory[]> {
    return this.getMemories({
      userId,
      text: searchText,
      memorySystem: MemorySystem.SEMANTIC,
      minImportance,
      limit
    });
  }

  /**
   * Retrieve procedural memories (how the agent should respond)
   */
  public async getProceduralMemories(
    userId: number,
    searchText?: string,
    minImportance?: number,
    limit?: number
  ): Promise<ChatMemory[]> {
    return this.getMemories({
      userId,
      text: searchText,
      memorySystem: MemorySystem.PROCEDURAL,
      minImportance,
      limit
    });
  }

  /**
   * Retrieve episodic memories (past experiences)
   */
  public async getEpisodicMemories(
    userId: number,
    searchText?: string,
    minImportance?: number,
    limit?: number
  ): Promise<ChatMemory[]> {
    return this.getMemories({
      userId,
      text: searchText,
      memorySystem: MemorySystem.EPISODIC,
      minImportance,
      limit
    });
  }
}

// Export singleton instance
export const enhancedMemoryManager = new EnhancedMemoryManager();