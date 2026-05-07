import { useMemo, useState } from 'react'
import './Quests.css'
import type { QuestType, QuestStatus } from './types/quest'

interface Props {
  quests: QuestType[]
  onClose: () => void
  onUpdateQuest: (quest: QuestType) => void
}

const statusLabel = (status: QuestStatus) => {
  switch (status) {
    case 'completed': return '✓ Выполнен'
    case 'active': return 'В процессе'
    case 'available': return 'Доступен'
    case 'frozen': return 'Заморожен'
    case 'forgotten': return 'Забыт'
    default: return 'Неизвестно'
  }
}

const statusClass = (status: QuestStatus) => status

const tabs = [
  { key: 'active', label: 'Активные' },
  { key: 'completed', label: 'Выполненные' },
  { key: 'forgotten', label: 'Забытые' },
] as const

const statusOptions: Array<{ key: QuestStatus; label: string }> = [
  { key: 'active', label: 'В процессе' },
  { key: 'available', label: 'Доступен' },
  { key: 'frozen', label: 'Заморожен' },
  { key: 'completed', label: 'Выполнен' },
  { key: 'forgotten', label: 'Забыт' },
]

export default function Quests({ quests, onClose, onUpdateQuest }: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'forgotten'>('active')
  const [selectedQuest, setSelectedQuest] = useState<QuestType | null>(null)

  const filteredQuests = useMemo(() => {
    return quests.filter((quest) => {
      const status = quest.status
      if (activeTab === 'active') return ['active', 'available', 'frozen'].includes(status)
      if (activeTab === 'completed') return status === 'completed'
      if (activeTab === 'forgotten') return status === 'forgotten'
      return false
    })
  }, [quests, activeTab])

  return (
    <div className="quests-container">
      <div className="quests-header">
        <h2>Квесты</h2>
        <button className="quests-close" onClick={onClose}>×</button>
      </div>

      <div className="quests-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="quests-content">
        {filteredQuests.length === 0 ? (
          <div className="quests-empty">Нет квестов</div>
        ) : (
          <div className="quests-list">
            {filteredQuests.map(quest => (
              <div
                key={quest.id}
                className={`quest-item ${statusClass(quest.status)}`}
                onClick={() => setSelectedQuest(quest)}
              >
                <div className="quest-header">
                  <span className="quest-type">
                    {quest.type === 'team' ? 'Командный' : 'Личный'}
                  </span>
                  <span className={`quest-status ${statusClass(quest.status)}`}>
                    {statusLabel(quest.status)}
                  </span>
                </div>

                <h3 className="quest-title">{quest.title}</h3>
                <p className="quest-description">{quest.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedQuest && (
        <div className="quest-modal">
          <div className="quest-modal-content">
            <h3>{selectedQuest.title}</h3>

            <div className="quest-actions">
              {statusOptions.map(option => (
                <button
                  key={option.key}
                  onClick={() => {
                    onUpdateQuest({
                      ...selectedQuest,
                      status: option.key
                    })
                    setSelectedQuest(null)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button onClick={() => setSelectedQuest(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}