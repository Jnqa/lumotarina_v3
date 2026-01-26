import ChoiceQuestion from './questions/ChoiceQuestion';
import GenderQuestion from './questions/GenderQuestion';
import ImagesQuestion from './questions/ImagesQuestion';
import type { Question } from './types';

type Props = {
  question: Question;
  answer?: string;
  onSelect: (optionId: string) => void;
};

export default function QuestionRenderer({ question, answer, onSelect }: Props) {
  switch (question.id) {
    case 'gender':
      return <GenderQuestion question={question} answer={answer} onSelect={onSelect} />;
    case 'race':
      return <ImagesQuestion question={question} answer={answer} onSelect={onSelect} />;
    case 'birth_city':
      return <ImagesQuestion question={question} answer={answer} onSelect={onSelect} />;

    default:
      return <ChoiceQuestion question={question} answer={answer} onSelect={onSelect} />;
  }
}
