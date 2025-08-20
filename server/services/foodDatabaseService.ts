import { db } from "../db";
import { foodItems, userFoodPreferences, FoodItem, InsertFoodItem, UserFoodPreference } from "../../shared/schema";
import { eq, and, like, inArray, desc, sql } from "drizzle-orm";
import OpenAI from "openai";

/**
 * Food Database Service
 * Handles interactions with the food database including:
 * - Searching for foods
 * - Getting food details
 * - Managing user preferences and history
 * - CPD-aligned food filtering
 */
export class FoodDatabaseService {
  
  /**
   * Search for food items based on a query string
   */
  async searchFoods(searchQuery: string, userId?: number, limit: number = 20): Promise<FoodItem[]> {
    try {
      // Basic search implementation - can be enhanced with weighted relevance scoring
      const results = await db.select()
        .from(foodItems)
        .where(like(foodItems.name, `%${searchQuery}%`))
        .limit(limit);
        
      return results;
    } catch (error) {
      console.error('Error searching foods:', error);
      throw new Error('Failed to search food database');
    }
  }
  
  /**
   * Get food items by category
   */
  async getFoodsByCategory(category: string, limit: number = 20): Promise<FoodItem[]> {
    try {
      const results = await db.select()
        .from(foodItems)
        .where(eq(foodItems.category, category))
        .limit(limit);
        
      return results;
    } catch (error) {
      console.error('Error getting foods by category:', error);
      throw new Error('Failed to get foods by category');
    }
  }
  
  /**
   * Get a single food item by ID
   */
  async getFoodById(foodId: number): Promise<FoodItem | undefined> {
    try {
      const [foodItem] = await db.select()
        .from(foodItems)
        .where(eq(foodItems.id, foodId))
        .limit(1);
        
      return foodItem;
    } catch (error) {
      console.error('Error getting food by ID:', error);
      throw new Error('Failed to get food item');
    }
  }
  
  /**
   * Get food items filtered by CPD-relevant tags
   */
  async getFoodsByCpdTags(tags: string[], limit: number = 20): Promise<FoodItem[]> {
    try {
      // SQL for array overlap check
      const results = await db.select()
        .from(foodItems)
        .where(
          // Use a raw SQL expression to check for array overlap
          sql`${foodItems.cpdRelevantTags} && ${tags}::text[]`
        )
        .limit(limit);
        
      return results;
    } catch (error) {
      console.error('Error getting foods by CPD tags:', error);
      throw new Error('Failed to get foods by CPD tags');
    }
  }
  
  /**
   * Record a user viewing a food item
   */
  async recordFoodView(userId: number, foodItemId: number): Promise<void> {
    try {
      // Check if we already have a preference record
      const [existingPref] = await db.select()
        .from(userFoodPreferences)
        .where(
          and(
            eq(userFoodPreferences.userId, userId),
            eq(userFoodPreferences.foodItemId, foodItemId)
          )
        )
        .limit(1);
        
      if (existingPref) {
        // Update existing record
        await db.update(userFoodPreferences)
          .set({ 
            viewCount: (existingPref.viewCount || 0) + 1,
            lastViewed: new Date()
          })
          .where(eq(userFoodPreferences.id, existingPref.id));
      } else {
        // Create new record
        await db.insert(userFoodPreferences)
          .values({
            userId,
            foodItemId,
            viewCount: 1,
            lastViewed: new Date()
          });
      }
    } catch (error) {
      console.error('Error recording food view:', error);
      throw new Error('Failed to record food view');
    }
  }
  
