
import { useEffect, useState } from 'react';
import './CharacterCreationClass.css';
import type { Character, ClassInfo, ClassData } from './types';
import { CLASS_GROUPS, CLASS_GROUP_LABELS } from './classGroups';
import ClassPreview from '../modules/ClassPreview';
import ClassPreviewSkills from '../modules/ClassPreviewSkills';
import { CharacterFinalizer } from './modules/BottomBar.module';


const savedData = sessionStorage.getItem('characterResult');
let characterResult: Character;

const EXAMPLE_RESULT: Character = {
    "answers": [
        { "questionId": "gender", "optionId": "male", "text": "Мужской" },
        { "questionId": "race", "optionId": "human", "text": "Человек" },
        { "questionId": "birth_city", "optionId": "mustalma", "text": "Мустальма" },
        { "questionId": "social_environment", "optionId": "wealthy", "text": "Обеспеченной" },
        { "questionId": "family", "optionId": "supportive", "text": "Поддерживающей" },
        { "questionId": "childhood_focus", "optionId": "danger", "text": "Опасности" },
        { "questionId": "turning_point", "optionId": "loss", "text": "Утрата" },
        { "questionId": "hidden_skill", "optionId": "lockpicking", "text": "Взлом" },
        { "questionId": "motivation", "optionId": "power", "text": "Власть" },
        { "questionId": "weakness", "optionId": "fear", "text": "Страх" }
    ],
    "abilities": {
        "Stealth": -90, "Charisma": -90, "Willpower": -90, "Perception": 8, "Lockpicking": 10
    },
    "tags": ["civilized", "port", "dark", "privileged", "loss", "ambition"],
    "classes": ["regalif"],
    "lucoins": 0
};

if (savedData) {
    // Если данные есть — парсим их
    characterResult = JSON.parse(savedData);
} else {
    // Если результата нет — выводим варнинг и берем дефолтный объект
    console.warn('No character creation characterResult found in session storage.');
    console.warn('DEV: Using example characterResult.');
    
    // Ваш example_characterResult (дефолтные значения)
    characterResult = EXAMPLE_RESULT;
    sessionStorage.setItem('characterResult', JSON.stringify(EXAMPLE_RESULT));
}

export function groupClasses(classes: ClassInfo[]) {
  const map: Record<string, ClassInfo[]> = {};

  for (const [group, ids] of Object.entries(CLASS_GROUPS)) {
    map[group] = classes.filter(
      cls => !cls.hidden && ids.includes(cls.id)
    );
  }

  return map;
}

export default function CharacterCreationClass() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [API_BASE, setAPI_BASE] = useState<string>(() => {

    try{
        // @ts-ignore
        if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
            // @ts-ignore
            return (window as any).__RUNTIME__.VITE_API_BASE;
            }
        }catch(e){}
    return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
    });

  useEffect(() => {
    // attempt to refresh runtime config if config.js was mounted after bundle
    try{
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE && (window as any).__RUNTIME__.VITE_API_BASE !== API_BASE) {
        // @ts-ignore
        setAPI_BASE((window as any).__RUNTIME__.VITE_API_BASE);
      }
    }catch(e){}
  }, []);

  useEffect(() => {
    loadClasses();
  }, []);

  

  const loadClasses = async () => {
    try {
      const listRes = await fetch(`${API_BASE}/classes/list`);
      const ids: string[] = await listRes.json();

      const results = await Promise.all(
        ids.map(async id => {
          const res = await fetch(`${API_BASE}/classes/${id}`);
          return res.json();
        })
      );

      setClasses(results.filter(c => !c.hidden));
      setAllClasses(results);
    } catch (e) {
      console.error('Classes load error', e);
    } finally {
      setLoading(false);
    }
  };
 
  const grouped = groupClasses(classes);

  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  useEffect(() => {
  if (activeGroup !== null) return;

  const firstGroup = Object.keys(grouped).find(
    g => grouped[g].length > 0
  );

  if (firstGroup) setActiveGroup(firstGroup);
    }, [grouped, activeGroup]);


    const recommended = allClasses.filter(cls =>
        characterResult?.classes?.includes(cls.id)
    );

    useEffect(() => {
        if (selectedClass) {
        fetch(`${API_BASE}/classes/${selectedClass}`)
            .then(r => r.json())
            .then(setClassData);
        }
    }, [selectedClass]);

    if (loading) return (
        <div className="classes-page" style={{ opacity: 0.6 }}>
            {/* Скелетон рекомендаций */}
            <section className="recommended">
            <div className="skeleton skeleton-rec" style={{ marginBottom: '20px' }} />
            </section>

            {/* Скелетон табов */}
            <div className="class-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-tab" />)}
            </div>

            {/* Скелетон списка классов */}
            <div className="class-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton skeleton-card" />)}
            </div>
        </div>
        );

    return (
    <div className="classes-page">

        {recommended.length > 0 && (
          <section className="recommended">
            <div className="annotation">
              💡 Наиболее подходящие классы на основе твоей истории:
            <div className="recomend-list">
              {recommended.map(cls => (
                <button key={cls.id} className="recomend-card" onClick={() => setSelectedClass(cls.id)}>
                  {cls.name}
                </button>
              ))}
            </div>
            </div>
          </section>
        )}

        <div className="class-tabs">
          {Object.entries(grouped).map(([group, list]) =>
            list.length ? (
              <button
                key={group}
                className={`tab ${activeGroup === group ? 'active' : ''}`}
                onClick={() => setActiveGroup(group)}
              >
                <span>{CLASS_GROUP_LABELS[group]}</span>
              </button>
            ) : null
          )}
        </div>
        
        {activeGroup && (
          <div className="class-list">
            {grouped[activeGroup].map(cls => (
              <button key={cls.id} className="class-card" onClick={() => setSelectedClass(cls.id)}>
                <span>{cls.name}</span>
              </button>
            ))}
          </div>
        )}
        
        {selectedClass && classData && (
                <>
                <div className='class-name'>
                    {classData.name} 
                </div>
                <div className='intro-underlayer fadeIn'><ClassPreview classId={selectedClass} /></div>
                <div className='fadeIn'><ClassPreviewSkills className={selectedClass} /></div>
                </>
            )}
        {selectedClass && classData && (
            <CharacterFinalizer 
                selectedClass={classData}
                onCreate={(name, items) => {
                // Здесь вызываешь свою функцию buildFinalProfile, которую мы писали ранее
                    console.log("Данные для профиля:", { name, items });
                }} 
            />
        )}
    <div style={{ height: '120px' }}></div>
    </div>
    );
}
