import type { Question } from '../types';
import './GenderQuestion.css';

type Props = {
  question: Question;
  answer?: string;
  onSelect: (optionId: string) => void;
};

export default function GenderQuestion({ question, answer, onSelect }: Props) {
  return (
    <div className="gender-grid">
      {question.options.map(opt => (
        <div
          key={opt.id}
          className={answer === opt.id ? `gender-card selected ${opt.id}` : 'gender-card'}
          onClick={() => onSelect(opt.id)}
        >
          <h3>{opt.text}</h3>
          {opt.media?.text && <p>{opt.media.text}</p>}
        </div>
      ))}
    </div>
  );
}
