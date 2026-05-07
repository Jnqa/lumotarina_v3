import './CharacterHero.css'
import { useState } from "react";
import CharacterPreview from '../../../modules/CharacterPreview'
import ClassSkills from '../../../modules/ClassSkills';
// no navigation needed any more

type Props = {
  name?: string
  picture?: string
  avatar?: string
  hp?: number
  hpMax?: number
  classNameStr?: string
  level?: number
  armor?: number
  skillpoints?: number
  abilityPoints?: number
  story?: string
  userId?: string
  charId?: string
  totalMaxHP?: number
}

export default function CharacterHero({ name, picture, avatar, hp = 0, hpMax = 0, classNameStr, level, armor, story, userId, charId, totalMaxHP = 0 }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false); // [!] Новый стейт
  const percent = totalMaxHP > 0 ? Math.max(0, Math.min(100, (hp / totalMaxHP) * 100)) : 0

  console.log('CharacterHero hpMax/totalMaxHP', { hpMax, totalMaxHP })

  const toggleFlip = () => {
    setIsAnimating(true); // Включаем 3D-режим
    setFlipped(f => !f);
    
    // Выключаем 3D-режим после окончания анимации (0.6s)
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div className={`flip-card${flipped ? ' is-flipped' : ''} ${isAnimating ? ' is-animating' : ''}`}>
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <div className="character-hero">
            <div className="hero-avatar">
              <div className="hero-info-top">
                  <div className="hero-armor">🛡️{armor ?? '—'}</div>
                  <div className="hero-hp-bar">
                    <div className="hero-hp-fill" style={{ width: `${percent}%` }} />
                    <div className="hero-hp-text">{hp ?? 0}/{totalMaxHP ?? 0}</div>
                  </div>
              </div>
            <div className="hero-info">
              <div className="hero-name">{name}</div>
            </div>
              <img src={picture || avatar || '/profile_pictures/profile_picture_00.jpg'} alt={name} onClick={toggleFlip} />
            </div>

          </div>
          <div className="abilities-map">
            <CharacterPreview userId={(userId) as string} charId={(charId) as string} />
          </div>
          <div className="hero-class-level">{classNameStr || ''} · Уровень {level || 1}</div>
          <button className={`flip-btn${flipped ? ' is-flipped' : ''} ${isAnimating ? ' is-animating' : ''}`} onClick={toggleFlip}>
            ⤿
          </button>
        </div>
        <div className="flip-card-back">
            <div className="hero-story title" onClick={toggleFlip}>История персонажа</div>
            <div className="hero-story-wrapper">
              <div className="hero-story" onClick={toggleFlip}>
              {story}
              </div>
              <div className="skills-map">
                <ClassSkills CharacterID={{userId: userId as string, characterId: charId as string}} isNoTitle={true} />
              </div>
            </div>
          <button className={`flip-btn${flipped ? ' is-flipped' : ''} ${isAnimating ? ' is-animating' : ''} `} onClick={toggleFlip}>
            ⤾
          </button>
        </div>
      </div>
    </div>
  )
}
