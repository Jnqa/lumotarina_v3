// removed unused React import (using automatic JSX runtime)
// PowerCard not used here; abilities are edited in a compact grid
import useCharacter from '../hooks/useCharacter'
import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './AbilitiesPage.css'

// copy of API_BASE resolution from useCharacter hook
function getApiBase() {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
      // @ts-ignore
      return (window as any).__RUNTIME__.VITE_API_BASE
    }
  } catch (e) {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111'
}

const DEFAULT_ORDER = [
  'Strength','Dexterity','Constitution','Intelligence','Charisma','Perception','Willpower',
  'Engineering','Medicine','Lockpicking','Stealth','Lumion','Nature','Survival',
  'Crafting','Athletics','Acrobatics','History'
]

export default function AbilitiesPage() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const { character, loading, error, save } = useCharacter(userId, charId)

  const [base, setBase] = useState<Record<string, number>>({})
  const [adds, setAdds] = useState<Record<string, number>>({})
  const [abilitiesData, setAbilitiesData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!character) return
    const ab = character.abilities || {}
    setBase(ab)
    setAdds({})
  }, [character])

  // fetch master list of ability definitions from backend
  useEffect(() => {
    const API_BASE = getApiBase()
    fetch(`${API_BASE}/characters/abilities`)
      .then(r => r.json())
      .then(setAbilitiesData)
      .catch(() => {})
  }, [])

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>{error}</div>
  if (!character) return <div>Персонаж не найден</div>

  const totalPoints = character.abilityPoints ?? 0
  const usedPoints = Object.values(adds).reduce((a, v) => a + (v || 0), 0)
  const remaining = Math.max(totalPoints - usedPoints, 0)

  function addPoint(k: string) {
    if (remaining <= 0) return
    setAdds(a => {
      const cur = a[k] || 0
      return { ...a, [k]: cur + 1 }
    })
  }

  async function handleSave() {
    try {
      // merge base + adds
      const newAbilities: Record<string, number> = { ...base }
      Object.entries(adds).forEach(([k, v]) => {
        newAbilities[k] = (newAbilities[k] || 0) + v
      })
      const newRemaining = remaining
      await save({ abilities: newAbilities, abilityPoints: newRemaining })
      alert('Сохранено')
    } catch (e) { alert('Ошибка сохранения') }
  }

  // build ordered list of keys
  const keys = Object.keys(abilitiesData)
  if (keys.length === 0) {
    // fallback to default order if server not loaded yet
    keys.push(...DEFAULT_ORDER)
  }
  // sort according to DEFAULT_ORDER preserving extras
  keys.sort((a, b) => {
    const ai = DEFAULT_ORDER.indexOf(a)
    const bi = DEFAULT_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <main className="abilities-page">
      <h1>Навыки и способности</h1>
      <div className="points-remaining">
        Осталось очков: <strong>{remaining}</strong>
      </div>
      <div className="abilities-grid">
        {keys.map(k => {
          const info = abilitiesData[k] || { name: k, description: '', color: '#444', icon: '' }
          const baseVal = base[k] || 0
          const addVal = adds[k] || 0
          return (
            <div className="ability-card" key={k} style={{ borderLeftColor: info.color }}>
              <div className="ability-header">
                <div className="ability-name">
                  <span className="ability-icon" style={{ color: info.color }}>{info.icon}</span>
                  <span className="ability-name-text">{info.name}</span>
                </div>
                <div className="ability-controls">
                  <span className="ability-current">{baseVal}</span>
                  {addVal > 0 && <span className="ability-add">+{addVal}</span>}
                  <button disabled={remaining <= 0} onClick={() => addPoint(k)}>+</button>
                </div>
              </div>
              {info.description && <div className="ability-desc">{info.description}</div>}
            </div>
          )
        })}
      </div>
      <div className="save-row">
        <button onClick={handleSave}>Сохранить распределение</button>
      </div>
    </main>
  )
}
