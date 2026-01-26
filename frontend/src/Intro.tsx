import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ClassPreview from './modules/ClassPreview';
import './Intro.css';
import ClassPreviewSkills from './modules/ClassPreviewSkills';
import BasicsPage from './introPage/Basics';
import ExtraPage from './introPage/Extra';

type Tab = 'base' | 'classes' | 'extra';

type Category = {
  name: string;
  classes: { name: string; id: string }[];
};

type ClassData = {
  id: string;
  name: string;
  description: string;
  abilities: any[];
};

const categories: Category[] = [
  {
    name: 'Шоумены',
    classes: [{ name: 'Бармен', id: 'bartender' }]
  },
  {
    name: 'Медики',
    classes: [
      { name: 'Биотехнолог', id: 'biotech_specialist' },
      { name: 'Чайный мастер', id: 'field_medic' }
    ]
  },
  {
    name: 'Громилы',
    classes: [
      { name: 'Мартони', id: 'martoni_thug' },
      { name: 'Волковы', id: 'volkov_thug' },
      { name: 'Бывший страж', id: 'guardian' }
    ]
  },
  {
    name: 'Журналисты',
    classes: [
      { name: 'Лживый', id: 'liar_journalist' },
      { name: 'Честный', id: 'truth_journalist' }
    ]
  },
  {
    name: 'Криминалы',
    classes: [
      { name: 'Взломщик', id: 'locksmith' },
      { name: 'Вор', id: 'pickpocket' }
    ]
  },
  {
    name: 'Инженеры',
    classes: [
      { name: 'Механик', id: 'mechanic' },
      { name: 'Ученик Академии Мирайна', id: 'mirain_graduate' }
    ]
  }
];


export default function Intro() {
  const [tab, setTab] = useState<Tab>('base');
  const nav = useNavigate();

  // Apply a body class so the background image is shown only on the /profile route
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('profile-bg');
      return () => {
        document.body.classList.remove('profile-bg');
      };
    }
    return;
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'base', label: 'Основы' },
    { id: 'classes', label: 'Классы' },
    { id: 'extra', label: 'Другое' },
  ];

  return (
    <div className="intro">
      <div
        className="intro-back"
        role="button"
        tabIndex={0}
        onClick={() => nav('/')}
        onKeyDown={(e) => e.key === 'Enter' && nav('/')}
      >
        ←
      </div>

      <div className="intro-tabs">
        <div
          className="intro-tabs-indicator"
          data-tab={tab}
        />

        {tabs.map(t => (
          <div
            key={t.id}
            role="tab"
            tabIndex={0}
            className={`intro-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => e.key === 'Enter' && setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="intro-content">
        <div className={`tab-panel ${tab}`}>
          {tab === 'base' && <Base />}
          {tab === 'classes' && <Classes />}
          {tab === 'extra' && <Extra />}
        </div>
      </div>
    </div>
  );
}


function Base() {
  return (
    <>
      <BasicsPage />
    </>
  );
}

function Classes() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';

  useEffect(() => {
    if (selectedClass) {
      fetch(`${API_BASE}/classes/${selectedClass}`)
        .then(r => r.json())
        .then(setClassData);
    }
  }, [selectedClass]);

  return (
    <>
      <div className="intro-subtabs">
        {categories.map(cat => (
          <button
            key={cat.name}
            className={selectedCategory === cat.name ? 'active' : ''}
            onClick={() => { setSelectedCategory(cat.name); setSelectedClass(cat.classes[0].id); }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div className="intro-subtabs2">
          {categories.find(c => c.name === selectedCategory)?.classes.map(cls => (
            <button
              key={cls.id}
              className={selectedClass === cls.id ? 'active' : ''}
              onClick={() => setSelectedClass(cls.id)}
            >
              {cls.name}
            </button>
          ))}
        </div>
      )}

      {selectedClass && classData && (
        <>
          <div className='intro-underlayer fadeIn'><ClassPreview classId={selectedClass} /></div>
          <div className='fadeIn'><ClassPreviewSkills className={selectedClass} /></div>
        </>
      )}
    </>
  );
}

function Extra() {
  return (
    <>
      <ExtraPage />
    </>
  );
}
