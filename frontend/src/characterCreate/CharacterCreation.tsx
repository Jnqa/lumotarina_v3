import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CharacterCreation.css';
import type { Question, City } from './types';
import QuestionRenderer from './components/QuestionRenderer';
import StoryModal from './components/StoryModal';
import { getVisibleQuestions, sortQuestions } from './utils';

export default function CharacterCreation() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [citiesData, setCitiesData] = useState<Record<string, City>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [progressColor, setProgressColor] = useState('#4a9eff');
  // const [progressBg, setProgressBg] = useState('#0d2a4a');
  const [showModal, setShowModal] = useState(false);
  const [story, setStory] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const [API_BASE] = useState<string>(() => {
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).__RUNTIME__?.VITE_API_BASE) {
        // @ts-ignore
        return (window as any).__RUNTIME__.VITE_API_BASE;
      }
    } catch (e) {}
    return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
  });

  // Load questions and cities data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load questions
        const questionsRes = await fetch(`${API_BASE}/story/questions`);
        const questionsData = await questionsRes.json();
        const sorted = sortQuestions(questionsData);
        setQuestions(sorted);

        // Load cities list
        const citiesRes = await fetch(`${API_BASE}/get-lore/cities_list`);
        const citiesList = await citiesRes.json();

        // Create cities data map
        const citiesMap: Record<string, City> = {};
        citiesList.forEach((city: City) => {
          citiesMap[city.id] = city;
        });
        setCitiesData(citiesMap);

        // Set initial current question
        if (sorted.length > 0) {
          setCurrentId(sorted[0].id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [API_BASE]);

  // Get visible questions based on answers
  const visibleQuestions = getVisibleQuestions(questions, answers);
  const currentIdx = currentId
    ? visibleQuestions.findIndex((q) => q.id === currentId)
    : -1;
  const question = visibleQuestions[currentIdx] ?? visibleQuestions[0];
  const total = visibleQuestions.length;
  const progress = total > 0 ? ((currentIdx + 1) / total) * 100 : 0;

  // Keep currentId valid if visibility changes
  useEffect(() => {
    if (visibleQuestions.length > 0) {
      if (!currentId || !visibleQuestions.find((q) => q.id === currentId)) {
        setCurrentId(visibleQuestions[0]?.id);
      }
    }
  }, [visibleQuestions, currentId]);

  // Add/remove nav-fixed class to body based on answer selection
  useEffect(() => {
    if (answers[question?.id]) {
      document.body.classList.add('nav-fixed');
    } else {
      document.body.classList.remove('nav-fixed');
    }

    return () => {
      document.body.classList.remove('nav-fixed');
    };
  }, [answers, question?.id]);

  const handleSelect = useCallback(
    (optionId: string) => {
      if (!question) return;

      setAnswers((prev) => ({
        ...prev,
        [question.id]: optionId,
      }));

      const selectedOption = question.options.find((opt: any) => opt.id === optionId);
      if (selectedOption?.visuals) {
        if (selectedOption.visuals.progressColor) {
          setProgressColor(selectedOption.visuals.progressColor);
        }
        // progressBg is currently unused but may be needed in future
        // if (selectedOption.visuals.progressBg) {
        //   setProgressBg(selectedOption.visuals.progressBg);
        // }
      }
    },
    [question]
  );

  const handleNext = useCallback(() => {
    if (currentIdx < visibleQuestions.length - 1) {
      setCurrentId(visibleQuestions[currentIdx + 1].id);
      setAnimKey((k) => k + 1);
    } else {
      handleSubmit();
    }
  }, [currentIdx, visibleQuestions]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentId(visibleQuestions[currentIdx - 1].id);
      setAnimKey((k) => k + 1);
    }
  }, [currentIdx, visibleQuestions]);

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/story/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setStory(data.backgroundStory || 'Твоя история формируется...');
      setShowModal(true);

      // Save to session for later use
      sessionStorage.setItem('characterResult', JSON.stringify(data.character));
    } catch (error) {
      console.error('Error submitting character:', error);
      setStory('Ошибка при создании персонажа. Пожалуйста, попробуйте снова.');
      setShowModal(true);
    }
  };

  const handleContinue = () => {
    navigate('/character/create/class');
  };

  if (loading) {
    return (
      <div className="cc-loader">
        <div className="cc-loader-rune">✦</div>
        <div className="cc-loader-text">Загрузка вопросов...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="cc-loader">
        <div className="cc-loader-rune">✦</div>
        <div className="cc-loader-text">Ошибка: вопросы не загружены</div>
      </div>
    );
  }

  return (
    <>
      <div className="cc-root">
        {/* Progress bar */}
        <div className="cc-progress-track">
          <div
            className="cc-progress-fill"
            style={{
              width: `${progress}%`,
              backgroundColor: progressColor,
              color: progressColor,
            }}
          />
        </div>
        <div className="cc-step-label">
          {currentIdx + 1} / {total}
        </div>

        {/* Header */}
        <div className="cc-header">
          <div className="cc-header-title">Люмотарина · Создание персонажа</div>
          <div className="cc-header-rule">
            <div className="cc-header-line" />
            <div className="cc-header-diamond" />
            <div className="cc-header-line rev" />
          </div>
        </div>

        {/* Card */}
        <div className="cc-card" key={animKey}>
          <h2 className="cc-question">{question.text}</h2>
          <div className="cc-question-line" />

          <QuestionRenderer
            question={question}
            answers={answers}
            onSelect={handleSelect}
            citiesData={citiesData}
          />
        </div>
      </div>

      {/* Navigation - outside cc-root to allow proper fixed positioning */}
      <div className={`cc-nav ${answers[question.id] ? 'fixed' : ''}`}>
        <button
          className="cc-btn"
          disabled={currentIdx === 0}
          onClick={handlePrev}
        >
          {currentIdx === 0 ? '◆' : '← Назад'}
        </button>
        <button
          className="cc-btn cc-btn-primary"
          disabled={!answers[question.id]}
          onClick={handleNext}
        >
          {currentIdx === visibleQuestions.length - 1 ? 'Завершить ◆' : 'Далее →'}
        </button>
      </div>

      {showModal && (
        <StoryModal story={story} onContinue={handleContinue} />
      )}
    </>
  );
}