  /**
   * Toggle favourite status for a food item
   */
  async toggleFavourite(userId: number, foodItemId: number): Promise<boolean> {
    try {
      // Try direct SQL first as a workaround for column name discrepancy
      try {
        // Check if we already have a preference record
        const { rows } = await db.$client.query(
          `SELECT * FROM user_food_preferences 
           WHERE user_id = $1 AND food_item_id = $2 
           LIMIT 1`,
          [userId, foodItemId]
        );
        
        if (rows && rows.length > 0) {
          // Toggle the favorite status
          const existingPref = rows[0];
          const newFavoriteStatus = !existingPref.is_favourite;
          
          // Update using direct SQL
          await db.$client.query(
            `UPDATE user_food_preferences 
             SET is_favourite = $1, last_viewed = $2 
             WHERE id = $3`,
            [newFavoriteStatus, new Date(), existingPref.id]
          );
          
          return newFavoriteStatus;
        } else {
          // Create new record with favorite=true
          await db.$client.query(
            `INSERT INTO user_food_preferences 
             (user_id, food_item_id, is_favourite, view_count, last_viewed) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, foodItemId, true, 1, new Date()]
          );
          
          return true;
        }
      } catch (sqlError) {
        console.error('Error using direct SQL for favorites:', sqlError);
        // Fall back to ORM approach if SQL fails
        
        // Check if we already have a preference record
        const [existingPref] = await db.select()
          .from(userFoodPreferences)
          .where(
            and(
              eq(userFoodPreferences.userId, userId),
              eq(userFoodPreferences.foodItemId, foodItemId)
            )
          )
          .limit(1);
          
        if (existingPref) {
          // Toggle the favourite status
          const newFavouriteStatus = !existingPref.isFavourite;
          
          await db.update(userFoodPreferences)
            .set({ 
              isFavourite: newFavouriteStatus,
              lastViewed: new Date()
            })
            .where(eq(userFoodPreferences.id, existingPref.id));
            
          return newFavouriteStatus;
        } else {
          // Create new record with favourite=true
          await db.insert(userFoodPreferences)
            .values({
              userId,
              foodItemId,
              isFavourite: true,
              viewCount: 1,
              lastViewed: new Date()
            });
            
          return true;
        }
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
      throw new Error('Failed to update favourite status');
    }
  }
  
  /**
   * Get a user's favourite food items
   */
  async getUserFavourites(userId: number): Promise<FoodItem[]> {
    try {
      // Skip ORM approach and use direct SQL due to column name discrepancy
      let favouritePrefs: UserFoodPreference[] = [];
      try {
        // Use correct SQL column name is_favourite (British spelling)
        const { rows } = await db.$client.query(
          `SELECT * FROM user_food_preferences WHERE user_id = $1 AND is_favourite = true`,
          [userId]
        );
        
        // Convert raw rows to our expected format
        favouritePrefs = rows.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          foodItemId: row.food_item_id,
          isFavourite: row.is_favourite, // Fixed to match corrected schema
          isRestricted: row.is_restricted || null,
          viewCount: row.view_count,
          lastViewed: row.last_viewed,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch (sqlError) {
        console.error('Error using SQL to get favourites:', sqlError);
        
        // Fallback to ORM if SQL fails, which might work if column names are fixed
        try {
          favouritePrefs = await db.select()
            .from(userFoodPreferences)
            .where(
              and(
                eq(userFoodPreferences.userId, userId),
                eq(userFoodPreferences.isFavourite, true)
              )
            );
        } catch (ormError) {
          console.error('Both SQL and ORM approaches failed for getting favourites:', ormError);
          return []; // Return empty array if both methods fail
        }
      }
        
      if (!favouritePrefs || favouritePrefs.length === 0) {
        return [];
      }
      
      // Get the actual food items
      const favouriteIds = favouritePrefs.map(pref => pref.foodItemId);
      
      if (favouriteIds.length === 0) {
        return [];
      }
      
      const favouriteItems = await db.select()
        .from(foodItems)
        .where(inArray(foodItems.id, favouriteIds));
        
      return favouriteItems;
    } catch (error) {
      console.error('Error getting user favourites:', error);
      throw new Error('Failed to get favourite foods');
    }
  }
  
  /**
   * Get user's recently viewed food items
   */
  async getRecentlyViewed(userId: number, limit: number = 10): Promise<FoodItem[]> {
    try {
      // Get user's recent views
      const recentViews = await db.select()
        .from(userFoodPreferences)
        .where(eq(userFoodPreferences.userId, userId))
        .orderBy(desc(userFoodPreferences.lastViewed))
        .limit(limit);
        
      if (recentViews.length === 0) {
        return [];
      }
      
      // Get the actual food items
      const recentIds = recentViews.map((view: UserFoodPreference) => view.foodItemId);
      const recentItems = await db.select()
        .from(foodItems)
        .where(inArray(foodItems.id, recentIds));
        
      // Sort items in the same order as the recentViews
      return recentIds.map((id: number) => recentItems.find(item => item.id === id))
        .filter(Boolean) as FoodItem[];
    } catch (error) {
      console.error('Error getting recently viewed foods:', error);
      throw new Error('Failed to get recently viewed foods');
    }
  }
  
  /**
   * Get common food categories for browsing
   */
  async getCommonCategories(): Promise<string[]> {
    try {
      // Note: In a real implementation, this would likely query a categories table
      // For simplicity, we're returning a static list that matches our seed data
      return [
        'Grains',
        'Vegetables',
        'Fruits',
        'Protein',
        'Dairy',
        'Oils',
        'Beverages',
        'Snacks',
        'Prepared Meals',
      ];
    } catch (error) {
      console.error('Error getting food categories:', error);
      throw new Error('Failed to get food categories');
    }
  }
}

/**
 * Use OpenAI to generate personalized food recommendations based on a diet CPD
 */
export async function generateOpenAIFoodRecommendations(
  dietDirective: string, 
  relevantTags: string[]
): Promise<FoodItem[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log("OpenAI API key not found, skipping OpenAI recommendations");
      return [];
    }
    
    console.log("OpenAI API initialized successfully");

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // The prompt for generating food recommendations
    const prompt = `
Based on the following Care Plan Directive (CPD) for diet, create a list of 8 food item recommendations:
"${dietDirective}"

Relevant dietary tags identified in the CPD are: ${relevantTags.join(', ')}

Return JSON in this exact format:
[
  {
    "id": number (start at 1000),
    "name": string (name of food item),
    "description": string (brief health-focused description of item),
    "category": string (choose from: Grains, Vegetables, Fruits, Protein, Dairy, Oils, Beverages, Snacks, Prepared Meals),
    "nutritionalInfo": {
      "calories": number (per serving),
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams)
    },
    "cpdRelevantTags": string[] (subset of: ${relevantTags.join(', ')}),
    "imageUrl": string (URL for a generic image of this food, can be ""),
    "source": "ai-generated"
  }
]

Ensure every field is included. Each recommendation should align closely with the CPD while providing nutritional values that are realistic.
`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { 
          role: "system", 
          content: "You are a nutritionist helping to generate personalized food recommendations based on care plan directives." 
        },
        { role: "user", content: prompt }
      ],
      // Do not specify response_format here since we need an array
      temperature: 0.7, // Semi-creative responses
      max_tokens: 2048
    });

    const generatedText = response.choices[0].message.content;
    if (!generatedText) {
      console.error("Empty response from OpenAI");
      return [];
    }
    
    try {
      // Clean the response text - remove any markdown code blocks if present
      let cleanedText = generatedText;
      if (generatedText.includes("```json")) {
        cleanedText = generatedText.replace(/```json\n|\n```/g, "");
      } else if (generatedText.includes("```")) {
        cleanedText = generatedText.replace(/```\n|\n```/g, "");
      }
      
      // Parse the response as JSON
      const foodRecommendations = JSON.parse(cleanedText);
      
      // Convert single object to array if needed
      let foodItems = foodRecommendations;
      
      // If the response is a single food item object instead of an array,
      // wrap it in an array so we can process it consistently
      if (!Array.isArray(foodRecommendations) && typeof foodRecommendations === 'object') {
        console.log("OpenAI response is a single object, converting to array");
        foodItems = [foodRecommendations];
      } else if (!Array.isArray(foodRecommendations)) {
        console.error("OpenAI response is not an array or object:", foodRecommendations);
        return [];
      }
      
      // Return the recommendations as FoodItem objects
      return foodItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        // Extract the nutritional values from the nutritionalInfo object
        calories: item.nutritionalInfo?.calories || 0,
        protein: item.nutritionalInfo?.protein || 0,
        carbs: item.nutritionalInfo?.carbs || 0,
        fat: item.nutritionalInfo?.fat || 0,
        // Additional optional properties
        fiber: null,
        sugar: null,
        sodium: null,
        glycemicIndex: null,
        servingSize: "1 serving",
        allergies: [],
        recommendedFor: [],
        cpdRelevantTags: item.cpdRelevantTags || [],
        imageUrl: item.imageUrl || "",
        // Source and timestamps
        source: "ai-generated",
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      console.log("Raw response:", generatedText);
      return [];
    }
  } catch (error) {
    console.error("Error generating OpenAI food recommendations:", error);
    return [];
  }
}

export const foodDatabaseService = new FoodDatabaseService();