import { useEffect, useState } from 'react';
import './CharacterCreation.css';
import type { Question } from './types';
import QuestionRenderer from './QuestionRenderer';
import { useNavigate } from 'react-router-dom';

export default function CharacterCreation() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<any>(null);
    const [BackgroundStory, setBackgroundStory] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [direction, setdirection] = useState(1);
    const navigate = useNavigate(); // Вызываем хук здесь



    //visuals
    const [progressColor, setProgressColor] = useState<string>('#2196F3');
    const [progressBg, setProgressBg] = useState<string>('#BBDEFB');
    // const [background, setBackground] = useState<string>('#1e1e1e;');
    
    const [API_BASE, setAPI_BASE] = useState<string>(() => {
    try{
        // @ts-ignore
        if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
            // @ts-ignore
            return (window as any).__RUNTIME__.VITE_API_BASE;
            }
        }catch(e){}
    return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
    });

    useEffect(() => {
      // attempt to refresh runtime config if config.js was mounted after bundle
      try{
        // @ts-ignore
        if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE && (window as any).__RUNTIME__.VITE_API_BASE !== API_BASE) {
          // @ts-ignore
          setAPI_BASE((window as any).__RUNTIME__.VITE_API_BASE);
        }
      }catch(e){}
    }, []);

    useEffect(() => {
      fetch(`${API_BASE}/story/questions`)
        .then(res => res.json())
        .then(setQuestions);
    }, []);

    useEffect(() => {
    let s = step;

    while (s >= 0 && s < questions.length) {
        const q = questions[s];
        if (shouldShowQuestion(q, answers)) break;
        if (direction < 0) s--; else s++;
    }

    if (s !== step) setStep(s);
    }, [answers, step, questions]);

    if (!questions.length) {
      return <div className="loader">Загрузка…</div>;
    }

    const question = questions[step];

    const shouldShowQuestion = (question: Question, answers: Record<string, string>) => {
    if (!question.conditions) return true; // нет условий → показываем

    return Object.entries(question.conditions).every(([prevQId, allowedValues]) => {
        const prevAnswer = answers[prevQId];
        return allowedValues.includes(prevAnswer);
    });
    };

    const handleSelect = (optionId: string) => {
      setAnswers(prev => ({
        ...prev,
        [question.id]: optionId
      }));

      // Перекраска прогрессбара
      // найдем выбранную опцию
      const selectedOption = question.options.find(opt => opt.id === optionId);
      if (selectedOption?.visuals) {
          if (selectedOption.visuals.progressColor) setProgressColor(selectedOption.visuals.progressColor);
          if (selectedOption.visuals.progressBg) setProgressBg(selectedOption.visuals.progressBg);
        //   if (selectedOption.visuals.background) setBackground(selectedOption.visuals.background);
      }
    };

    const next = () => {
      if (step < questions.length - 1) {
        setStep(step + 1);
        setdirection(1);
      } else {
        console.log("submit", answers);
        submit();
      }
    };

    const prev = () => {
      if (step > 1) {
        setStep(step - 1);
        setdirection(-1);
      } else {
        setStep(0);
      }
    };

    const submit = async () => {
      try {
        const res = await fetch(`${API_BASE}/story/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers })
        });
        const data = await res.json();
        setResult(data.character);
        console.log("Result: ", result || "No result");
        setBackgroundStory(data.backgroundStory);
        // Сохраняем в сессию для дальнейшего использования
        sessionStorage.setItem('characterResult', JSON.stringify(data.character));
        
        console.log("📚 BackgroundStory: ");
        console.log(BackgroundStory);

          // Показываем модальное окно вместо перехода
        setShowModal(true);
      } catch (error) {
        console.error("Ошибка при отправке:", error);
      }
    };

    return (
      <div className="character-page">
        <div className="progress-bar-bg" style={{ backgroundColor: progressBg }} />
        <div className="progress-bar-top" style={{ width: `${((step + 1)/questions.length)*100}%`, backgroundColor: progressColor }} />

        <div className="question-text"><span>{question.text}</span></div>

        <QuestionRenderer
          question={question}
          answer={answers[question.id]}
          onSelect={handleSelect}
        />
        <div className="buttons-line">
            <button
            className="prev-button"
            disabled={step === 0}
            onClick={prev}
            >
            {step === 0 ? '🦉' : 'Назад'}
            </button>

            <button
            className="next-button"
            disabled={!answers[question.id]}
            onClick={next}
            >
            {step === questions.length - 1 ? 'Завершить' : 'Далее'}
            </button>
        </div>
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>История твоего героя:</h2>
              
              {/* whiteSpace: 'pre-line' сохранит переносы строк из вашего текста */}
              <div className="story-text" style={{ whiteSpace: 'pre-line', textAlign: 'left', margin: '20px 0' }}>
                {BackgroundStory}
              </div>

              <button 
                className="next-button" 
                onClick={() => navigate('/creator/character/class')}
              >
                Продолжить
              </button>
            </div>
          </div>
        )}
      </div>
    );
}
