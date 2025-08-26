/**
 * Care Plan Directive Validation Service
 * 
 * CRITICAL SERVICE: Ensures only the most recent doctor-created CPDs are used
 * throughout the entire KGC system. This is essential for patient safety and
 * regulatory compliance with TGA Class 1 SaMD requirements.
 */

import { storage } from '../storage.js';
import type { CarePlanDirective } from '@shared/schema.js';

export class CPDValidationService {
  private static instance: CPDValidationService;
  
  // Cache to prevent unnecessary database calls
  private cpdCache: Map<number, { cpds: CarePlanDirective[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  
  private constructor() {}
  
  public static getInstance(): CPDValidationService {
    if (!CPDValidationService.instance) {
      CPDValidationService.instance = new CPDValidationService();
    }
    return CPDValidationService.instance;
  }
  
  /**
   * Get ONLY the latest active CPDs for a user
   * This is the single source of truth for all CPD access in the system
   */
  async getLatestActiveCPDs(userId: number): Promise<CarePlanDirective[]> {
    try {
      // Check cache first
      const cached = this.cpdCache.get(userId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {

        return cached.cpds;
      }
      
      // Fetch latest from database
      const allActiveCPDs = await storage.getActiveCarePlanDirectives(userId);
      
      // Additional validation: Ensure we only get the most recent ones
      // Group by category and take the most recent for each category
      const latestByCategory = this.getLatestByCategory(allActiveCPDs);
      
      // Update cache
      this.cpdCache.set(userId, {
        cpds: latestByCategory,
        timestamp: now
      });
      
      console.log(`[CPD-Validation] Retrieved ${latestByCategory.length} latest CPDs for user ${userId}`);
      return latestByCategory;
      
    } catch (error) {
      console.error(`[CPD-Validation] Error getting latest CPDs for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get only the most recent CPD for each category
   * This prevents conflicts when doctors update directives
   */
  private getLatestByCategory(cpds: CarePlanDirective[]): CarePlanDirective[] {
    const categoryMap = new Map<string, CarePlanDirective>();
    
    // Sort by updatedAt descending to ensure latest first
    const sortedCPDs = [...cpds].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    // Keep only the most recent for each category
    for (const cpd of sortedCPDs) {
      if (!categoryMap.has(cpd.category)) {
        categoryMap.set(cpd.category, cpd);
      }
    }
    
    return Array.from(categoryMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  
  /**
   * Clear cache when CPDs are updated
   * This ensures immediate consistency across the system
   */
  invalidateCache(userId: number): void {
    this.cpdCache.delete(userId);
    console.log(`[CPD-Validation] Cache invalidated for user ${userId}`);
  }
  
  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cpdCache.clear();
    console.log(`[CPD-Validation] All cache cleared`);
  }
  
  /**
   * Validate that CPDs are current and consistent
   * Returns warnings if there are potential issues
   */
  async validateCPDConsistency(userId: number): Promise<{
    valid: boolean;
    warnings: string[];
    cpdCount: number;
  }> {
    const cpds = await this.getLatestActiveCPDs(userId);
    const warnings: string[] = [];
    
    // Check for duplicate categories (shouldn't happen with our latest-by-category logic)
    const categories = cpds.map(cpd => cpd.category);
    const duplicateCategories = categories.filter((category, index) => 
      categories.indexOf(category) !== index
    );
    
    if (duplicateCategories.length > 0) {
      warnings.push(`Duplicate categories found: ${duplicateCategories.join(', ')}`);
    }
    
    // Check for very old CPDs (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const oldCPDs = cpds.filter(cpd => new Date(cpd.updatedAt) < ninetyDaysAgo);
    if (oldCPDs.length > 0) {
      warnings.push(`${oldCPDs.length} CPDs are older than 90 days and may need review`);
    }
    
    return {
      valid: warnings.length === 0,
      warnings,
      cpdCount: cpds.length
    };
  }
  
  /**
   * Get formatted CPD summary for logging/debugging
   */
  async getCPDSummary(userId: number): Promise<string[]> {
    const cpds = await this.getLatestActiveCPDs(userId);
    return cpds.map(cpd => `${cpd.category}: ${cpd.directive}`);
  }
}

// Export singleton instance
export const cpdValidationService = CPDValidationService.getInstance();