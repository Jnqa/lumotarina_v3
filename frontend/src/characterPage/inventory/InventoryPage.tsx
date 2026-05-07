// Inventory now uses shared useCharacter hook
import { useState } from 'react'
import InventoryItem from './components/InventoryItem'
import Modal from '../shared/Modal'
import './InventoryPage.css'
import useCharacter from '../hooks/useCharacter'
import { useParams } from 'react-router-dom'

type InventoryItemType = {
  id: string
  name: string
  qty: number
  description?: string
}

export default function InventoryPage() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const { character, loading, error, save, setCharacter } = useCharacter(userId, charId)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newDesc, setNewDesc] = useState('')
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<{ index: number; item: InventoryItemType } | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState(1)
  const [editDesc, setEditDesc] = useState('')

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>{error}</div>
  if (!character) return <div>Персонаж не найден</div>

  const inventory: InventoryItemType[] = (character as any).inventory || []

  async function handleAdd() {
    if (!newName) return
    const item: InventoryItemType = { id: Date.now().toString(), name: newName, qty: Number(newQty) || 1, description: newDesc || '' }
    const prev = inventory
    const next = [...inventory, item]

    // optimistic UI
    setCharacter((c: any) => ({ ...(c || {}), inventory: next }))
    try {
      await save({ inventory: next })
      setNewName('')
      setNewQty(1)
      setNewDesc('')
    } catch (e) {
      // revert on error
      setCharacter((c: any) => ({ ...(c || {}), inventory: prev }))
      alert('Ошибка сохранения инвентаря')
    }
  }

  function openEditModal(index: number, item: InventoryItemType) {
    setEditingItem({ index, item })
    setEditName(item.name)
    setEditQty(item.qty)
    setEditDesc(item.description || '')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
    setEditName('')
    setEditQty(1)
    setEditDesc('')
  }

  async function handleSaveEdit() {
    if (!editingItem || !editName) return

    const prev = inventory
    const next = inventory.map((it, i) => 
      i === editingItem.index 
        ? { ...it, name: editName, qty: Number(editQty) || 1, description: editDesc || '' }
        : it
    )

    setCharacter((c: any) => ({ ...(c || {}), inventory: next }))
    try {
      await save({ inventory: next })
      closeModal()
    } catch (e) {
      setCharacter((c: any) => ({ ...(c || {}), inventory: prev }))
      alert('Ошибка сохранения')
    }
  }

  async function handleDeleteFromModal() {
    if (!editingItem) return
    if (!window.confirm('Вы уверены, что хотите удалить этот предмет?')) return

    const prev = inventory
    const next = inventory.filter((_: any, i: number) => i !== editingItem.index)
    setCharacter((c: any) => ({ ...(c || {}), inventory: next }))
    try {
      await save({ inventory: next })
      closeModal()
    } catch (e) {
      setCharacter((c: any) => ({ ...(c || {}), inventory: prev }))
      alert('Ошибка удаления')
    }
  }

  return (
    <main className="inventory-page">
      <h1>Инвентарь</h1>

      <ul>
        {inventory.map((it: any, idx: number) => {
          const isObj = it && typeof it === 'object'
          const key = isObj ? (it.id || `item-${idx}`) : `legacy-${idx}`
          const name = isObj ? (it.name || String(it)) : String(it)
          const qty = isObj ? (it.qty ?? 1) : 1
          const description = isObj ? (it.description || '') : ''
          return (
            <li key={key} onClick={() => openEditModal(idx, { id: key, name, qty, description })}>
              <InventoryItem name={name} qty={qty} />
            </li>
          )
        })}
      </ul>

      <div className="add-item">
        <input placeholder="Название" value={newName} onChange={e => setNewName(e.target.value)} />
        <input className="input-number" type="number" value={newQty} onChange={e => setNewQty(Number(e.target.value))} style={{ width: 80, marginLeft: 8 }} />
        <button onClick={handleAdd} style={{ marginLeft: 8 }}>+</button>
        <textarea 
          className="add-item-desc"
          placeholder="Описание (необязательно)"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          rows={2}
        />
      </div>

      <Modal open={modalOpen} onClose={closeModal}>
        <div className="item-edit-modal">
          <h2>Редактирование предмета</h2>
          <div className="modal-field">
            <label>Название</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="modal-field modal-field-qty">
            <label>Количество</label>
            <input 
              type="number" 
              value={editQty} 
              onChange={e => setEditQty(Number(e.target.value))}
              className="input-number"
            />
          </div>
          <div className="modal-field">
            <label>Описание</label>
            <textarea 
              value={editDesc} 
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Описание предмета..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-delete" onClick={handleDeleteFromModal}>Удалить</button>
            <button className="btn-save" onClick={handleSaveEdit}>Сохранить</button>
          </div>
        </div>
      </Modal>
    </main>
  )
}
