export function getLowestScoringArea(
  dietScore: number, 
  exerciseScore: number, 
  medicationScore: number
): 'diet' | 'exercise' | 'medication' {
  if (dietScore <= exerciseScore && dietScore <= medicationScore) return 'diet';
  if (exerciseScore <= dietScore && exerciseScore <= medicationScore) return 'exercise';
  return 'medication';
}

export function generateDetailedAnalysis(
  dietScore: number,
  exerciseScore: number,
  medicationScore: number,
  useAustralianEnglish = true
): string {
  let analysis = '';
  // Diet
  if (dietScore <= 3) {
    analysis += `Your diet adherence score of ${dietScore}/10 indicates significant challenges in following your nutritional plan. This is the area requiring the most immediate attention.\n\n`;
  } else if (dietScore >= 8) {
    analysis += `Your diet adherence score of ${dietScore}/10 shows excellent commitment to your nutritional guidelines. Well done on maintaining this ${useAustralianEnglish ? 'behaviour' : 'behavior'}.\n\n`;
  } else {
    analysis += `Your diet adherence score of ${dietScore}/10 shows moderate success with room for improvement.\n\n`;
  }
  // Exercise
  if (exerciseScore <= 3) {
    analysis += `Your exercise score of ${exerciseScore}/10 suggests difficulty maintaining regular activity. Consider a tailored plan.\n\n`;
  } else if (exerciseScore >= 8) {
    analysis += `Your exercise score of ${exerciseScore}/10 demonstrates strong commitment. This consistency will yield significant benefits.\n\n`;
  } else {
    analysis += `Your exercise score of ${exerciseScore}/10 indicates moderate levels. Try to make it more enjoyable and regular.\n\n`;
  }
  // Medication
  if (medicationScore <= 3) {
    analysis += `Your medication score of ${medicationScore}/10 indicates challenges with adherence. This is critical to address for treatment efficacy.\n\n`;
  } else if (medicationScore >= 8) {
    analysis += `Excellent medication adherence (${medicationScore}/10). Keep up this important routine.\n\n`;
  } else {
    analysis += `Your medication adherence is moderate (${medicationScore}/10). Seek support if you're struggling to keep on track.\n\n`;
  }
  return analysis.trim();
}