import { useEffect, useState } from 'react';
import './ClassesEditor.css';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';

export default function ClassesEditor() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTypes, setActionTypes] = useState<any[]>([]);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);


const [abilities, setAbilities] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch(`${API_BASE}/characters/classes`);
        const json = await res.json();
         // Подгружаем каждый класс отдельно
        const details = await Promise.all(
          json.map(async (name: string) => {
            const res = await fetch(`${API_BASE}/characters/class/${name}`);
            return await res.json();
          })
        );
        setClasses(details);
      
      } catch (e) {
        console.error('Error fetching classes:', e);
      } finally {
        setLoading(false);
      }
      fetch(`${API_BASE}/characters/abilities`)
      .then(res => res.json())
      .then(setAbilities)
      .catch(console.error);
      // Fetch action types
      fetch(`${API_BASE}/characters/action_types`)
      .then(res => res.json())
      .then(setActionTypes);
    }
    fetchClasses();
  }, []);

  if (loading) return <div>💫Загрузка...</div>;
  if (!classes.length) return <div>Ошибка загрузки данных</div>;

function showTooltip(e: React.MouseEvent, text: string) {
  const target = e.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  setTooltip({ text, x: rect.left - 100, y: rect.top + 100 });
}
  
function StatBar({ stat, value, abilities }: { stat: string; value: number; abilities: Record<string, any> }) {
  const info = abilities[stat] || { color: '#aaa', icon: '', name: stat };
  const percent = Math.max(0, Math.min(100, (value + 50) * 1)); // +50 чтобы отрицательные лучше видно
  return (
    <div className="stats-bar-row">
      <div className="stats-bar-container">
        <div className="stats-bar-fill" style={{ width: `${percent}%`, backgroundColor: info.color }} />
        <div className="stats-bar-value">
          {info.icon} {info.name}: {value > 0 ? '+' : ''}{value}
        </div>
      </div>
    </div>
  );
}


  return (
    <div style={{ padding: 24 }}>
      <h2>Классы персонажей</h2>
      <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Название</th>
            <th>Описание</th>
            <th>Статы</th>
            <th>Инвентарь</th>
            <th>Умения</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={cls.id}>
              <td>{cls.icon && <img src={`/templates/classes/${cls.icon}`} alt={cls.name} style={{ width: 32, height: 32 }} />}{cls.name}</td>
              <td>{cls.description}</td>
              <td>
                {cls.abilities.map((a: Record<string, number>, idx: number) => {
                  const statKey = Object.keys(a)[0];
                  const value = a[statKey];
                  return <StatBar key={idx} stat={statKey} value={value} abilities={abilities} />;
                })}
              </td>
              <td>
                {cls.inventory && cls.inventory.length > 0 ? (
                  cls.inventory.map((variant: string[], idx: number) => (
                    <div key={idx}>
                      <b>Вариант {idx + 1}:</b>
                      <ul>
                        {variant.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  ))
                ) : <span style={{ color: '#aaa' }}>—</span>}
              </td>
              <td>
                {cls.skills && cls.skills.length > 0 && actionTypes.map((meta) => {
                  const key = meta.type === 'active' ? 'actions' :
                              meta.type === 'short_rest' ? 'ShortRest' :
                              meta.type === 'long_rest' ? 'LongRest' :
                              'Passive';
                  const skillList = cls.skills[0][key];
                  if (!skillList || !Array.isArray(skillList) || skillList.length === 0) return null;

                  return (
                    <div key={meta.type} style={{ marginBottom: 8 }}>
                      <div
                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                        onMouseEnter={(e) => showTooltip(e, meta.description)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {meta.icon} {meta.name}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {skillList.map((skill: any, idx2: number) => (
                          <li key={idx2}>
                            ({skill.level}) - <b>{skill.name}</b> -- {skill.effect}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: '#332c199c',
            border: '1px solid #ccc',
            padding: 6,
            borderRadius: 4,
            zIndex: 1000,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}