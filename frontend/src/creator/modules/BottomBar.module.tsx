import React, { useState  } from 'react';
import styles from './BottomBar.module.css';
import type { ClassData, Character, CharacterProfile } from '../types';

// 1. Вспомогательная функция для получения конфига (вне компонента)
const getApiBase = () => {
    try {
        if (typeof window !== 'undefined' && (window as any).__RUNTIME__?.VITE_API_BASE) {
            return (window as any).__RUNTIME__.VITE_API_BASE;
        }
    } catch (e) {}
    // @ts-ignore
    return import.meta.env?.VITE_API_BASE || 'http://localhost:3111';
};

// 2. Чистая функция билда (БЕЗ хуков внутри)
export async function buildFinalProfile(
    name: string, 
    className: string, 
    result: Character,
    startInventory: string[] = []
): Promise<CharacterProfile> {
    const API_BASE = getApiBase();

    const response = await fetch(`${API_BASE}/classes/${className}`);
    if (!response.ok) throw new Error('Failed to fetch class data');
    const classData = await response.json();

    const finalAbilities = { ...result.abilities };
    const ClassAbilities: Record<string, number> = {};
    const StoryAbilities: Record<string, number> = {};

    // Прибавляем бонусы из массива способностей класса
    if (classData.abilities && Array.isArray(classData.abilities)) {
        classData.abilities.forEach((bonusObj: Record<string, number>) => {
            for (const [abilityName, value] of Object.entries(bonusObj)) {
                ClassAbilities[abilityName] = value;
                StoryAbilities[abilityName] = finalAbilities[abilityName];
                finalAbilities[abilityName] = (finalAbilities[abilityName] || 0) + value;
            }
        });
    }


    // 3. Вычисляем HP на основе параметров (пример логики)
    // Допустим: база 20 + (Сила Воли или Телосложение из abilities)
    const constitution = finalAbilities['Constitution'] || 0;
    const calculatedHp = classData.hp + constitution;
    // const dexterity = Math.floor(finalAbilities['Dexterity']/10) || 0;
    // const calculatedDefense = classData.defense + dexterity;
    
    // 4. Формируем историю
    // Склеиваем в формат "Вопрос: Ответ. Вопрос: Ответ."
    const generatedHistory = (result.answers || []) // Защита: если answers undefined, берем пустой массив
      .map(ans => `${ans.questionId}: ${ans.text}`)
      .join('. ');

    // 5. Собираем финальный объект
    return {
        id: Date.now(),
        name: name.trim() || "Безымянный герой",
        class: className,
        level: 1,
        status: "alive",
        
        hp: calculatedHp,
        hpMax: calculatedHp,
        armor: classData.armor || classData.defense, 
        
        abilityPoints: 10,
        skillpoints: 3,
        
        // Копируем все способности из результата генерации
        abilities: { ...finalAbilities },
        
        // Начальный инвентарь зависит от класса (пример вычисления)
        inventory: startInventory.length > 0 ? startInventory : [],
        
        history: generatedHistory,
        story: "", // Поле для заполнения самим игроком позже
        picture: "profile_picture.webp", 
        createdAt: new Date().toISOString() // 2026-01-22T...
    };
}

// 3. Компонент
interface Props {
  selectedClass: ClassData | null;
  onCreate: (name: string, items: string[]) => void;
}

export const CharacterFinalizer: React.FC<Props> = ({ selectedClass }) => {
  const [name, setName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Добавляем состояние для превью билда
  const [preview, setPreview] = useState<CharacterProfile | null>(null);
  const [isCalculating, setIsCalculating] = useState(false); // Состояние загрузки

  if (!selectedClass) return null;

  // Функция для расчета перед показом модалки
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setIsCalculating(true); // Включаем "загрузку"
    
    try {
      // Исправляем получение: гарантируем наличие объекта с массивом answers
      const rawData = sessionStorage.getItem('characterResult');
      const characterResult: Character = rawData 
        ? JSON.parse(rawData) 
        : { answers: [], abilities: {}, tags: [], classes: [], lucoins: 0 }; // Дефолт 2026

      const build = await buildFinalProfile(name, selectedClass.id, characterResult, selectedItems);
      setPreview(build);
      console.log("Предпросмотр билда:", JSON.stringify(build));
    } catch (error) {
      console.error("Ошибка при расчете билда:", error);
    } finally {
      setIsCalculating(false); // Выключаем "загрузку"
    }
  };

  const handleCreateAndSave = async () => {
  try {
    // 1. Получаем ID пользователя (например, из Telegram WebApp или стейта)
    // const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'default_user';
    const sessionRaw = localStorage.getItem('session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const tgId = session?.tgId; 
    
    const API_BASE = getApiBase();

    // 2. Получаем данные теста из сессии
    const characterResult = JSON.parse(sessionStorage.getItem('characterResult') || '{}');

    // 3. Генерируем финальный билд (используем ту же функцию, что и для превью)
    // Убедитесь, что selectedClassId — это текущий выбранный ID
    const finalProfile = await buildFinalProfile(name, selectedClass.id, characterResult, selectedItems);

    // 4. Отправляем на сервер
    const response = await fetch(`${API_BASE}/characters/user/${tgId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalProfile),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Персонаж успешно сохранен с ID:', result.id);
      // 5. Перенаправляем пользователя в игру или в профиль
      window.location.href = `/profile?charId=${result.id}`;
    } else {
      alert('Ошибка при сохранении: ' + result.error);
    }

  } catch (error) {
    console.error('Ошибка в процессе создания:', error);
    alert('Не удалось создать персонажа. Проверьте соединение с сервером.');
  }
};

  const toggleItem = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(prev => prev.filter(i => i !== item));
    } else if (selectedItems.length < 2) {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const canPrepare = name.trim().length > 2 && name.trim().length < 29;

  return (
    <>
      <div className={styles.bottomBar}>
        <div className={styles.row}>
          <div className={styles.inventorySelect}>
            <div className={styles.icon}>🎒</div>{selectedClass.inventory?.map(item => (
              <span 
                key={item}
                className={`${styles.itemBadge} ${selectedItems.includes(item) ? styles.itemSelected : ''}`}
                onClick={() => toggleItem(item)}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.icon}>{(name.trim().length > 2) ? '👍' : '🤙'}</div>
          <input 
            className={styles.inputName}
            placeholder="Введите имя (и фамилию)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button 
            className={styles.createBtn}
            disabled={!canPrepare}
            onClick={handleOpenModal}
          >
            Создать
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Итоговые характеристики</h3>
            
            {isCalculating ? (
              <div className={styles.loading}>Рассчитываем параметры...</div>
            ) : preview ? (
              <>
                <p><b>Имя:</b> {preview.name}</p>
                <p><b>HP:</b> {preview.hp} | <b>Armor:</b> {preview.armor}</p>
                
                <p><b>Способности:</b></p>
                <div className={styles.statsGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {Object.entries(preview.abilities || {}).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '14px' }}>
                      <span style={{ opacity: 0.7 }}>{k}:</span> <b>{v}</b>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: 'red' }}>Ошибка загрузки данных</p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Назад</button>
              <button 
                // onClick={() => onCreate(name, selectedItems)}
                onClick={handleCreateAndSave}
                style={{ flex: 1, background: 'green', color: 'white', border: 'none', borderRadius: '5px' }}
                disabled={isCalculating}
              >
                Начать игру
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
