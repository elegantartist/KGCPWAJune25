export function generateScoreAnalysisMessage(
  diet: number,
  exercise: number,
  medication: number
): string {
  const averageScore = Math.round((diet + exercise + medication) / 3);
  const lowestScore = Math.min(diet, exercise, medication);

  let message = `Thanks for submitting your daily scores! I can see you rated yourself:\n\n`;
  message += `🥗 Diet: ${diet}/10\n`;
  message += `💪 Exercise: ${exercise}/10\n`;
  message += `💊 Medication: ${medication}/10\n\n`;

  // Personalized analysis based on scores
  if (averageScore >= 8) {
    message += `Excellent work! Your average score of ${averageScore}/10 shows you're doing really well with your health goals. `;
  } else if (averageScore >= 6) {
    message += `Good progress! Your average score of ${averageScore}/10 shows you're on the right track. `;
  } else {
    message += `I appreciate your honesty in rating yourself. An average of ${averageScore}/10 gives us a good starting point to work together. `;
  }

  // Identify areas for support
  const lowAreas = [];
  if (diet < 7) lowAreas.push("nutrition");
  if (exercise < 7) lowAreas.push("exercise");
  if (medication < 7) lowAreas.push("medication adherence");

  if (lowAreas.length > 0) {
    message += `I'd love to help you with ${lowAreas.join(' and ')}. `;
  }

  // Feature recommendations based on lowest scores
  if (diet === lowestScore && diet < 7) {
    message += `\n\nFor nutrition support, I recommend checking out our Inspiration Machine D for meal ideas, or Diet Logistics for grocery delivery options aligned with your care plan.`;
  }
  if (exercise === lowestScore && exercise < 7) {
    message += `\n\nFor exercise and wellness, our Inspiration Machine E&W has great ideas, and E&W Support can help you find local gyms and trainers.`;
  }
  if (medication === lowestScore && medication < 7) {
    message += `\n\nFor medication management, our MBP Wiz can help you find the best prices, and Journaling might help track your medication routine.`;
  }

  message += `\n\nWhat would you like to focus on today?`;
  return message;
}