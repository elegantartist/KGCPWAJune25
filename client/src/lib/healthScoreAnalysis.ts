/**
 * Health Score Analysis Utility
 * Generates comprehensive health score analysis with Australian English support
 */

// Australian English spelling dictionary
const australianSpelling = {
  specialized: 'specialised',
  organization: 'organisation',
  behavior: 'behaviour',
  center: 'centre',
  program: 'programme',
  color: 'colour',
  analyze: 'analyse',
  fiber: 'fibre',
  yogurt: 'yoghurt',
  personalized: 'personalised',
  visualization: 'visualisation',
  counselor: 'counsellor'
};

// Convert text to Australian English
export function toAustralianEnglish(text: string, useAustralian = true): string {
  if (!useAustralian) return text;
  
  let australianText = text;
  Object.entries(australianSpelling).forEach(([american, australian]) => {
    // Replace all occurrences with global regex
    const regex = new RegExp(american, 'gi');
    australianText = australianText.replace(regex, (match) => {
      // Preserve capitalization
      return match.charAt(0) === match.charAt(0).toUpperCase() 
        ? australian.charAt(0).toUpperCase() + australian.slice(1) 
        : australian;
    });
  });
  
  return australianText;
}

// Determine the lowest scoring health area
export function getLowestScoringArea(
  dietScore: number, 
  exerciseScore: number, 
  medicationScore: number
): 'diet' | 'exercise' | 'medication' {
  if (dietScore <= exerciseScore && dietScore <= medicationScore) return 'diet';
  if (exerciseScore <= dietScore && exerciseScore <= medicationScore) return 'exercise';
  return 'medication';
}

// Generate detailed analysis for each health area
export function generateDetailedAnalysis(
  dietScore: number,
  exerciseScore: number,
  medicationScore: number,
  useAustralianEnglish = true
): string {
  let analysis = '';
  
  // Diet analysis
  if (dietScore <= 3) {
    analysis += `Your diet adherence score of ${dietScore}/10 indicates significant challenges in following your nutritional plan. This is the area requiring the most immediate attention.\n\n`;
  } else if (dietScore >= 8) {
    analysis += `Your diet adherence score of ${dietScore}/10 shows excellent commitment to your nutritional guidelines. Well done on maintaining this ${useAustralianEnglish ? 'behaviour' : 'behavior'}.\n\n`;
  } else {
    analysis += `Your diet adherence score of ${dietScore}/10 shows moderate success in following nutritional guidelines, with room for improvement.\n\n`;
  }
  
  // Exercise analysis
  if (exerciseScore <= 3) {
    analysis += `Your exercise routine score of ${exerciseScore}/10 suggests you're having difficulty maintaining regular physical activity. A ${useAustralianEnglish ? 'specialised' : 'specialized'} exercise plan may help.\n\n`;
  } else if (exerciseScore >= 8) {
    analysis += `Your exercise routine score of ${exerciseScore}/10 demonstrates strong commitment to physical activity. This consistency will yield significant long-term benefits.\n\n`;
  } else {
    analysis += `Your exercise score of ${exerciseScore}/10 indicates moderate activity levels. Consider finding ways to make exercise more enjoyable and consistent.\n\n`;
  }
  
  // Medication analysis
  if (medicationScore <= 3) {
    analysis += `Your medication adherence score of ${medicationScore}/10 indicates challenges with taking medications as prescribed. This is critical to address for treatment efficacy.\n\n`;
  } else if (medicationScore >= 8) {
    analysis += `Your medication adherence score of ${medicationScore}/10 shows excellent consistency in following your prescribed medication regimen.\n\n`;
  } else {
    analysis += `Your medication adherence score of ${medicationScore}/10 shows moderate consistency. Setting reminders could help improve this score.\n\n`;
  }
  
  return toAustralianEnglish(analysis, useAustralianEnglish);
}

// Generate recommendations based on lowest health area
export function generateRecommendations(
  dietScore: number,
  exerciseScore: number, 
  medicationScore: number,
  useAustralianEnglish = true
): string {
  const lowestArea = getLowestScoringArea(dietScore, exerciseScore, medicationScore);
  
  let recommendations = '';
  
  switch (lowestArea) {
    case 'diet':
      recommendations = `**Diet Improvement Focus**:\n- Use the Food Database feature to find nutritious alternatives that align with your care plan\n- Visit Inspiration Machine D for meal ideas tailored to your health needs\n- Consider setting up a weekly meal plan through the Diet Logistics feature`;
      break;
    case 'exercise':
      recommendations = `**Exercise Improvement Focus**:\n- Explore Inspiration Machine E&W for guided workout videos\n- Use E&W Support to find local exercise resources\n- Start with small, achievable goals like a 10-minute daily walk and build up gradually\n- Track your progress with the Progress Milestones feature`;
      break;
    case 'medication':
      recommendations = `**Medication Adherence Focus**:\n- Set up daily reminders to take medications at the same time\n- Use MBP Wiz to find nearby pharmacies for prescription refills\n- Track your medication routine in the Journaling feature\n- Consider discussing any side effects with your healthcare provider`;
      break;
    default:
      recommendations = `Continue your balanced approach to health management. Consider using:\n- Health Snapshots to visualize your progress\n- Journaling to identify patterns and triggers\n- Daily Self Scores to maintain awareness of your health ${useAustralianEnglish ? 'behaviours' : 'behaviors'}`;
  }
  
  return toAustralianEnglish(recommendations, useAustralianEnglish);
}

// Generate complete health score analysis in markdown format
export function generateHealthScoreAnalysis(
  dietScore: number,
  exerciseScore: number,
  medicationScore: number,
  useAustralianEnglish = true
): string {
  const analysis = `
# Health Score Analysis

## Score Summary
- **Diet Adherence**: ${dietScore}/10
- **Exercise Routine**: ${exerciseScore}/10
- **Medication Adherence**: ${medicationScore}/10

## Detailed Analysis
${generateDetailedAnalysis(dietScore, exerciseScore, medicationScore, useAustralianEnglish)}

## Recommendations
${generateRecommendations(dietScore, exerciseScore, medicationScore, useAustralianEnglish)}

## Next Steps
Continue tracking your daily scores to establish consistent patterns. Remember that small improvements over time lead to significant long-term health benefits.
`;

  return analysis;
}