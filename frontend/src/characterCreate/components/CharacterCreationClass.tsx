import { useEffect, useState } from 'react';
import './CharacterCreationClass.css';
import type { ClassInfo, ClassData } from './modules/types';
import ClassPreview from '../../modules/ClassPreview';
import ClassPreviewSkills from '../../modules/ClassPreviewSkills';
import { CharacterFinalizer } from './modules/BottomBar.module.tsx';


const CLASS_GROUPS: Record<string, string[]> = {
  all: [],
  thugs: ['guardian', 'martoni_thug', 'volkov_thug'],
  mage: ['illusionist', 'luminomancer', 'paranormal', 'bartender'],
  crime: ['pickpocket', 'locksmith'],
  support: ['biotech_specialist', 'field_medic'],
  specialist: [ 'artificer', 'journalist', 'mirain_graduate', 'mechanic', 'custom'],
  noktarina: ['regalif', 'shadow_thrall', 'zenary']
};

const CLASS_GROUP_LABELS: Record<string, string> = {
  all: 'Все классы',
  thugs: 'Громилы',
  mage: 'Шоумены',
  crime: 'Преступники',
  ranger: 'Рейнджеры',
  support: 'Поддержка',
  specialist: 'Специалисты',
  noktarina: 'Ноктарина'
};

const HIDDEN_CLASS_TAG_REQUIREMENTS: Record<string, string[]> = {
  regalif: ['noktarina'],
  luminomancer: ['lumion'],
  paranormal: ['lumion', 'mystical'],
  zenary: ['noktarina', 'human'],
  custom: ['secret', 'custom']
};

const savedData = sessionStorage.getItem('characterResult');
let characterResult: any = null;

if (savedData) {
  try {
    characterResult = JSON.parse(savedData);
  } catch (e) {
    console.error('Failed to parse character result:', e);
    characterResult = null;
  }
}

export function groupClasses(classes: ClassInfo[]) {
  const map: Record<string, ClassInfo[]> = {};

  for (const [group, ids] of Object.entries(CLASS_GROUPS)) {
    if (group === 'all') {
      map[group] = classes;
    } else {
      map[group] = classes.filter((cls) => ids.includes(cls.id));
    }
  }

  return map;
}

function getClassAvailabilityReason(cls: ClassInfo, tags: string[] = [], isRecommended: boolean) {
  if (!cls.hidden) {
    return isRecommended ? 'доступен — рекомендован' : 'открытый класс';
  }

  const required = HIDDEN_CLASS_TAG_REQUIREMENTS[cls.id] || [];
  const found = required.filter((tag) => tags.includes(tag));
  const missing = required.filter((tag) => !tags.includes(tag));
  const requiredText = required.length ? required.join(', ') : 'специальные тэги';

  if (!required.length) {
    return 'скрытый класс — требует специальные тэги';
  }

  if (!missing.length) {
    return `скрытый класс — требует тэги: ${requiredText} (все найдены)`;
  }

  const missingIntro = missing.length === 1 ? 'нужен тэг' : 'нужны тэги';
  const foundText = found.length ? `, найдено: ${found.join(', ')}` : '';
  return `скрытый класс — ${missingIntro}: ${missing.join(', ')}${foundText}`;
}

