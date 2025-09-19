
import { useEffect, useState } from 'react';
import './ClassesEditor.css';

const BACKEND_URL = 'http://10.47.7.21:3001';

export default function ClassesEditor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/characters/classes`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (!data) return <div>Ошибка загрузки данных</div>;

  // Русские названия и цвета для статов
  const statMeta: Record<string, { className: string }> = {
    strength: { className: 'stats-bar-bg-strength' },
    dexterity: { className: 'stats-bar-bg-dexterity' },
    intelligence: { className: 'stats-bar-bg-intelligence' },
    charisma: { className: 'stats-bar-bg-charisma' },
    perception: { className: 'stats-bar-bg-perception' },
    willpower: { className: 'stats-bar-bg-willpower' },
    lumion: { className: 'stats-bar-bg-lumion' },
  };

  // Добавим Lumion в справочник, если его нет
  if (data && data.stats_reference && !data.stats_reference.lumion) {
    data.stats_reference.lumion = 'Лумион — основной ресурс/стат, отражающий силу, энергию и мастерство работы с паранормальным.';
  }

  function StatBar({ stat, value }: { stat: string; value: number }) {
    const meta = statMeta[stat] || { className: '' };
    // Получить русское название из справочника, иначе просто stat
    let label = stat;
    if (data && data.stats_reference && data.stats_reference[stat]) {
      // Взять только первую часть до тире или скобки
      label = data.stats_reference[stat].split(/[—(]/)[0].trim();
    } else {
      label = stat.charAt(0).toUpperCase() + stat.slice(1);
    }
    const percent = Math.max(0, Math.min(100, (value / 20) * 100));
    return (
      <div className="stats-bar-row">
        <div className={`stats-bar-container`}> 
          <div className={`stats-bar-fill ${meta.className}`} style={{ width: `${percent}%` }} />
          <div className="stats-bar-value">{label}: {value}</div>
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
            <th>Класс</th>
            <th>Подклассы</th>
            <th>Статы</th>
            <th>Инвентарь</th>
            <th>Умения</th>
          </tr>
        </thead>
        <tbody>
          {data.classes.map((cls: any) => (
            cls.subclasses.map((sub: any, idx: number) => (
              <tr key={cls.id + '-' + sub.id}>
                {idx === 0 && (
                  <td rowSpan={cls.subclasses.length} style={{ verticalAlign: 'top', minWidth: 140 }}>
                    <div><b>{cls.name}</b></div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{cls.description}</div>
                  </td>
                )}
                <td><b>{sub.name}</b><br /><span style={{ fontSize: 12, color: '#888' }}>{sub.description}</span></td>
                <td>
                  {Object.entries(sub.base_stats).map(([stat, value]) => {
                    const numValue = typeof value === 'number' ? value : Number(value);
                    return (
                      <StatBar key={stat} stat={stat} value={numValue} />
                    );
                  })}
                </td>
                <td>
                  {Array.isArray(sub.inventory) && sub.inventory.length > 0 ? (
                    <div>
                      {sub.inventory.map((variant: string[], idx: number) => (
                        <div key={idx} style={{ marginBottom: 4 }}>
                          <span style={{ color: '#888', fontSize: 12 }}>Вариант {idx + 1}:</span>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {variant.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : <span style={{ color: '#aaa' }}>—</span>}
                </td>
                <td>
                  {sub.abilities && sub.abilities.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {sub.abilities.map((a: any, i: number) => (
                        <li key={i}>{a.name}</li>
                      ))}
                    </ul>
                  ) : <span style={{ color: '#aaa' }}>—</span>}
                </td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
      <h3 style={{ marginTop: 32 }}>Пояснения к статам</h3>
      <ul>
        {Object.entries(data.stats_reference).map(([k, v]: any) => {
          // Взять только первую часть до тире или скобки
          const label = v.split(/[—(]/)[0].trim();
          return <li key={k}><b>{label}</b>: {v}</li>;
        })}
      </ul>
    </div>
  );
}
