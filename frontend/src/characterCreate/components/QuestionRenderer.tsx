
import type { Question, Option as OptionType } from '../types';
import Option from './Option';
import CitySelector from './CitySelector';
import WorldSelector from './WorldSelector';

interface QuestionRendererProps {
  question: Question;
  answers: Record<string, string>;
  onSelect: (optionId: string) => void;
  citiesData?: Record<string, any>;
}

/**
 * Check if an option should be shown based on its conditions
 */
function shouldShowOption(option: OptionType, answers: Record<string, string>): boolean {
  if (!option.conditions) {
    return true; // No conditions = always show
  }

  // Structure: { require: { questionId: [value1, value2] }, exclude: { questionId: [...] } }
  
  // Check require conditions (all specified values must match)
  if (option.conditions.require) {
    for (const [questionId, allowedValues] of Object.entries(option.conditions.require)) {
      const answer = answers[questionId];
      if (!Array.isArray(allowedValues) || !allowedValues.includes(answer)) {
        return false;
      }
    }
  }
  
  // Check exclude conditions (none specified values must match)
  if (option.conditions.exclude) {
    for (const [questionId, forbiddenValues] of Object.entries(option.conditions.exclude)) {
      const answer = answers[questionId];
      if (Array.isArray(forbiddenValues) && forbiddenValues.includes(answer)) {
        return false;
      }
    }
  }
  
  return true;
}

export default function QuestionRenderer({
  question,
  answers,
  onSelect,
  citiesData,
}: QuestionRendererProps) {
  // Check if this is a world selection question
  const isWorldQuestion = question.id === 'world';

  if (isWorldQuestion) {
    return (
      <WorldSelector
        options={question.options}
        selected={answers[question.id] || null}
        onSelect={onSelect}
      />
    );
  }

  // Determine grid layout
  const isCityQuestion = question.type === 'city';
  const useGrid2 =
    !isCityQuestion &&
    (question.options.length <= 2 ||
      (question.options.length <= 6 &&
        !question.options.some((o) => o.media?.text)));

  // For city questions, use a different grid
  const gridClass = isCityQuestion
    ? 'grid-3'
    : useGrid2
      ? 'grid-2'
      : 'grid-1';

  // Filter options by conditions
  const filteredOptions = question.options.filter((opt) =>
    shouldShowOption(opt, answers)
  );

  return (
    <div className="cc-question-section">
      {question.description && (
        <p className="cc-question-description">{question.description}</p>
      )}
      <div className={`cc-options ${gridClass}`}>
        {isCityQuestion && citiesData ? (
          // Render city options
          filteredOptions.map((opt) => {
            const city = citiesData[opt.id];
            if (!city) return null;

            return (
              <CitySelector
                key={opt.id}
                city={city}
                selected={answers[question.id] === opt.id}
                onSelect={onSelect}
                description={opt.media?.text || undefined}
              />
            );
          })
        ) : (
          // Render regular options
          filteredOptions.map((opt) => (
            <Option
              key={opt.id}
              opt={opt}
              selected={answers[question.id] === opt.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