export default function CharacterCreationClass() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [API_BASE, setAPI_BASE] = useState<string>(() => {
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).__RUNTIME__?.VITE_API_BASE) {
        // @ts-ignore
        return (window as any).__RUNTIME__.VITE_API_BASE;
      }
    } catch (e) {}
    return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
  });

  useEffect(() => {
    try {
      // @ts-ignore
      if (
        typeof window !== 'undefined' &&
        (window as any).__RUNTIME__?.VITE_API_BASE &&
        (window as any).__RUNTIME__.VITE_API_BASE !== API_BASE
      ) {
        // @ts-ignore
        setAPI_BASE((window as any).__RUNTIME__.VITE_API_BASE);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadClasses();
  }, [API_BASE]);

  const loadClasses = async () => {
    try {
      const listRes = await fetch(`${API_BASE}/classes/list`);
      const ids: string[] = await listRes.json();

      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${API_BASE}/classes/${id}`);
          return res.json();
        })
      );

      const currentTags = characterResult?.tags || [];
      const visible = results.filter((c: any) => {
        if (!c.hidden) return true;
        const req = HIDDEN_CLASS_TAG_REQUIREMENTS[c.id] || [];
        return req.length > 0 && req.every((t: string) => currentTags.includes(t));
      });

      setClasses(visible);
      setAllClasses(results);

      // Auto-switch to group that contains the first unlocked hidden class
      const firstUnlocked = results.find((c: any) => c.hidden && (HIDDEN_CLASS_TAG_REQUIREMENTS[c.id] || []).every((t: string) => currentTags.includes(t)));
      if (firstUnlocked) {
        const groupEntry = Object.entries(CLASS_GROUPS).find(([, ids]) => ids.includes(firstUnlocked.id));
        if (groupEntry) {
          const [groupName] = groupEntry;
          setActiveGroup(groupName);
        }
      }
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

    const firstGroup = Object.keys(grouped).find((g) => grouped[g].length > 0);

    if (firstGroup) setActiveGroup(firstGroup);
  }, [grouped, activeGroup]);

  const recommended = allClasses.filter((cls) =>
    characterResult?.classes?.includes(cls.id)
  );

  // Log character result and class availability on mount
  useEffect(() => {
    if (!characterResult) return;

    console.log('%c=== CHARACTER RESULT ===', 'color: #d4af37; font-weight: bold; font-size: 14px');
    console.log('%cВопросы и ответы:', 'color: #c9a84c; font-weight: bold');
    characterResult.answers?.forEach((ans: any) => {
      console.log(`  ${ans.questionId}: ${ans.text}`);
    });

    console.log('%cСпособности:', 'color: #c9a84c; font-weight: bold');
    const abilitiesEntries = Object.entries(characterResult.abilities || {});
    abilitiesEntries.forEach(([key, value]: [string, any]) => {
      const color = value > 0 ? '#7ec8a0' : value < 0 ? '#c07070' : '#888';
      console.log(`  %c${key}: ${value > 0 ? '+' : ''}${value}`, `color: ${color}`);
    });

    console.log('%cТеги персонажа:', 'color: #c9a84c; font-weight: bold');
    characterResult.tags?.forEach((tag: string) => {
      console.log(`  🏷️ ${tag}`);
    });

    console.log(`%cРекомендуемые классы: ${characterResult.classes?.join(', ') || 'нет'}`, 'color: #d4af37');

    console.log('%n%c=== ДОСТУПНОСТЬ КЛАССОВ ===', 'color: #d4af37; font-weight: bold; font-size: 14px');
    const currentTags = characterResult.tags || [];
    allClasses.forEach((cls) => {
      const isHidden = cls.hidden === true;
      const isRecommended = characterResult?.classes?.includes(cls.id);
      const required = HIDDEN_CLASS_TAG_REQUIREMENTS[cls.id] || [];
      const missing = required.filter((tag) => !currentTags.includes(tag));
      const isUnlocked = isHidden && required.length > 0 && missing.length === 0;
      const icon = isHidden && !isUnlocked ? '❌' : '✅';
      const status = isHidden && !isUnlocked ? 'не доступен' : 'доступен';
      const reason = getClassAvailabilityReason(cls, currentTags, isRecommended);
      const star = isRecommended ? ' ⭐' : '';
      console.log(`${icon} ${cls.name} — ${status} — ${reason}${star}`);
    });
  }, [allClasses, characterResult]);

  useEffect(() => {
    if (selectedClass) {
      fetch(`${API_BASE}/classes/${selectedClass}`)
        .then((r) => r.json())
        .then(setClassData);
    }
  }, [selectedClass, API_BASE]);

  if (loading)
    return (
      <div className="cc-class-page" style={{ opacity: 0.6 }}>
        <section className="cc-recommended">
          <div className="cc-skeleton cc-skeleton-rec" style={{ marginBottom: '20px' }} />
        </section>

        <div className="cc-class-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cc-skeleton cc-skeleton-tab" />
          ))}
        </div>

        <div className="cc-class-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="cc-skeleton cc-skeleton-card" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="cc-class-page">
      {recommended.length > 0 && (
        <section className="cc-recommended">
          <div className="cc-annotation">
            Наиболее подходящие классы на основе твоей истории:
            <div className="cc-recomend-list">
              {recommended.map((cls) => (
                <button
                  key={cls.id}
                  className="cc-recomend-card"
                  onClick={() => setSelectedClass(cls.id)}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="cc-class-tabs">
        {Object.entries(grouped).map(([group, list]) =>
          list.length ? (
            <button
              key={group}
              className={`cc-tab ${activeGroup === group ? 'active' : ''}`}
              onClick={() => setActiveGroup(group)}
            >
              <span>{CLASS_GROUP_LABELS[group]}</span>
            </button>
          ) : null
        )}
      </div>

      {activeGroup && (
        <div className="cc-class-list">
          {grouped[activeGroup].map((cls) => (
            <button
              key={cls.id}
              className="cc-class-card"
              onClick={() => setSelectedClass(cls.id)}
            >
              <span className="cc-class-label">{cls.name}</span>
              {recommended.some((r) => r.id === cls.id) && (
                <span className="cc-recommended-star" title="Рекомендовано">★</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedClass && classData && (
        <>
          <div className="cc-class-name">{classData.name}</div>
          <div className="cc-intro-underlayer fadeIn">
            <ClassPreview classId={selectedClass} />
          </div>
          <div className="fadeIn">
            <ClassPreviewSkills className={selectedClass} />
          </div>
        </>
      )}

      {selectedClass && classData && (
        <CharacterFinalizer
          selectedClass={classData}
          onCreate={(name, items) => {
            console.log('Данные для профиля:', { name, items });
          }}
        />
      )}

      <div style={{ height: '120px' }} />
    </div>
  );
}