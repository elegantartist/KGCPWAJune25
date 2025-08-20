import { db } from '../db';
import { featureUsage } from '../../shared/schema';
import { sql, eq, and } from 'drizzle-orm';

/**
 * Keep Going Tracker Service
 * 
 * Tracks Keep Going button usage for Supervisor Agent awareness
 * and PPR (Patient Progress Report) generation
 */

export interface KeepGoingUsage {
  id: number;
  userId: number;
  timestamp: Date;
  hasMotivationalImage: boolean;
  deviceType: 'mobile' | 'desktop';
}

export interface KeepGoingStats {
  totalUsage: number;
  usageSinceLastPPR: number;
  averagePerWeek: number;
  lastUsedDate: Date | null;
  weeklyTrend: number;
}

export class KeepGoingTracker {
  /**
   * Record a Keep Going button press
   */
  static async recordUsage(userId: number, details?: {
    hasMotivationalImage?: boolean;
    deviceType?: 'mobile' | 'desktop';
  }): Promise<void> {
    try {
      console.log(`Recording Keep Going usage for user ${userId}`);
      
      await db.insert(featureUsage).values({
        userId,
        featureName: 'KeepGoing',
        usageCount: 1,
        lastUsed: new Date(),
        createdAt: new Date()
      });
      
      console.log(`Keep Going usage recorded successfully`);
    } catch (error) {
      console.error('Error recording Keep Going usage:', error);
      throw error;
    }
  }

