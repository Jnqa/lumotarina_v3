import type { Question } from '../types';

type Props = {
  question: Question;
  answer?: string;
  onSelect: (optionId: string) => void;
};

export default function ChoiceQuestion({ question, answer, onSelect }: Props) {
  return (
    <div className="options">
      {question.options.map(opt => (
        <button
          key={opt.id}
          className={answer === opt.id ? 'option selected' : 'option'}
          onClick={() => onSelect(opt.id)}
        >
          {opt.media?.image && <img src={opt.media.image} alt={opt.text} />}

          <div className="option-text">
            <strong>{opt.text}</strong>
            {opt.media?.text && <div className="option-desc">{opt.media.text}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}
