import { useEffect, useMemo, useState } from "react"
import "./Gallery.css"

interface GalleryItem {
  id: string
  broken?: boolean
  path: string
  thumb: string
  tags: string[]
  ratio: string
}

interface GalleryProps {
  onSelect?: (item: GalleryItem) => void
  charId?: string // если есть, передаём, иначе ищем первого персонажа
}

type ActiveFilters = {
  race?: string
  gender?: string
  hair?: string
}

const BASE_URL =
  "https://7871309f-1cc3-4e52-b3e7-0092c8fa743f.selstorage.ru/images/"

const TAG_GROUPS: Record<keyof ActiveFilters, string[]> = {
  race: ["human", "mait", "regalif", "shadowblood", "animalic"],
  gender: ["male", "female"],
  hair: ["blonde", "brown", "black", "red", "white", "blue" ]
}

const TAG_LABELS: Record<string, string> = {
  male: "♂️",
  female: "♀️",
  human: "Человек",
  mait: "Майт",
  regalif: "Регалиф",
  shadowblood: "Луноликий",
  animalic: "Звероликий",
  blonde: "Блонд",
  brown: "Шатен",
  black: "⬛",
  red: "🟥",
  white: "⬜",
  pink: "🌸",
  blue: "🟦"
}

function normalizePath(path: string) {
  return path.replace(/^\.\//, "")
}

export function Gallery({ onSelect, charId }: GalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [filters, setFilters] = useState<ActiveFilters>({ race: "human" })
  const [loading, setLoading] = useState(true)

    // Получаем session и tgId
    function getSession() {
        try {
        return JSON.parse(localStorage.getItem('session') || '{}')
        } catch {
        return {}
        }
    }

    const session = getSession()
    const userId = session.tgId || null

    async function handleSelect() {
        if (!selected) return
          // Optimistically notify parent so UI can update immediately
          try {
            onSelect?.(selected)
          } catch (e) {
            // ignore callback errors
          }

          // If no userId, we still allow optimistic selection (local change)
          if (!userId) {
            console.warn("Нет userId — выбор применён локально")
            return
          }

          try {
            let targetCharId = charId

            // if (!targetCharId) {
            // // Получаем список персонажей
            // const res = await fetch(`/user/${userId}`)
            // const chars: Root = await res.json()
            // const firstChar = chars.find(c => c !== null)
            // if (!firstChar) {
            //     console.error("Нет персонажей для пользователя")
            //     return
            // }
            // targetCharId = String(firstChar.id)
            // }

            // POST выбранное изображение
            const pictureUrl = BASE_URL + selected.path

            // If targetCharId not provided, try to discover first character for user
            if (!targetCharId) {
              try {
                const listRes = await fetch(`/user/${userId}`)
                if (listRes.ok) {
                  const chars = await listRes.json()
                  if (Array.isArray(chars) && chars.length > 0) {
                    const firstChar = chars.find((c: any) => c && (c.id || c.charId || c._id || c._remoteId))
                    if (firstChar) targetCharId = String(firstChar.id || firstChar.charId || firstChar._id || firstChar._remoteId)
                  }
                }
              } catch (e) {
                // ignore discovery errors
              }
            }

            if (!targetCharId) {
              console.warn('Не удалось определить charId для сохранения на сервере — выбор применён локально')
              return
            }

            const postRes = await fetch(`/user/${userId}/${targetCharId}/picture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ picture: pictureUrl })
            })

            let data = null
            try { data = await postRes.json() } catch(e) { /* ignore non-json */ }
            if (!postRes.ok || (data && data.success === false)) {
              console.error("Ошибка при сохранении картинки", data || postRes.status)
            } else {
              console.log("Картинка сохранена на сервере")
            }

        } catch (e) {
            console.error("Ошибка при выборе картинки", e)
        }
    }

  useEffect(() => {
    setLoading(true)
    fetch(`${BASE_URL}images.json`)
      .then(r => r.json())
      .then((data: GalleryItem[]) => {
        setItems(
          data.map(i => ({
            ...i,
            path: normalizePath(i.path),
            thumb: normalizePath(i.thumb)
          }))
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

    useEffect(() => {
        fetch(`${BASE_URL}images.json`)
            .then(r => r.json())
            .then((data: GalleryItem[]) => {
            const uniqueItems = Object.values(
                data.reduce<Record<string, GalleryItem>>((acc, item) => {
                const normalizedItem = {
                    ...item,
                    path: normalizePath(item.path),
                    thumb: normalizePath(item.thumb),
                }
                acc[normalizedItem.id] = normalizedItem // дубли по id перезапишутся
                return acc
                }, {})
            )

            setItems(uniqueItems)
            })
        }, [])


  function selectTag(group: keyof ActiveFilters, tag: string) {
    setFilters(prev => ({
      ...prev,
      [group]: prev[group] === tag ? undefined : tag
    }))
  }

  const filtered = useMemo(() => {
    return items.filter(item =>
      Object.values(filters)
        .filter(Boolean)
        .every(tag => item.tags.includes(tag!))
    )
  }, [items, filters])

  const FALLBACK_IMAGE = BASE_URL + "placeholder_error.jpg"

  console.log('Дубликаты по ID:', filtered.map(i => i.id).filter((id, index, self) => self.indexOf(id) !== index));

  return (
    <div className="gallery-root">
      <div className="filters-top">
        {Object.entries(TAG_GROUPS).map(([group, tags]) => (
          <div key={group} className="filter-row">
            {tags.map(tag => (
              <button
                key={tag}
                className={filters[group as keyof ActiveFilters] === tag ? "gal-btn active" : "gal-btn"}
                onClick={() => selectTag(group as keyof ActiveFilters, tag)}
              >
                {TAG_LABELS[tag] ?? tag}
              </button>
            ))}
          </div>
        ))}
      </div>

      {loading && <div className="loading">Загрузка изображений...</div>}

      {!loading && filtered.length === 0 && (
        <div className="no-results">Нет изображений по выбранным фильтрам</div>
      )}

      <div className="grid">
        {filtered.map(item => (
          <div
            key={item.id}
            className="cell clickable"
            onClick={() => setSelected(item)}
          >
            <img
              key={item.thumb} // Важно: при смене thumb элемент пересоздастся с нуля
              src={BASE_URL + item.thumb}
              alt={item.id}
              loading="lazy"
              onError={e => {
                const img = e.currentTarget
                if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE
              }}
            />
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelected(null)}>
              ✕
            </button>

            <img
              key={selected.id} 
              src={BASE_URL + selected.path}
              alt={selected.id}
              onError={e => {
                const img = e.currentTarget
                if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE
              }}
            />

            <button
              className="select-btn"
              onClick={handleSelect}
            >
              Выбрать
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
