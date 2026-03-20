import { useParams, useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

import characterIcon from '../../assets/icons/character.svg'
import inventoryIcon from '../../assets/icons/inventory.svg'
import powersIcon from '../../assets/icons/powers.svg'
import abilitiesIcon from '../../assets/icons/abilities.svg'
import notesIcon from '../../assets/icons/notebook.svg'

export default function BottomNav() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  if (!userId || !charId) return null

  const tabs = [
    { icon: characterIcon, label: 'Персонаж', path: 'character' },
    { icon: inventoryIcon, label: 'Инвентарь', path: 'inventory' },
    { icon: powersIcon, label: 'Powers', path: 'powers' },
    { icon: abilitiesIcon, label: 'Навыки', path: 'abilities' },
    { icon: notesIcon, label: 'Заметки', path: 'notes' },
  ]

  const currentPath = location.pathname.split('/').pop() || 'character'
  // Находим индекс текущей вкладки (0, 1, 2...)
  const activeIndex = tabs.findIndex(t => t.path === currentPath)


  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {/* ЛЕТАЮЩИЙ ИНДИКАТОР */}
        {activeIndex !== -1 && (
          <div 
            className="nav-active-line" 
            style={{ 
              left: `${(activeIndex * 20) + 10}%` 
            }} 
          />
        )}
        {tabs.map(tab => (
          <button
            key={tab.path}
            className={currentPath === tab.path ? 'active' : ''}
            onClick={() => navigate(`/app/${userId}/${charId}/${tab.path}`)}
          >
            <img src={tab.icon} className="nav-icon" alt={tab.label} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}