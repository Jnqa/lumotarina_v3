import { useEffect, useState } from 'react';

interface StoryModalProps {
  story: string;
  onContinue: () => void;
}

export default function StoryModal({ story, onContinue }: StoryModalProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!story) return;

    setDisplayed('');
    setDone(false);

    let index = 0;
    const typewriterSpeed = 18; // milliseconds per character

    const interval = setInterval(() => {
      if (index < story.length) {
        setDisplayed(story.substring(0, index + 1));
        index++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, typewriterSpeed);

    return () => clearInterval(interval);
  }, [story]);

  return (
    <div className="cc-modal-overlay">
      <div className="cc-modal">
        <div className="cc-modal-title">История твоего героя</div>
        <div className="cc-modal-subtitle">ЛЮМОТАРИНА · ПРЕДЫСТОРИЯ ПЕРСОНАЖА</div>
        <div className="cc-story-text">
          {displayed}
          {!done && <span className="cc-story-cursor" />}
        </div>
        <div className="cc-modal-footer">
          <button
            className="cc-btn cc-btn-primary"
            onClick={onContinue}
            disabled={!done}
          >
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
}
