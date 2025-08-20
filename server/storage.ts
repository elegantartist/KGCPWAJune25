import { 
  users, type User, type InsertUser,
  healthMetrics, type HealthMetric, type InsertHealthMetric,
  patientScores, type PatientScore, type InsertPatientScore,
  motivationalImages, type MotivationalImage, type InsertMotivationalImage,
  carePlanDirectives, type CarePlanDirective, type InsertCarePlanDirective,
  featureUsage, type FeatureUsage, type InsertFeatureUsage,
  chatMemory, type ChatMemory, type InsertChatMemory,
  recommendations, type Recommendation, type InsertRecommendation,
  userContentPreferences, type UserContentPreference, type InsertUserContentPreference,
  userFavorites, type UserFavorite, type InsertUserFavorite,
  contentInteractions, type ContentInteraction, type InsertContentInteraction,
  patientAlerts, type PatientAlert, type InsertPatientAlert,
  patientReminders, type PatientReminder, type InsertPatientReminder
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt, isNull, gte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Health metrics operations
  getHealthMetricsForUser(userId: number): Promise<HealthMetric[]>;
  getLatestHealthMetricsForUser(userId: number): Promise<HealthMetric | undefined>;
  createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  
  // Patient Scores operations (for 24-hour enforcement)
  getPatientScoreByDate(patientId: number, scoreDate: string): Promise<PatientScore | undefined>;
  
  // Motivational images operations
  getMotivationalImageForUser(userId: number): Promise<MotivationalImage | undefined>;
  saveMotivationalImage(image: InsertMotivationalImage): Promise<MotivationalImage>;
  updateMotivationalImage(userId: number, imageData: string): Promise<MotivationalImage | undefined>;
  
  // MCP Care Plan Directive operations
  getCarePlanDirectives(userId: number): Promise<CarePlanDirective[]>;
  getActiveCarePlanDirectives(userId: number): Promise<CarePlanDirective[]>; 
  getUserCpds(userId: number): Promise<{ content: string; category: string }[]>;
  getCarePlanDirectiveById(id: number): Promise<CarePlanDirective | undefined>;
  createCarePlanDirective(directive: InsertCarePlanDirective): Promise<CarePlanDirective>;
  updateCarePlanDirective(id: number, updates: Partial<InsertCarePlanDirective>): Promise<CarePlanDirective | undefined>;
  deactivateCarePlanDirective(id: number): Promise<CarePlanDirective | undefined>;
  
  // MCP Feature Usage operations
  getFeatureUsage(userId: number, featureName?: string): Promise<FeatureUsage[]>;
  recordFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage>;
  getMostUsedFeatures(userId: number, limit?: number): Promise<FeatureUsage[]>;
  
  // MCP Chat Memory operations
  getChatMemories(userId: number, type?: string): Promise<ChatMemory[]>;
  createChatMemory(memory: InsertChatMemory): Promise<ChatMemory>;
  deleteExpiredMemories(): Promise<number>; // Returns count of deleted memories
  
  // MCP Recommendation operations
  getRecommendations(userId: number): Promise<Recommendation[]>;
  getRecentRecommendations(userId: number, limit?: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendationOutcome(id: number, wasFollowed: boolean, scoreAfter?: number): Promise<Recommendation | undefined>;
  getSuccessfulRecommendations(userId: number): Promise<Recommendation[]>;
  
  // User Content Preferences operations (for Tavily API integration)
  getUserContentPreferences(userId: number, contentType: string): Promise<UserContentPreference[]>;
  addUserContentPreference(preference: InsertUserContentPreference): Promise<UserContentPreference>;
  
  // User Favorites operations (for Tavily API integration)
  getUserFavorites(userId: number, contentType: string): Promise<UserFavorite[]>;
  saveUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite>;
  removeUserFavorite(userId: number, contentUrl: string): Promise<boolean>;
  
  // Content Interaction operations (for Tavily API integration)
  recordContentInteraction(interaction: InsertContentInteraction): Promise<ContentInteraction>;
  getContentInteractions(userId: number, contentType?: string): Promise<ContentInteraction[]>;
  
  // Patient Alert System operations
  createPatientAlert(alert: InsertPatientAlert): Promise<PatientAlert>;
  getPatientAlertsForDoctor(doctorId: number): Promise<PatientAlert[]>;
  getUnreadAlertsCount(doctorId: number): Promise<number>;
  markAlertAsRead(alertId: number): Promise<PatientAlert | undefined>;
  resolveAlert(alertId: number): Promise<PatientAlert | undefined>;
  
  // Patient Reminder System operations
  createPatientReminder(reminder: InsertPatientReminder): Promise<PatientReminder>;
  getPendingReminders(): Promise<PatientReminder[]>;
  markReminderAsSent(reminderId: number): Promise<PatientReminder | undefined>;
  markReminderAsActioned(reminderId: number): Promise<PatientReminder | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private healthMetrics: Map<number, HealthMetric>;
  private motivationalImages: Map<number, MotivationalImage>;
  private carePlanDirectives: Map<number, CarePlanDirective>;
  private featureUsages: Map<number, FeatureUsage>;
  private chatMemories: Map<number, ChatMemory>;
  private recommendations: Map<number, Recommendation>;
  private userContentPreferences: Map<number, UserContentPreference>;
  private userFavorites: Map<number, UserFavorite>;
  private contentInteractions: Map<number, ContentInteraction>;
  private userCurrentId: number;
  private metricCurrentId: number;
  private imageCurrentId: number;
  private directiveCurrentId: number;
  private featureUsageCurrentId: number;
  private memoryCurrentId: number;
  private recommendationCurrentId: number;
  private preferenceCurrentId: number;
  private favoriteCurrentId: number;
  private interactionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.healthMetrics = new Map();
    this.motivationalImages = new Map();
    this.carePlanDirectives = new Map();
    this.featureUsages = new Map();
    this.chatMemories = new Map();
    this.recommendations = new Map();
    this.userContentPreferences = new Map();
    this.userFavorites = new Map();
    this.contentInteractions = new Map();
    
    // Initialize ID counters
    this.userCurrentId = 1;
    this.metricCurrentId = 1;
    this.imageCurrentId = 1;
    this.directiveCurrentId = 1;
    this.featureUsageCurrentId = 1;
    this.memoryCurrentId = 1;
    this.recommendationCurrentId = 1;
    this.preferenceCurrentId = 1;
    this.favoriteCurrentId = 1;
    this.interactionCurrentId = 1;
    
    // Note: MemStorage is for testing only - production uses DatabaseStorage
    // Initialize with minimal data for development
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id,
      joinedDate: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async getHealthMetricsForUser(userId: number): Promise<HealthMetric[]> {
    return Array.from(this.healthMetrics.values())
      .filter(metric => metric.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  }
  
  async getLatestHealthMetricsForUser(userId: number): Promise<HealthMetric | undefined> {
    const userMetrics = await this.getHealthMetricsForUser(userId);
    return userMetrics.length > 0 ? userMetrics[0] : undefined;
  }
  
  async createHealthMetric(insertMetric: InsertHealthMetric): Promise<HealthMetric> {
    const id = this.metricCurrentId++;
    const metric: HealthMetric = {
      ...insertMetric,
      id,
      date: new Date()
    };
    this.healthMetrics.set(id, metric);
    return metric;
  }
  
  async getMotivationalImageForUser(userId: number): Promise<MotivationalImage | undefined> {
    // Return the most recent motivational image for a user
    const userImages = Array.from(this.motivationalImages.values())
      .filter(image => image.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return userImages.length > 0 ? userImages[0] : undefined;
  }
  
  async saveMotivationalImage(insertImage: InsertMotivationalImage): Promise<MotivationalImage> {
    const id = this.imageCurrentId++;
    const now = new Date();
    
    const image: MotivationalImage = {
      ...insertImage,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.motivationalImages.set(id, image);
    return image;
  }
  
  async updateMotivationalImage(userId: number, imageData: string): Promise<MotivationalImage | undefined> {
    // Find existing image for this user
    const existingImage = await this.getMotivationalImageForUser(userId);
    
    if (existingImage) {
      // Update the existing image
      const updatedImage: MotivationalImage = {
        ...existingImage,
        imageData,
        updatedAt: new Date()
      };
      
      this.motivationalImages.set(existingImage.id, updatedImage);
      return updatedImage;
    }
    
    // If no image exists, create a new one
    return this.saveMotivationalImage({ userId, imageData });
  }

  // MCP: Care Plan Directive operations
  async getCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
    return Array.from(this.carePlanDirectives.values())
      .filter(directive => directive.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getActiveCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
    return Array.from(this.carePlanDirectives.values())
      .filter(directive => directive.userId === userId && directive.active)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  
  async getCarePlanDirectiveById(id: number): Promise<CarePlanDirective | undefined> {
    return this.carePlanDirectives.get(id);
  }

  async createCarePlanDirective(directive: InsertCarePlanDirective): Promise<CarePlanDirective> {
    const id = this.directiveCurrentId++;
    const now = new Date();
    const newDirective: CarePlanDirective = {
      ...directive,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.carePlanDirectives.set(id, newDirective);
    return newDirective;
  }

  async updateCarePlanDirective(id: number, updates: Partial<InsertCarePlanDirective>): Promise<CarePlanDirective | undefined> {
    const directive = this.carePlanDirectives.get(id);
    if (!directive) return undefined;

    const updatedDirective: CarePlanDirective = {
      ...directive,
      ...updates,
      updatedAt: new Date()
    };
    this.carePlanDirectives.set(id, updatedDirective);
    return updatedDirective;
  }

  async deactivateCarePlanDirective(id: number): Promise<CarePlanDirective | undefined> {
    return this.updateCarePlanDirective(id, { active: false });
  }

  async getUserCpds(userId: number): Promise<{ content: string; category: string }[]> {
    const activeDirectives = await this.getActiveCarePlanDirectives(userId);
    return activeDirectives.map(directive => ({
      content: directive.directive,
      category: directive.category
    }));
  }

  // MCP: Feature Usage operations
  async getFeatureUsage(userId: number, featureName?: string): Promise<FeatureUsage[]> {
    let features = Array.from(this.featureUsages.values())
      .filter(usage => usage.userId === userId);
    
    if (featureName) {
      features = features.filter(usage => usage.featureName === featureName);
    }
    
    return features.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  async recordFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage> {
    // Find existing usage record
    const existingUsage = Array.from(this.featureUsages.values())
      .find(usage => usage.userId === userId && usage.featureName === featureName);
    
    if (existingUsage) {
      // Update existing record
      const updatedUsage: FeatureUsage = {
        ...existingUsage,
        usageCount: existingUsage.usageCount + 1,
        lastUsed: new Date()
      };
      this.featureUsages.set(existingUsage.id, updatedUsage);
      return updatedUsage;
    } else {
      // Create new usage record
      const id = this.featureUsageCurrentId++;
      const now = new Date();
      const newUsage: FeatureUsage = {
        id,
        userId,
        featureName,
        usageCount: 1,
        lastUsed: now,
        createdAt: now
      };
      this.featureUsages.set(id, newUsage);
      return newUsage;
    }
  }

  async getMostUsedFeatures(userId: number, limit: number = 5): Promise<FeatureUsage[]> {
    return Array.from(this.featureUsages.values())
      .filter(usage => usage.userId === userId)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  // MCP: Chat Memory operations
  async getChatMemories(userId: number, type?: string): Promise<ChatMemory[]> {
    const now = new Date();
    return Array.from(this.chatMemories.values())
      .filter(memory => {
        // Filter by user ID
        if (memory.userId !== userId) return false;
        
        // Filter by type if specified
        if (type && memory.type !== type) return false;
        
        // Filter out expired memories
        if (memory.expiresAt && memory.expiresAt < now) return false;
        
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createChatMemory(memory: InsertChatMemory): Promise<ChatMemory> {
    const id = this.memoryCurrentId++;
    const newMemory: ChatMemory = {
      ...memory,
      id,
      createdAt: new Date()
    };
    this.chatMemories.set(id, newMemory);
    return newMemory;
  }

  async deleteExpiredMemories(): Promise<number> {
    const now = new Date();
    let count = 0;
    
    // Find expired memories
    const expiredIds = Array.from(this.chatMemories.values())
      .filter(memory => memory.expiresAt && memory.expiresAt < now)
      .map(memory => memory.id);
    
    // Delete expired memories
    expiredIds.forEach(id => {
      this.chatMemories.delete(id);
      count++;
    });
    
    return count;
  }

  // MCP: Recommendation operations
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .filter(rec => rec.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRecentRecommendations(userId: number, limit: number = 5): Promise<Recommendation[]> {
    const recommendations = await this.getRecommendations(userId);
    return recommendations.slice(0, limit);
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.recommendationCurrentId++;
    const newRecommendation: Recommendation = {
      ...recommendation,
      id,
      createdAt: new Date()
    };
    this.recommendations.set(id, newRecommendation);
    return newRecommendation;
  }

  async updateRecommendationOutcome(id: number, wasFollowed: boolean, scoreAfter?: number): Promise<Recommendation | undefined> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return undefined;
    
    const updatedRecommendation: Recommendation = {
      ...recommendation,
      wasFollowed
    };
    
    if (scoreAfter !== undefined) {
      updatedRecommendation.scoreAfterRecommendation = scoreAfter;
    }
    
    this.recommendations.set(id, updatedRecommendation);
    return updatedRecommendation;
  }

  async getSuccessfulRecommendations(userId: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .filter(rec => rec.userId === userId && rec.wasFollowed)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // User Content Preferences operations (for Tavily API integration)
  async getUserContentPreferences(userId: number, contentType: string): Promise<UserContentPreference[]> {
    return Array.from(this.userContentPreferences.values())
      .filter(pref => pref.userId === userId && pref.contentType === contentType)
      .sort((a, b) => b.weight - a.weight);
  }
  
  async addUserContentPreference(preference: InsertUserContentPreference): Promise<UserContentPreference> {
    // Check if similar preference already exists
    const existingPrefs = Array.from(this.userContentPreferences.values())
      .filter(pref => 
        pref.userId === preference.userId && 
        pref.contentType === preference.contentType &&
        pref.keyword === preference.keyword
      );
      
    if (existingPrefs.length > 0) {
      // Update existing preference by increasing its weight
      const existingPref = existingPrefs[0];
      const updatedPref: UserContentPreference = {
        ...existingPref,
        weight: existingPref.weight + (preference.weight || 1),
        updatedAt: new Date()
      };
      this.userContentPreferences.set(existingPref.id, updatedPref);
      return updatedPref;
    }
    
    // Create new preference
    const id = this.preferenceCurrentId++;
    const now = new Date();
    const newPreference: UserContentPreference = {
      ...preference,
      id,
      weight: preference.weight || 1,
      createdAt: now,
      updatedAt: now
    };
    this.userContentPreferences.set(id, newPreference);
    return newPreference;
  }
  
  // User Favorites operations (for Tavily API integration)
  async getUserFavorites(userId: number, contentType: string): Promise<UserFavorite[]> {
    return Array.from(this.userFavorites.values())
      .filter(fav => fav.userId === userId && fav.contentType === contentType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async saveUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite> {
    // Check if already favorited
    const existingFav = Array.from(this.userFavorites.values())
      .find(fav => 
        fav.userId === favorite.userId && 
        fav.contentUrl === favorite.contentUrl
      );
      
    if (existingFav) {
      return existingFav; // Already exists, just return it
    }
    
    // Create new favorite
    const id = this.favoriteCurrentId++;
    const newFavorite: UserFavorite = {
      ...favorite,
      id,
      contentDescription: favorite.contentDescription || null,
      imageUrl: favorite.imageUrl || null,
      metadata: favorite.metadata || {},
      validationScore: favorite.validationScore || 0,
      isValid: favorite.isValid !== undefined ? favorite.isValid : true,
      createdAt: new Date()
    };
    this.userFavorites.set(id, newFavorite);
    return newFavorite;
  }
  
  async removeUserFavorite(userId: number, contentUrl: string): Promise<boolean> {
    const existingFav = Array.from(this.userFavorites.values())
      .find(fav => fav.userId === userId && fav.contentUrl === contentUrl);
      
    if (existingFav) {
      return this.userFavorites.delete(existingFav.id);
    }
    return false;
  }
  
  // Content Interaction operations (for Tavily API integration)
  async recordContentInteraction(interaction: InsertContentInteraction): Promise<ContentInteraction> {
    const id = this.interactionCurrentId++;
    const newInteraction: ContentInteraction = {
      ...interaction,
      id,
      createdAt: new Date()
    };
    this.contentInteractions.set(id, newInteraction);
    return newInteraction;
  }
  
  async getContentInteractions(userId: number, contentType?: string): Promise<ContentInteraction[]> {
    let interactions = Array.from(this.contentInteractions.values())
      .filter(interact => interact.userId === userId);
      
    if (contentType) {
      interactions = interactions.filter(interact => interact.contentType === contentType);
    }
    
    return interactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Patient Score operations (required by interface)
  async getPatientScoreByDate(patientId: number, scoreDate: string): Promise<PatientScore | undefined> {
    // Memory storage implementation - returns undefined as this is primarily for database
    return undefined;
  }

  // Patient Alert System operations (required by interface)
  async createPatientAlert(alert: InsertPatientAlert): Promise<PatientAlert> {
    // Basic implementation for memory storage
    const id = Date.now(); // Simple ID generation
    const newAlert: PatientAlert = {
      ...alert,
      id,
      createdAt: new Date(),
      isRead: false,
      isResolved: false
    };
    return newAlert;
  }

  async getPatientAlertsForDoctor(doctorId: number): Promise<PatientAlert[]> {
    // Memory storage - return empty array
    return [];
  }

  async getUnreadAlertsCount(doctorId: number): Promise<number> {
    // Memory storage - return 0
    return 0;
  }

  async markAlertAsRead(alertId: number): Promise<PatientAlert | undefined> {
    // Memory storage - return undefined
    return undefined;
  }

  async resolveAlert(alertId: number): Promise<PatientAlert | undefined> {
    // Memory storage - return undefined
    return undefined;
  }

  // Patient Reminder System operations (required by interface)
  async createPatientReminder(reminder: InsertPatientReminder): Promise<PatientReminder> {
    // Basic implementation for memory storage
    const id = Date.now(); // Simple ID generation
    const newReminder: PatientReminder = {
      ...reminder,
      id,
      createdAt: new Date(),
      isSent: false,
      isActioned: false
    };
    return newReminder;
  }

  async getPendingReminders(): Promise<PatientReminder[]> {
    // Memory storage - return empty array
    return [];
  }

  async markReminderAsSent(reminderId: number): Promise<PatientReminder | undefined> {
    // Memory storage - return undefined
    return undefined;
  }

  async markReminderAsActioned(reminderId: number): Promise<PatientReminder | undefined> {
    // Memory storage - return undefined
    return undefined;
  }
}

// Database storage implementation that uses the database instead of memory
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async getHealthMetricsForUser(userId: number): Promise<HealthMetric[]> {
    try {
      const metrics = await db.select()
        .from(healthMetrics)
        .where(eq(healthMetrics.userId, userId))
        .orderBy(desc(healthMetrics.date));
      return metrics;
    } catch (error) {
      console.error("Error getting health metrics:", error);
      return [];
    }
  }
  
  async getLatestHealthMetricsForUser(userId: number): Promise<HealthMetric | undefined> {
    try {
      const [metric] = await db.select()
        .from(healthMetrics)
        .where(eq(healthMetrics.userId, userId))
        .orderBy(desc(healthMetrics.date))
        .limit(1);
      return metric;
    } catch (error) {
      console.error("Error getting latest health metric:", error);
      return undefined;
    }
  }
  
  async createHealthMetric(insertMetric: InsertHealthMetric): Promise<HealthMetric> {
    // CRITICAL: Save to both tables for full Supervisor Agent awareness
    const [metric] = await db.insert(healthMetrics).values(insertMetric).returning();
    
    // Also save to patientScores table for Supervisor Agent loadPatientContext() awareness
    try {
      const submissionDate = new Date();
      const scoreDate = submissionDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      await db.insert(patientScores).values({
        patientId: insertMetric.userId,
        scoreDate: scoreDate,
        exerciseSelfScore: Math.round(insertMetric.exerciseScore), // Convert to integer 1-10
        mealPlanSelfScore: Math.round(insertMetric.dietScore), // Convert to integer 1-10
        medicationSelfScore: Math.round(insertMetric.medicationScore), // Convert to integer 1-10
        notes: `Daily self-assessment submitted via KGC app`
      }).onConflictDoUpdate({
        target: [patientScores.patientId, patientScores.scoreDate],
        set: {
          exerciseSelfScore: Math.round(insertMetric.exerciseScore),
          mealPlanSelfScore: Math.round(insertMetric.dietScore), 
          medicationSelfScore: Math.round(insertMetric.medicationScore),
          notes: `Daily self-assessment updated via KGC app`
        }
      });
      
      console.log(`[Dual Storage] Daily scores saved to both tables for patient ${insertMetric.userId}`);
    } catch (patientScoreError) {
      console.warn(`[Dual Storage] Failed to save to patientScores for patient ${insertMetric.userId}:`, patientScoreError);
      // Continue anyway - healthMetrics was saved successfully
    }
    
    return metric;
  }
  
  async getPatientScoreByDate(patientId: number, scoreDate: string): Promise<any> {
    const [score] = await db.select()
      .from(patientScores)
      .where(and(
        eq(patientScores.patientId, patientId),
        eq(patientScores.scoreDate, scoreDate)
      ))
      .limit(1);
    return score;
  }
  
  async getMotivationalImageForUser(userId: number): Promise<MotivationalImage | undefined> {
    try {
      const [image] = await db.select()
        .from(motivationalImages)
        .where(eq(motivationalImages.userId, userId))
        .orderBy(desc(motivationalImages.updatedAt))
        .limit(1);
      return image;
    } catch (error) {
      console.error("Error getting motivational image:", error);
      return undefined;
    }
  }
  
  async saveMotivationalImage(insertImage: InsertMotivationalImage): Promise<MotivationalImage> {
    const [image] = await db.insert(motivationalImages).values(insertImage).returning();
    return image;
  }
  
  async updateMotivationalImage(userId: number, imageData: string): Promise<MotivationalImage | undefined> {
    try {
      // First check if image exists
      const existingImage = await this.getMotivationalImageForUser(userId);
      
      if (existingImage) {
        // Update existing image
        const [updatedImage] = await db.update(motivationalImages)
          .set({ 
            imageData: imageData,
            updatedAt: new Date()
          })
          .where(eq(motivationalImages.id, existingImage.id))
          .returning();
        return updatedImage;
      }
      
      // If no image exists, create a new one
      return this.saveMotivationalImage({ userId, imageData });
    } catch (error) {
      console.error("Error updating motivational image:", error);
      return undefined;
    }
  }

  // MCP: Care Plan Directives Operations
  async getCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
    try {
      const directives = await db.select()
        .from(carePlanDirectives)
        .where(eq(carePlanDirectives.userId, userId))
        .orderBy(desc(carePlanDirectives.updatedAt));
      return directives;
    } catch (error) {
      console.error("Error getting care plan directives:", error);
      return [];
    }
  }

  async getActiveCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
    try {
      // CRITICAL: Only return the most recently updated active CPDs
      // This ensures doctors' latest decisions always take precedence
      const directives = await db.select()
        .from(carePlanDirectives)
        .where(and(
          eq(carePlanDirectives.userId, userId),
          eq(carePlanDirectives.active, true)
        ))
        .orderBy(desc(carePlanDirectives.updatedAt));
      return directives;
    } catch (error) {
      console.error("Error getting active care plan directives:", error);
      return [];
    }
  }
  
  async getCarePlanDirectiveById(id: number): Promise<CarePlanDirective | undefined> {
    try {
      const [directive] = await db.select()
        .from(carePlanDirectives)
        .where(eq(carePlanDirectives.id, id));
      return directive;
    } catch (error) {
      console.error("Error getting care plan directive by ID:", error);
      return undefined;
    }
  }

  async createCarePlanDirective(directive: InsertCarePlanDirective): Promise<CarePlanDirective> {
    const [createdDirective] = await db.insert(carePlanDirectives).values(directive).returning();
    return createdDirective;
  }

  async updateCarePlanDirective(id: number, updates: Partial<InsertCarePlanDirective>): Promise<CarePlanDirective | undefined> {
    try {
      const [updatedDirective] = await db.update(carePlanDirectives)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(carePlanDirectives.id, id))
        .returning();
      return updatedDirective;
    } catch (error) {
      console.error("Error updating care plan directive:", error);
      return undefined;
    }
  }

  async deactivateCarePlanDirective(id: number): Promise<CarePlanDirective | undefined> {
    try {
      const [deactivatedDirective] = await db.update(carePlanDirectives)
        .set({
          active: false,
          updatedAt: new Date()
        })
        .where(eq(carePlanDirectives.id, id))
        .returning();
      return deactivatedDirective;
    } catch (error) {
      console.error("Error deactivating care plan directive:", error);
      return undefined;
    }
  }

  async getUserCpds(userId: number): Promise<{ content: string; category: string }[]> {
    try {
      const activeDirectives = await this.getActiveCarePlanDirectives(userId);
      return activeDirectives.map(directive => ({
        content: directive.directive,
        category: directive.category
      }));
    } catch (error) {
      console.error("Error getting user CPDs:", error);
      return [];
    }
  }

  // MCP: Feature Usage Operations
  async getFeatureUsage(userId: number, featureName?: string): Promise<FeatureUsage[]> {
    try {
      let query = db.select().from(featureUsage).where(eq(featureUsage.userId, userId));
      
      if (featureName) {
        query = query.where(eq(featureUsage.featureName, featureName));
      }
      
      return await query.orderBy(desc(featureUsage.lastUsed));
    } catch (error) {
      console.error("Error getting feature usage:", error);
      return [];
    }
  }

  async recordFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage> {
    try {
      // Check if record exists
      const [existingUsage] = await db.select()
        .from(featureUsage)
        .where(and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureName, featureName)
        ));
      
      if (existingUsage) {
        // Update existing usage
        const [updatedUsage] = await db.update(featureUsage)
          .set({
            usageCount: existingUsage.usageCount + 1,
            lastUsed: new Date()
          })
          .where(eq(featureUsage.id, existingUsage.id))
          .returning();
        return updatedUsage;
      } else {
        // Create new usage record
        const [newUsage] = await db.insert(featureUsage)
          .values({
            userId,
            featureName,
            usageCount: 1,
            lastUsed: new Date(),
            createdAt: new Date()
          })
          .returning();
        return newUsage;
      }
    } catch (error) {
      console.error("Error recording feature usage:", error);
      // Return a basic record in case of error
      return {
        id: 0,
        userId,
        featureName,
        usageCount: 1,
        lastUsed: new Date(),
        createdAt: new Date()
      };
    }
  }

  async getMostUsedFeatures(userId: number, limit: number = 5): Promise<FeatureUsage[]> {
    try {
      const features = await db.select()
        .from(featureUsage)
        .where(eq(featureUsage.userId, userId))
        .orderBy(desc(featureUsage.usageCount))
        .limit(limit);
      return features;
    } catch (error) {
      console.error("Error getting most used features:", error);
      return [];
    }
  }

  // MCP: Chat Memory Operations
  async getChatMemories(userId: number, type?: string): Promise<ChatMemory[]> {
    try {
      let query = db.select().from(chatMemory)
        .where(eq(chatMemory.userId, userId));
      
      if (type) {
        query = query.where(eq(chatMemory.type, type));
      }
      
      // Don't return expired memories
      query = query.where(
        sql`${chatMemory.expiresAt} IS NULL OR ${chatMemory.expiresAt} > NOW()`
      );
      
      return await query.orderBy(desc(chatMemory.createdAt));
    } catch (error) {
      console.error("Error getting chat memories:", error);
      return [];
    }
  }

  async createChatMemory(memory: InsertChatMemory): Promise<ChatMemory> {
    const [createdMemory] = await db.insert(chatMemory).values(memory).returning();
    return createdMemory;
  }

  async deleteExpiredMemories(): Promise<number> {
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

  // MCP: Recommendation Operations
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    try {
      const userRecommendations = await db.select()
        .from(recommendations)
        .where(eq(recommendations.userId, userId))
        .orderBy(desc(recommendations.createdAt));
      return userRecommendations;
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return [];
    }
  }

  async getRecentRecommendations(userId: number, limit: number = 5): Promise<Recommendation[]> {
    try {
      const recentRecommendations = await db.select()
        .from(recommendations)
        .where(eq(recommendations.userId, userId))
        .orderBy(desc(recommendations.createdAt))
        .limit(limit);
      return recentRecommendations;
    } catch (error) {
      console.error("Error getting recent recommendations:", error);
      return [];
    }
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [createdRecommendation] = await db.insert(recommendations)
      .values(recommendation)
      .returning();
    return createdRecommendation;
  }

  async updateRecommendationOutcome(id: number, wasFollowed: boolean, scoreAfter?: number): Promise<Recommendation | undefined> {
    try {
      const updates: Record<string, any> = { wasFollowed };
      
      if (scoreAfter !== undefined) {
        updates.scoreAfterRecommendation = scoreAfter;
      }
      
      const [updatedRecommendation] = await db.update(recommendations)
        .set(updates)
        .where(eq(recommendations.id, id))
        .returning();
      return updatedRecommendation;
    } catch (error) {
      console.error("Error updating recommendation outcome:", error);
      return undefined;
    }
  }

  async getSuccessfulRecommendations(userId: number): Promise<Recommendation[]> {
    try {
      const successfulRecommendations = await db.select()
        .from(recommendations)
        .where(and(
          eq(recommendations.userId, userId),
          eq(recommendations.wasFollowed, true)
        ))
        .orderBy(desc(recommendations.createdAt));
      return successfulRecommendations;
    } catch (error) {
      console.error("Error getting successful recommendations:", error);
      return [];
    }
  }
  
  // User Content Preferences operations (for Tavily API integration)
  async getUserContentPreferences(userId: number, contentType: string): Promise<UserContentPreference[]> {
    try {
      const preferences = await db.select()
        .from(userContentPreferences)
        .where(and(
          eq(userContentPreferences.userId, userId),
          eq(userContentPreferences.contentType, contentType)
        ))
        .orderBy(desc(userContentPreferences.weight));
      return preferences;
    } catch (error) {
      console.error("Error getting user content preferences:", error);
      return [];
    }
  }
  
  async addUserContentPreference(preference: InsertUserContentPreference): Promise<UserContentPreference> {
    try {
      // Check if similar preference already exists
      const [existingPref] = await db.select()
        .from(userContentPreferences)
        .where(and(
          eq(userContentPreferences.userId, preference.userId),
          eq(userContentPreferences.contentType, preference.contentType),
          eq(userContentPreferences.keyword, preference.keyword)
        ));
        
      if (existingPref) {
        // Update existing preference by increasing its weight
        const [updatedPref] = await db.update(userContentPreferences)
          .set({
            weight: existingPref.weight + (preference.weight || 1),
            updatedAt: new Date()
          })
          .where(eq(userContentPreferences.id, existingPref.id))
          .returning();
        return updatedPref;
      }
      
      // Create new preference
      const [newPreference] = await db.insert(userContentPreferences)
        .values({
          ...preference,
          weight: preference.weight || 1,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newPreference;
    } catch (error) {
      console.error("Error adding user content preference:", error);
      throw error;
    }
  }
  
  // User Favorites operations (for Tavily API integration)
  async getUserFavorites(userId: number, contentType: string): Promise<UserFavorite[]> {
    try {
      const favorites = await db.select()
        .from(userFavorites)
        .where(and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.contentType, contentType)
        ))
        .orderBy(desc(userFavorites.createdAt));
      return favorites;
    } catch (error) {
      console.error("Error getting user favorites:", error);
      return [];
    }
  }
  
  async saveUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite> {
    try {
      // Check if already favorited
      const [existingFav] = await db.select()
        .from(userFavorites)
        .where(and(
          eq(userFavorites.userId, favorite.userId),
          eq(userFavorites.contentUrl, favorite.contentUrl)
        ));
        
      if (existingFav) {
        return existingFav; // Already exists, just return it
      }
      
      // Create new favorite
      const [newFavorite] = await db.insert(userFavorites)
        .values(favorite)
        .returning();
      return newFavorite;
    } catch (error) {
      console.error("Error saving user favorite:", error);
      throw error;
    }
  }
  
  async removeUserFavorite(userId: number, contentUrl: string): Promise<boolean> {
    try {
      // Delete and check if any rows were affected
      const result = await db.delete(userFavorites)
        .where(and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.contentUrl, contentUrl)
        ));
      return result.count > 0;
    } catch (error) {
      console.error("Error removing user favorite:", error);
      return false;
    }
  }
  
  // Content Interaction operations (for Tavily API integration)
  async recordContentInteraction(interaction: InsertContentInteraction): Promise<ContentInteraction> {
    try {
      const [newInteraction] = await db.insert(contentInteractions)
        .values(interaction)
        .returning();
      return newInteraction;
    } catch (error) {
      console.error("Error recording content interaction:", error);
      throw error;
    }
  }
  
  async getContentInteractions(userId: number, contentType?: string): Promise<ContentInteraction[]> {
    try {
      let query = db.select()
        .from(contentInteractions)
        .where(eq(contentInteractions.userId, userId));
        
      if (contentType) {
        query = query.where(eq(contentInteractions.contentType, contentType));
      }
      
      const interactions = await query.orderBy(desc(contentInteractions.createdAt));
      return interactions;
    } catch (error) {
      console.error("Error getting content interactions:", error);
      return [];
    }
  }

  // Patient Alert System operations
  async createPatientAlert(alert: InsertPatientAlert): Promise<PatientAlert> {
    const [newAlert] = await db.insert(patientAlerts).values(alert).returning();
    return newAlert;
  }

  async getPatientAlertsForDoctor(doctorId: number): Promise<PatientAlert[]> {
    const alerts = await db.select()
      .from(patientAlerts)
      .where(eq(patientAlerts.doctorId, doctorId))
      .orderBy(desc(patientAlerts.createdAt));
    return alerts;
  }

  async getUnreadAlertsCount(doctorId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(patientAlerts)
      .where(and(
        eq(patientAlerts.doctorId, doctorId),
        eq(patientAlerts.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async markAlertAsRead(alertId: number): Promise<PatientAlert | undefined> {
    const [updatedAlert] = await db.update(patientAlerts)
      .set({ isRead: true })
      .where(eq(patientAlerts.id, alertId))
      .returning();
    return updatedAlert;
  }

  async resolveAlert(alertId: number): Promise<PatientAlert | undefined> {
    const [resolvedAlert] = await db.update(patientAlerts)
      .set({ 
        isResolved: true,
        resolvedAt: new Date()
      })
      .where(eq(patientAlerts.id, alertId))
      .returning();
    return resolvedAlert;
  }

  // Patient Reminder System operations
  async createPatientReminder(reminder: InsertPatientReminder): Promise<PatientReminder> {
    const [newReminder] = await db.insert(patientReminders).values(reminder).returning();
    return newReminder;
  }

  async getPendingReminders(): Promise<PatientReminder[]> {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5); // HH:MM format
    
    const reminders = await db.select()
      .from(patientReminders)
      .where(and(
        eq(patientReminders.reminderDate, currentDate),
        gte(patientReminders.reminderTime, currentTime),
        eq(patientReminders.wasSent, false)
      ));
    return reminders;
  }

  async markReminderAsSent(reminderId: number): Promise<PatientReminder | undefined> {
    const [updatedReminder] = await db.update(patientReminders)
      .set({ 
        wasSent: true,
        sentAt: new Date()
      })
      .where(eq(patientReminders.id, reminderId))
      .returning();
    return updatedReminder;
  }

  async markReminderAsActioned(reminderId: number): Promise<PatientReminder | undefined> {
    const [actionedReminder] = await db.update(patientReminders)
      .set({ 
        wasActedUpon: true,
        actionedAt: new Date()
      })
      .where(eq(patientReminders.id, reminderId))
      .returning();
    return actionedReminder;
  }
}

// Switch to database storage for permanent persistence of motivational images
export const storage = new DatabaseStorage();
