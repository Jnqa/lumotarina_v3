import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useCharacter from '../hooks/useCharacter'

import CharacterStats from './components/CharacterStats.tsx'
import ClassInfo from './components/ClassInfo.tsx'
import Backstory from './components/Backstory.tsx'
import CharacterHero from './components/CharacterHero'
import Quests from '../quests/Quests'

import './CharacterPage.css'

export default function CharacterPage() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const { character, loading, error, refresh, save, setCharacter } = useCharacter(userId, charId)
  const nav = useNavigate()
  const [questsOpen, setQuestsOpen] = useState(false)

  if (loading) return <div className="cp-loading">Загрузка...</div>
  if (error) return <div className="cp-error">{error}</div>
  if (!character) return <div className="cp-error">Персонаж не найден</div>

  // Костыль для поддержки старых булевых статусов квестов, которые могли сохраниться в базе данных
  const normalizedQuests = (character.quests || []).map(q => ({
    ...q,
    status:
      q.status === true
        ? 'completed'
        : q.status === false
        ? 'active'
        : q.status
  }))

  return (
    <div className="character-page">
      <div className="cp-top-buttons">
        <div className="cp-top-buttons left">
          <button className="dm-btn" onClick={() => nav('/')}>← 🏠︎</button>
        </div>
        <div className="cp-top-buttons center">
          <button className="dm-btn" onClick={() => setQuestsOpen(true)}>Квесты</button>
        </div>
        <div className="cp-top-buttons right">        
          <button className="dm-btn" onClick={refresh}>↻</button>
          <button className="dm-btn" onClick={() => nav('edit')}>✎</button>
        </div>
      </div>
      <CharacterHero
        name={character.name}
        picture={(character.picture || character.avatar) as string}
        avatar={character.avatar}
        hp={character.hp}
        hpMax={character.hpMax}
        classNameStr={character.class || character.classInfo}
        level={character.level}
        armor={character.armor}
        story={character.story}
        userId={userId || ''}
        charId={(character.id || (character as any)._id || charId) as string} 
        totalMaxHP={character.totalMaxHP}
      />

      <CharacterStats stats={character.stats} />

      <ClassInfo classInfo={character.classInfo} />

      <Backstory story={character.backstory} />

      {questsOpen && (
        <div className="quests-modal-backdrop" onClick={() => setQuestsOpen(false)}>
          <div className="quests-modal-content" onClick={(e) => e.stopPropagation()}>
            <Quests
              quests={normalizedQuests}
              onClose={() => setQuestsOpen(false)}
              onUpdateQuest={async (updatedQuest) => {
                const updatedQuests = normalizedQuests.map((q) => (q.id === updatedQuest.id ? updatedQuest : q))
                try {
                  const saved = await save({ quests: updatedQuests })
                  setCharacter((prev) => prev ? { ...prev, ...saved, quests: updatedQuests } : prev)
                } catch (e) {
                  console.warn('Quest update failed', e)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}