import type { Question } from './types';

/**
 * Get visible questions based on current answers and conditions
 */
export function getVisibleQuestions(
  questions: Question[],
  answers: Record<string, string>
): Question[] {
  return questions.filter((q) => shouldShowQuestion(q, answers));
}

/**
 * Check if a question should be shown based on conditions
 */
export function shouldShowQuestion(
  question: Question,
  answers: Record<string, string>
): boolean {
  if (!question.conditions) return true; // no conditions → show

  return Object.entries(question.conditions).every(([prevQId, conditionValue]) => {
    const prevAnswer = answers[prevQId];
    
    // Handle both old format (direct array) and new format (object with require/exclude)
    if (Array.isArray(conditionValue)) {
      // Old format: { race: ["human", "mait"] }
      return conditionValue.includes(prevAnswer);
    }
    
    if (typeof conditionValue === 'object' && conditionValue !== null) {
      // New format: { race: { require: ["human", "mait"] } }
      const obj = conditionValue as Record<string, any>;
      
      if (obj.require && Array.isArray(obj.require)) {
        if (!obj.require.includes(prevAnswer)) return false;
      }
      
      if (obj.exclude && Array.isArray(obj.exclude)) {
        if (obj.exclude.includes(prevAnswer)) return false;
      }
      
      return true;
    }
    
    return false;
  });
}

/**
 * Sort questions by order if available
 */
export function sortQuestions(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => {
    // Type assertion to allow optional order property
    const aOrder = (a as any).order ?? 0;
    const bOrder = (b as any).order ?? 0;
    return aOrder - bOrder;
  });
}
