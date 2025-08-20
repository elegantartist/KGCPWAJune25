/**
 * Inspiration Machine D Server - Specialist Chef for Meal Planning
 * 
 * This server handles dietary inspiration and meal planning with strong
 * CPD integration and focus on achieving 8-10 diet scores.
 */

import { apiRequest } from '@/lib/queryClient';

class InspirationMachineDServer {
  constructor() {
    this.name = 'InspirationMachineDServer';
    this.description = 'Handles meal planning and dietary inspiration aligned with Care Plan Directives';
  }

  /**
   * Execute meal planning request with CPD-driven guidance
   * @param {string} argument - Raw user input about meals/diet
   * @param {object} context - User context including CPDs, diet scores
   * @returns {Promise<string>} - Formatted meal recommendations
   */
  async execute(argument, context = {}) {
    console.log(`[InspirationMachineDServer] Processing: "${argument}" with CPD focus`);
    
    try {
      // Extract meal planning parameters
      const mealType = this.extractMealType(argument);
      const dietaryRestrictions = this.extractDietaryRestrictions(argument);
      
      // Get CPD-aligned meal suggestions
      const mealSuggestions = await this.generateCPDAlignedMeals(mealType, dietaryRestrictions, context);
      
      // Format with CPD compliance messaging
      return this.formatMealResponse(mealSuggestions, mealType, context);
      
    } catch (error) {
      console.error('[InspirationMachineDServer] Error:', error);
      return "I'm having trouble generating meal suggestions right now. Eating according to your care plan is important - please try again shortly.";
    }
  }

  /**
   * Extract meal type from user input
   */
  extractMealType(argument) {
    const argLower = argument.toLowerCase();
    
    if (argLower.includes('breakfast')) return 'breakfast';
    if (argLower.includes('lunch')) return 'lunch';
    if (argLower.includes('dinner') || argLower.includes('supper')) return 'dinner';
    if (argLower.includes('snack')) return 'snack';
    if (argLower.includes('meal plan') || argLower.includes('weekly')) return 'meal_plan';
    
    return 'general';
  }

  /**
   * Extract dietary restrictions and preferences
   */
  extractDietaryRestrictions(argument) {
    const restrictions = [];
    const argLower = argument.toLowerCase();
    
    if (argLower.includes('vegetarian')) restrictions.push('vegetarian');
    if (argLower.includes('vegan')) restrictions.push('vegan');
    if (argLower.includes('gluten-free') || argLower.includes('gluten free')) restrictions.push('gluten-free');
    if (argLower.includes('dairy-free') || argLower.includes('dairy free')) restrictions.push('dairy-free');
    if (argLower.includes('low-carb') || argLower.includes('low carb')) restrictions.push('low-carb');
    if (argLower.includes('diabetic')) restrictions.push('diabetic-friendly');
    if (argLower.includes('heart-healthy') || argLower.includes('heart healthy')) restrictions.push('heart-healthy');
    
    return restrictions;
  }

  /**
   * Generate CPD-aligned meal suggestions
   */
  async generateCPDAlignedMeals(mealType, restrictions, context) {
    try {
      const response = await apiRequest('/api/ai/generate-cpd-meal-plan', {
        method: 'POST',
        body: JSON.stringify({
          mealType,
          restrictions,
          cpds: context.carePlanDirectives || [],
          currentDietScore: context.healthMetrics?.dietScore || 0,
          cbtMiApproach: context.cpdGuidance?.cbt_mi_approach || 'both'
        })
      });

      return response.meals || this.generateFallbackMeals(mealType, restrictions);
    } catch (error) {
      console.error('[InspirationMachineDServer] Meal generation error:', error);
      return this.generateFallbackMeals(mealType, restrictions);
    }
  }

  /**
   * Generate fallback meal suggestions when API fails
   */
  generateFallbackMeals(mealType, restrictions) {
    const baseMeals = {
      breakfast: [
        'Oatmeal with fresh berries and nuts',
        'Greek yogurt with honey and granola',
        'Whole grain toast with avocado'
      ],
      lunch: [
        'Grilled chicken salad with mixed vegetables',
        'Quinoa bowl with roasted vegetables',
        'Lentil soup with whole grain bread'
      ],
      dinner: [
        'Baked salmon with steamed vegetables',
        'Lean beef stir-fry with brown rice',
        'Vegetable curry with chickpeas'
      ],
      snack: [
        'Apple slices with almond butter',
        'Mixed nuts and dried fruit',
        'Carrot sticks with hummus'
      ]
    };

    return baseMeals[mealType] || baseMeals.general || [];
  }

