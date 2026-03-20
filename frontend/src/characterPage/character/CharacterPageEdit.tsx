import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useCharacter from '../hooks/useCharacter'
import './CharacterPageEdit.css'
import { Gallery } from '../../modules/Gallery';

export default function CharacterPageEdit() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const { character, loading, error, save } = useCharacter(userId, charId)
  const [draft, setDraft] = useState<any>(null)
  const nav = useNavigate()
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);
  const GALLERY_BASE = 'https://7871309f-1cc3-4e52-b3e7-0092c8fa743f.selstorage.ru/images/';
  

  useEffect(() => {
    if (character && !draft) {
      setDraft({ name: character.name || '', avatar: character.picture || character.avatar || '', hp: character.hp ?? 0 })
    }
  }, [character])

  if (loading) return <div className="cp-edit-root">Загрузка...</div>
  if (error) return <div className="cp-edit-root">{error}</div>
  if (!character) return <div className="cp-edit-root">Персонаж не найден</div>

  function valid() {
    if (!draft) return false
    if (!draft.name || String(draft.name).trim().length === 0) return false
    if (Number(draft.hp) < 0) return false
    return true
  }

  async function handleSave() {
    if (!valid()) return alert('Проверьте поля')
    try {
      await save({ name: draft.name, picture: draft.avatar, avatar: draft.avatar, hp: draft.hp })
      nav(-1)
    } catch (e: any) {
      alert('Ошибка сохранения: ' + (e?.message || ''))
    }
  }

  async function handleGallerySelect(item: any) {
    if (!item) return;
    const pictureUrl = (typeof item.path === 'string' && item.path.startsWith('http')) ? item.path : (GALLERY_BASE + (item.path || item.file || ''));
    draft?.avatar && setDraft({ ...draft, avatar: pictureUrl });
    setGalleryOpen(false);
  }

  return (
    <main className="cp-edit-root">
      <h1 className="cp-edit-title">Редактирование персонажа</h1>
      <div className="cp-edit-body">
        <div className="cp-edit-left">
          <div className="cp-avatar-preview">
            <img src={draft?.avatar || '/profile_pictures/profile_picture_00.jpg'} alt={draft?.name || 'avatar'} />
          </div>
          <label className="cp-field">
            <div className="name-row">
              <button className="simple-btn" onClick={() => setGalleryOpen(true)}>Изменить изображение</button>
            </div>
          </label>
        </div>
        <div className="cp-edit-right">
          <label className="cp-field">
            Имя Персонажа
            <input value={draft?.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </label>

          <label className="cp-field">
            HP (Не меняй просто так, Мастер узнает) 
            <input type="number" value={draft?.hp || 0} onChange={e => setDraft({ ...draft, hp: Number(e.target.value) })} />
          </label>

          <div className="cp-edit-actions">
            <button className="cp-save" onClick={handleSave} disabled={!valid()}>Сохранить</button>
            <button className="cp-cancel" onClick={() => nav(-1)}>Отмена</button>
          </div>
        </div>
      </div>
      {galleryOpen && (
        <div className="ability-modal" onClick={() => setGalleryOpen(false)}>
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 720, maxWidth: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>Выберите изображение</strong>
              <button className="ability-modal-close" onClick={() => setGalleryOpen(false)}>×</button>
            </div>
            <Gallery onSelect={handleGallerySelect} charId={charId || undefined} />
          </div>
        </div>
      )}
    </main>
  )
}
