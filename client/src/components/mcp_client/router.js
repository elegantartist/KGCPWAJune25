/**
 * MCP Client Router - Kitchen Expediter
 * 
 * This is the routing system that takes tool requests from the Supervisor Agent
 * and delegates them to the appropriate specialist servers in the mcp_servers directory.
 */

// Import all available MCP servers
import SearchServer from '../mcp_servers/SearchServer.js';
import ContentGenerationServer from '../mcp_servers/ContentGenerationServer.js';
import HealthMetricsServer from '../mcp_servers/HealthMetricsServer.js';
import InspirationMachineDServer from '../mcp_servers/InspirationMachineDServer.js';
import PPRAnalysisServer from '../mcp_servers/PPRAnalysisServer.js';

/**
 * Route a tool request to the appropriate server
 * @param {string} toolName - The name of the tool to execute
 * @param {string} argument - The raw user argument to pass to the tool
 * @param {object} context - Additional context (userId, CPDs, etc.)
 * @returns {Promise<string>} - The formatted response from the specialist server
 */
export async function routeRequest(toolName, argument, context = {}) {
  console.log(`[Router] Routing request to: ${toolName} with argument: ${argument}`);
  
  try {
    switch (toolName) {
      case 'find_local_exercise_support':
      case 'search_local_exercise_support':
        return await SearchServer.execute(argument, context);
      
      case 'generate_health_content':
      case 'create_motivational_content':
        return await ContentGenerationServer.execute(argument, context);
      
      case 'analyze_health_metrics':
      case 'get_health_scores':
      case 'health_metrics_analysis':
        return await HealthMetricsServer.execute(argument, context);
      
      case 'inspiration_machine_d':
      case 'meal_planning':
      case 'diet_inspiration':
        return await InspirationMachineDServer.execute(argument, context);
      
      case 'mbp_wizard':
      case 'medication_price_comparison':
      case 'medication_support':
        return `**Medication Support** 💊\n\nI can help you understand medication adherence and its importance to your health scores. For specific medication price comparisons, please consult your pharmacist or doctor.\n\n**Care Plan Focus**: Following your medication directive consistently helps achieve 8-10 scores in this category.`;
      
      case 'food_database':
      case 'nutrition_lookup':
      case 'food_information':
        return `**Australian Food Information** 🥗\n\nI can provide general nutrition information about Australian foods. For detailed nutritional data aligned with your care plan, use the dedicated Food Database feature in the KGC app.\n\n**Tip**: Focus on foods that support your doctor's dietary directives.`;
      
      case 'ew_support':
      case 'exercise_wellness_support':
      case 'fitness_guidance':
        return await SearchServer.execute(argument, context); // Redirect to search for now
      
      case 'progress_milestones':
      case 'achievement_tracking':
      case 'rewards_system':
        return `**Progress Tracking** 🏆\n\nYour health journey includes achieving consistent 8-10 scores across all categories. This shows excellent care plan compliance.\n\n**Current Focus**: Use the dedicated Progress Milestones feature to track your achievements and unlock rewards for consistent healthy habits.`;
      
      case 'care_plan_directives':
      case 'cpd_management':
      case 'directive_analysis':
        return await ContentGenerationServer.execute(argument, context);
      
      case 'ppr_analysis':
      case 'patient_progress_report':
      case 'generate_ppr':
      case 'doctor_analysis':
        return await PPRAnalysisServer.execute(argument, context);
      
      case 'journaling':
      case 'health_journaling':
      case 'reflection_support':
        return `**Health Journaling** 📝\n\nReflection is a powerful tool for understanding your health patterns and building sustainable habits.\n\n**CBT Approach**: Use journaling to identify thoughts and behaviors that support your care plan compliance.\n\n**Use the dedicated Journaling feature** in the KGC app for structured health reflection and progress tracking.`;
      
      case 'motivational_imaging':
      case 'image_motivation':
      case 'visual_inspiration':
        return `**Motivational Support** 🌟\n\nVisual motivation can be powerful for maintaining health habits. Consider creating visual reminders of your health goals and care plan directives.\n\n**Keep Going Button**: Use this feature in the KGC app to upload inspiring images and connect them to your health journey.`;
      
      default:
        console.warn(`[Router] Unknown tool: ${toolName}`);
        return `I don't recognize the tool "${toolName}". Available tools include health metrics analysis, meal planning, medication support, exercise guidance, and more. Please try rephrasing your request.`;
    }
  } catch (error) {
    console.error(`[Router] Error routing to ${toolName}:`, error);
    return `I encountered an error while processing your request with ${toolName}. Please try again or rephrase your question.`;
  }
}

/**
 * Get list of available tools for the Supervisor Agent
 */
export function getAvailableTools() {
  return [
    {
      name: 'find_local_exercise_support',
      description: 'Find local fitness facilities, exercise classes, and wellness services',
      categories: ['exercise', 'fitness', 'local', 'wellness', 'yoga', 'gym', 'pilates']
    },
    {
      name: 'analyze_health_metrics',
      description: 'Analyze daily health scores and provide insights with CBT and MI techniques',
      categories: ['health', 'metrics', 'analysis', 'scores', 'progress', 'tracking']
    },
    {
      name: 'inspiration_machine_d',
      description: 'Generate meal plans and dietary inspiration aligned with Care Plan Directives',
      categories: ['diet', 'meal', 'nutrition', 'food', 'cooking', 'recipe', 'eating']
    },
    {
      name: 'care_plan_directives',
      description: 'Care Plan Directive management and compliance analysis',
      categories: ['cpd', 'compliance', 'directives', 'care plan', 'doctor', 'goals', 'reminder']
    },
    {
      name: 'ppr_analysis',
      description: 'Generate comprehensive Patient Progress Reports for doctors with CPD recommendations',
      categories: ['ppr', 'doctor', 'analysis', 'report', 'progress', 'recommendations', 'cpd update']
    }
  ];
}

export default { routeRequest, getAvailableTools };