  /**
   * Format meal response with CPD compliance focus
   */
  formatMealResponse(meals, mealType, context) {
    let response = `**${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Suggestions** 🍽️\n\n`;

    if (meals.length === 0) {
      return this.formatNoMealsResponse(mealType, context);
    }

    meals.slice(0, 5).forEach((meal, index) => {
      response += `${index + 1}. **${meal.name || meal}**\n`;
      if (meal.description) {
        response += `   ${meal.description}\n`;
      }
      if (meal.cpdAlignment) {
        response += `   💡 Supports: ${meal.cpdAlignment}\n`;
      }
      response += '\n';
    });

    // Add CPD alignment messaging
    response += this.generateDietCPDGuidance(context);
    
    // Add 8-10 scoring guidance
    response += this.generateDietScoringGuidance(context);

    return response;
  }

  /**
   * Generate CPD-specific dietary guidance
   */
  generateDietCPDGuidance(context) {
    if (!context.carePlanDirectives || context.carePlanDirectives.length === 0) {
      return `\n💡 **Care Plan Note**: Your doctor hasn't set specific dietary directives yet. Consider discussing nutrition goals during your next appointment.\n`;
    }

    const dietCPDs = context.carePlanDirectives.filter(cpd => 
      cpd.category.toLowerCase().includes('diet') || 
      cpd.category.toLowerCase().includes('nutrition')
    );

    if (dietCPDs.length === 0) {
      return `\n💡 **Nutrition Support**: While your current care plan focuses on other areas, good nutrition supports all health goals.\n`;
    }

    const cpd = dietCPDs[0];
    return `\n💡 **Care Plan Alignment**: These suggestions directly support your doctor's directive: "${cpd.directive}"\n`;
  }

  /**
   * Generate guidance for achieving 8-10 diet scores
   */
  generateDietScoringGuidance(context) {
    const currentScore = context.healthMetrics?.dietScore || 0;
    const approach = context.cpdGuidance?.cbt_mi_approach || 'both';

    let guidance = `\n🎯 **Path to 8-10 Diet Scores**:\n`;

    if (currentScore >= 8) {
      guidance += `• Outstanding nutrition choices (${currentScore}/10)! These meals help maintain your excellent habits.\n`;
      guidance += `• **Consistency Question**: What eating patterns have been working best for you?\n`;
    } else if (currentScore >= 6) {
      guidance += `• You're developing good nutrition habits (${currentScore}/10). These suggestions can help reach 8-10.\n`;
      if (approach.includes('cognitive_behavioral_therapy')) {
        guidance += `• **CBT Reframe**: Replace "I can't eat healthy" with "I'm learning to enjoy nourishing foods."\n`;
      }
    } else {
      guidance += `• Every healthy meal choice is progress toward better nutrition.\n`;
      if (approach.includes('motivational_interviewing')) {
        guidance += `• **MI Question**: What healthy foods have you enjoyed in the past?\n`;
      }
    }

    if (approach.includes('both') || approach.includes('motivational_interviewing')) {
      guidance += `• **Reflection**: How confident do you feel about preparing one of these meals this week?\n`;
    }

    guidance += `\n🥗 **Remember**: Honest 8-10 scores mean you're consistently following your care plan's nutrition guidance.\n`;

    return guidance;
  }

  /**
   * Handle no meals available scenario
   */
  formatNoMealsResponse(mealType, context) {
    let response = `I'm having trouble finding specific ${mealType} suggestions right now.\n\n`;
    
    if (context.carePlanDirectives) {
      const dietCPD = context.carePlanDirectives.find(cpd => 
        cpd.category.toLowerCase().includes('diet')
      );
      
      if (dietCPD) {
        response += `**Care Plan Focus**: Your doctor's directive "${dietCPD.directive}" can guide your food choices. Try using the Food Database feature to find specific foods that align with this guidance.\n\n`;
      }
    }

    response += `**Alternative Suggestions**:\n`;
    response += `• Use the Food Database to explore Australian nutrition information\n`;
    response += `• Focus on whole foods that align with your care plan\n`;
    response += `• Remember: consistent healthy choices build toward 8-10 scores\n`;

    return response;
  }
}

export default new InspirationMachineDServer();