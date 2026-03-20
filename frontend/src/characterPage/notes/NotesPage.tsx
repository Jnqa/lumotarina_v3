// removed unused React import (using automatic JSX runtime)
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { showToast } from '../../utils/toast'
import './NotesPage.css'

export default function NotesPage() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const nav = useNavigate()
  const [noteText, setNoteText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111'

  useEffect(() => {
    if (!userId || !charId) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(charId)}/note`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setNoteText(data.note || '')
      })
      .catch((err) => {
        console.error('[NotesPage] load note error', err)
        showToast('Не удалось загрузить заметку', { type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [userId, charId, API_BASE])

  async function saveNote() {
    if (!userId || !charId) {
      showToast('Не указан пользователь или персонаж', { type: 'error' })
      return
    }
    setSaving(true)
    try {
      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(charId)}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText || '' }),
      })
      if (resp.ok) {
        showToast('Заметка сохранена', { type: 'success' })
      } else {
        const text = await resp.text()
        showToast('Ошибка при сохранении заметки: ' + (text || resp.status), { type: 'error' })
      }
    } catch (e) {
      console.error('[NotesPage] save note error', e)
      showToast('Ошибка соединения при сохранении заметки', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="notes-page">
      <div className="notes-header">
        <h1>Заметки</h1>
        <button className="btn-back" onClick={() => nav(-1)}>x</button>
      </div>

      {loading ? (
        <div className="notes-loading">Загрузка летописи...</div>
      ) : (
        <div className="notes-container">
          <textarea
            className="notes-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Запишите свои подвиги здесь..."
          />
          <button 
            className="btn-save" 
            onClick={saveNote} 
            disabled={saving}
          >
            {saving ? 'Перо пишет...' : 'Запечатать запись'}
          </button>
        </div>
      )}
    </main>
  )
}
