import { useEffect, useState, useCallback } from 'react'

type StatType = { name: string; value: number }
export type QuestStatus = 'active' | 'completed' | 'frozen' | 'forgotten' | 'available'
type QuestType = { id: string; type: 'team' | 'private'; title: string; description: string; status: QuestStatus | boolean }
export type CharacterType = {
  id?: string
  name: string
  avatar?: string
  hp?: number
  armor?: number
  lum?: number
  stats?: StatType[]
  classInfo?: string
  backstory?: string
  inventory?: Array<{ id: string; name: string; qty?: number }>
  abilities?: Record<string, number>
  abilityPoints?: number
  class?: string
  picture?: string
  level?: number
  note?: string
  hpMax?: number
  story?: string
  skillpoints?: number
  totalMaxHP?: number
  quests?: QuestType[]
}

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

export default function useCharacter(userId?: string, charId?: string) {
  const [character, setCharacter] = useState<CharacterType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE = getApiBase()

  const fetchCharacter = useCallback(async () => {
    if (!userId || !charId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/characters/user/${userId}/${charId}`)
      if (!res.ok) throw new Error('network')
      const data = await res.json()
      setCharacter(data)
    } catch (e) {
      setError('Не удалось загрузить персонажа')
    } finally {
      setLoading(false)
    }
  }, [userId, charId, API_BASE])

  useEffect(() => { fetchCharacter() }, [fetchCharacter])

  const save = useCallback(async (patch: Partial<CharacterType>) => {
    if (!userId || !charId) throw new Error('missing ids')
    const res = await fetch(`${API_BASE}/characters/user/${userId}/${charId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || 'save failed')
    }
    const data = await res.json()
    // Ensure the UI stays in sync even if the server response doesn't include the full character payload
    setCharacter(prev => ({ ...(prev || {}), ...data, ...patch }))
    return data
  }, [userId, charId, API_BASE])

  return { character, loading, error, refresh: fetchCharacter, save, setCharacter }
}