  /**
   * Get Keep Going usage statistics for a user
   */
  static async getUsageStats(userId: number, lastPPRDate?: Date): Promise<KeepGoingStats> {
    try {
      // Get total usage count
      const totalResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(featureUsage)
        .where(sql`${featureUsage.userId} = ${userId} AND ${featureUsage.featureName} = 'KeepGoing'`);
      
      const totalUsage = parseInt(totalResult[0]?.count?.toString() || '0');

      // Get usage since last PPR
      let usageSinceLastPPR = totalUsage;
      if (lastPPRDate) {
        const sincePPRResult = await db
          .select({ count: sql`COUNT(*)` })
          .from(featureUsage)
          .where(sql`${featureUsage.userId} = ${userId} 
                     AND ${featureUsage.featureName} = 'KeepGoing' 
                     AND ${featureUsage.lastUsed} > ${lastPPRDate}`);
        
        usageSinceLastPPR = parseInt(sincePPRResult[0]?.count?.toString() || '0');
      }

      // Get last used date
      const lastUsedResult = await db
        .select({ lastUsed: featureUsage.lastUsed })
        .from(featureUsage)
        .where(sql`${featureUsage.userId} = ${userId} AND ${featureUsage.featureName} = 'KeepGoing'`)
        .orderBy(sql`${featureUsage.lastUsed} DESC`)
        .limit(1);
      
      const lastUsedDate = lastUsedResult[0]?.lastUsed || null;

      // Calculate weekly average (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const recentUsageResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(featureUsage)
        .where(sql`${featureUsage.userId} = ${userId} 
                   AND ${featureUsage.featureName} = 'KeepGoing' 
                   AND ${featureUsage.lastUsed} > ${fourWeeksAgo}`);
      
      const recentUsage = parseInt(recentUsageResult[0]?.count?.toString() || '0');
      const averagePerWeek = Math.round(recentUsage / 4 * 100) / 100; // Round to 2 decimal places

      // Calculate weekly trend (comparing last 2 weeks vs previous 2 weeks)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const lastTwoWeeksResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(featureUsage)
        .where(sql`${featureUsage.userId} = ${userId} 
                   AND ${featureUsage.featureName} = 'KeepGoing' 
                   AND ${featureUsage.lastUsed} > ${twoWeeksAgo}`);
      
      const previousTwoWeeksResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(featureUsage)
        .where(sql`${featureUsage.userId} = ${userId} 
                   AND ${featureUsage.featureName} = 'KeepGoing' 
                   AND ${featureUsage.lastUsed} <= ${twoWeeksAgo}
                   AND ${featureUsage.lastUsed} > ${fourWeeksAgo}`);
      
      const lastTwoWeeks = parseInt(lastTwoWeeksResult[0]?.count?.toString() || '0');
      const previousTwoWeeks = parseInt(previousTwoWeeksResult[0]?.count?.toString() || '0');
      
      let weeklyTrend = 0;
      if (previousTwoWeeks > 0) {
        weeklyTrend = Math.round(((lastTwoWeeks - previousTwoWeeks) / previousTwoWeeks) * 100);
      } else if (lastTwoWeeks > 0) {
        weeklyTrend = 100; // New usage when there was none before
      }

      return {
        totalUsage,
        usageSinceLastPPR,
        averagePerWeek,
        lastUsedDate,
        weeklyTrend
      };
    } catch (error) {
      console.error('Error getting Keep Going usage stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed usage history for Supervisor Agent context
   */
  static async getUsageHistory(userId: number, limit = 50): Promise<KeepGoingUsage[]> {
    try {
      const results = await db
        .select({
          id: featureUsage.id,
          userId: featureUsage.userId,
          lastUsed: featureUsage.lastUsed,
          usageCount: featureUsage.usageCount
        })
        .from(featureUsage)
        .where(sql`${featureUsage.userId} = ${userId} AND ${featureUsage.featureName} = 'KeepGoing'`)
        .orderBy(sql`${featureUsage.lastUsed} DESC`)
        .limit(limit);

      return results.map(result => ({
        id: result.id,
        userId: result.userId,
        timestamp: result.lastUsed,
        hasMotivationalImage: false, // This info not stored in current schema
        deviceType: 'desktop' as const // This info not stored in current schema
      }));
    } catch (error) {
      console.error('Error getting Keep Going usage history:', error);
      throw error;
    }
  }

  /**
   * Get usage patterns for Supervisor Agent insights
   */
  static async getUsagePatterns(userId: number): Promise<{
    dailyAverage: number;
    preferredTimeOfDay: string;
    mostActiveDay: string;
    motivationalImageUsage: number;
  }> {
    try {
      // Get all usage records for pattern analysis
      const allUsage = await this.getUsageHistory(userId, 1000);
      
      if (allUsage.length === 0) {
        return {
          dailyAverage: 0,
          preferredTimeOfDay: 'No usage yet',
          mostActiveDay: 'No usage yet',
          motivationalImageUsage: 0
        };
      }

      // Calculate daily average
      const daysSpan = Math.ceil((Date.now() - allUsage[allUsage.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24));
      const dailyAverage = Math.round(allUsage.length / Math.max(daysSpan, 1) * 100) / 100;

      // Find preferred time of day
      const hourCounts = new Array(24).fill(0);
      allUsage.forEach(usage => {
        const hour = usage.timestamp.getHours();
        hourCounts[hour]++;
      });
      
      const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
      const preferredTimeOfDay = maxHour < 6 ? 'Late night' :
                               maxHour < 12 ? 'Morning' :
                               maxHour < 18 ? 'Afternoon' : 'Evening';

      // Find most active day
      const dayCounts = new Array(7).fill(0);
      allUsage.forEach(usage => {
        const day = usage.timestamp.getDay();
        dayCounts[day]++;
      });
      
      const maxDay = dayCounts.indexOf(Math.max(...dayCounts));
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const mostActiveDay = days[maxDay];

      // Calculate motivational image usage percentage
      const withImageCount = allUsage.filter(usage => usage.hasMotivationalImage).length;
      const motivationalImageUsage = Math.round((withImageCount / allUsage.length) * 100);

      return {
        dailyAverage,
        preferredTimeOfDay,
        mostActiveDay,
        motivationalImageUsage
      };
    } catch (error) {
      console.error('Error getting Keep Going usage patterns:', error);
      return {
        dailyAverage: 0,
        preferredTimeOfDay: 'Unable to determine',
        mostActiveDay: 'Unable to determine',
        motivationalImageUsage: 0
      };
    }
  }
}

export default KeepGoingTracker;