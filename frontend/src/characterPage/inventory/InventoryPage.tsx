// Inventory now uses shared useCharacter hook
import { useState } from 'react'
import InventoryItem from './components/InventoryItem'
import './InventoryPage.css'
import useCharacter from '../hooks/useCharacter'
import { useParams } from 'react-router-dom'

export default function InventoryPage() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const { character, loading, error, save, setCharacter } = useCharacter(userId, charId)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>{error}</div>
  if (!character) return <div>Персонаж не найден</div>

  const inventory = (character as any).inventory || []

  async function handleAdd() {
    if (!newName) return
    const item = { id: Date.now().toString(), name: newName, qty: Number(newQty) || 1 }
    const prev = inventory
    const next = [...inventory, item]

    // optimistic UI
    setCharacter((c: any) => ({ ...(c || {}), inventory: next }))
    try {
      await save({ inventory: next })
      setNewName('')
      setNewQty(1)
    } catch (e) {
      // revert on error
      setCharacter((c: any) => ({ ...(c || {}), inventory: prev }))
      alert('Ошибка сохранения инвентаря')
    }
  }

  async function handleDelete(index: number) {
    if (!window.confirm('Вы уверены, что хотите удалить этот предмет?')) return

    const prev = inventory
    const next = inventory.filter((_: any, i: number) => i !== index)
    setCharacter((c: any) => ({ ...(c || {}), inventory: next }))
    try {
      await save({ inventory: next })
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
          return (
            <li key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: 6 }}>
              <InventoryItem name={name} qty={qty} />
              <button onClick={() => handleDelete(idx)}>Удалить</button>
            </li>
          )
        })}
      </ul>

      <div className="add-item">
        <input placeholder="Название" value={newName} onChange={e => setNewName(e.target.value)} />
        <input className="input-number" type="number" value={newQty} onChange={e => setNewQty(Number(e.target.value))} style={{ width: 80, marginLeft: 8 }} />
        <button onClick={handleAdd} style={{ marginLeft: 8 }}>+</button>
      </div>
    </main>
  )
}
