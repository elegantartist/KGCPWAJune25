/**
 * KGC Tools Registry
 * 
 * This file contains the list of available tools that the Supervisor Agent
 * can use to help patients with their health goals.
 */

export const KGC_TOOLS = [
  {
    name: 'search_local_exercise_support',
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
    name: 'mbp_wizard',
    description: 'Medication price comparison and adherence support',
    categories: ['medication', 'medicine', 'price', 'adherence', 'support', 'pharmacy']
  },
  {
    name: 'food_database',
    description: 'Australian food database and nutritional information',
    categories: ['food', 'nutrition', 'database', 'australian', 'ingredients', 'calories']
  },
  {
    name: 'ew_support',
    description: 'Exercise and wellness support with local options and guidance',
    categories: ['exercise', 'wellness', 'support', 'fitness', 'workout', 'activity']
  },
  {
    name: 'progress_milestones',
    description: 'Track achievements, rewards, and progress milestones',
    categories: ['progress', 'achievements', 'rewards', 'milestones', 'badges', 'goals']
  },
  {
    name: 'care_plan_directives',
    description: 'Care Plan Directive management and compliance analysis',
    categories: ['cpd', 'compliance', 'directives', 'care plan', 'doctor', 'goals']
  },
  {
    name: 'journaling',
    description: 'Health journey documentation with CBT and MI techniques',
    categories: ['journaling', 'reflection', 'cbt', 'documentation', 'thoughts', 'feelings']
  },
  {
    name: 'motivational_imaging',
    description: 'Motivational image processing integrated with Keep Going button',
    categories: ['motivation', 'images', 'visual', 'keep going', 'inspiration', 'pictures']
  }
];

export default KGC_TOOLS;