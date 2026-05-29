# 🖼️ Система загрузки картинок для персонажей

## Архитектура

### 1. **Картинки рас** (Race Images)
- **Локальное хранилище:** `/frontend/public/media/images/races/{race_id}/`
- **JSON описание:** `/frontend/public/media/images/races/{race_id}/images.json`
- **Структура JSON:** Массив имен файлов (relative paths)
```json
["human_1.webp", "human_2.webp", "human_3.webp", "human_4.webp", "human_5.webp"]
```

- **Backend ссылка:** В `character_story.json` каждая раса указывает:
```json
"images": "media/images/races/human/images.json"
```

- **Frontend обработка:** Компонент `Option.tsx`:
  1. Загружает JSON файл
  2. Извлекает базовую директорию из пути
  3. Преобразует относительные пути в полные: `media/images/races/human/human_1.webp`
  4. Передает в компонент `ImageCarousel`

### 2. **Картинки городов** (City Images)
- **S3 хранилище:** `s3://lumotarina-public/images/media/cities/{city_id}/`
- **JSON описание:** `s3://lumotarina-public/images/media/cities/cities_list.json`
- **Структура городов:**
```json
{
  "id": "belyy-kron",
  "name": "Белый Крон",
  "images": [
    "/images/media/cities/belyy-kron/1.png",
    "/images/media/cities/belyy-kron/2.png"
  ]
}
```

- **Frontend обработка:** Компонент `CitySelector.tsx`:
  1. Получает уже готовые полные пути из `cities_list.json`
  2. Отображает картинки через внутренний carousel

## Компоненты

### ImageCarousel.tsx
Универсальный компонент для отображения слайдера:
- Авторотация (5 сек)
- Навигация по точкам (dots)
- Responsive дизайн

### Option.tsx (для рас, перков, и т.д.)
- Загружает JSON файлы по относительным путям
- Преобразует в абсолютные пути
- Поддерживает как массивы, так и ссылки на JSON

### CitySelector.tsx (для городов)
- Использует готовые пути из cities_list.json
- Встроенный carousel с навигацией

### WorldSelector.tsx (для миров)
- То же что и Option.tsx, но специальный стиль для миров

## Поток данных

```
Backend (character_story.json)
  ↓
Frontend (CharacterCreation.tsx)
  ↓ загружает вопросы
Questions → options with `media.images` (путь или URL)
  ↓
Option/WorldSelector/CitySelector компоненты
  ↓
JSON загрузка (если нужна)
  ↓
ImageCarousel → Отображение
```

## Типы картинок

1. **Race images** (локальные JSON файлы):
   - Относительные пути в JSON: `human_1.webp`
   - Преобразуются в: `media/images/races/human/human_1.webp`

2. **City images** (S3, полные пути):
   - Уже готовы в JSON: `/images/media/cities/belyy-kron/1.png`
   - Используются как есть

3. **World images** (если добавить):
   - Те же правила что и race images
