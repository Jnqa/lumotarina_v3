import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CharacterCreatingClass.css';

function mergeAbilitiesObjects(arrOrObj: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!arrOrObj) return out;
  const arr = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
  arr.forEach((o: any) => {
    if (typeof o === 'object') {
      Object.entries(o).forEach(([k, v]) => {
        out[k] = (out[k] || 0) + Number(v || 0);
      });
    }
  });
  return out;
}

const ABILITY_LABELS: Record<string, string> = {
  Strength: 'Сила',
  Dexterity: 'Ловкость',
  Constitution: 'Телосложение',
  Intelligence: 'Интеллект',
  Wisdom: 'Мудрость',
  Charisma: 'Харизма',
  Perception: 'Восприятие',
  Willpower: 'Сила воли',
  Engineering: 'Инженерия',
  Medicine: 'Медицина',
  Lockpicking: 'Взлом',
  Stealth: 'Скрытность',
  Lumion: 'Люмион',
  Survival: 'Выживание',
  Crafting: 'Ремёсла',
};

export default function CharacterCreatingClass() {
  const loc = useLocation();
  const nav = useNavigate();
  const state: any = (loc.state as any) || null;

  // Try location.state first, then fall back to localStorage draft
  const savedPreview = (() => {
    try {
      const s = localStorage.getItem('char_preview');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  })();

  const initialPreview = state || savedPreview || { answers: {}, abilities: {}, cityLevel: null, foundClasses: [] };

  // Persist preview if we arrived with state
  useEffect(() => {
    if (state) {
      try { localStorage.setItem('char_preview', JSON.stringify(state)); } catch (e) { }
    }
  }, [state]);

  const [preview, _setPreview] = useState<any>(initialPreview);
  const [allClasses, setAllClasses] = useState<any[] | null>(null);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  // Try to load previously selected inventory for draft
  const loadSelectedInventory = () => {
    try {
      const s = localStorage.getItem('char_selected_inventory');
      return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
  };
  const [selectedInventory, setSelectedInventory] = useState<Record<string, string[]>>(loadSelectedInventory);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r = await fetch('/templates/classes.json');
        if (!r.ok) {
          setAllClasses([]);
          setLoading(false);
          return;
        }
        const j = await r.json();
        // handle multiple shapes
        if (Array.isArray(j)) {
          // manifest is an array of filenames
          const files: string[] = j as string[];
          const results: any[] = [];
          for (const f of files) {
            try {
              const rr = await fetch(`/templates/classes/${f}`);
              if (!rr.ok) continue;
              const cj = await rr.json();
              results.push(cj);
            } catch (e) {
              // ignore
            }
          }
          setAllClasses(results);
        } else if (Array.isArray((j as any).classes)) {
          // manifest has shape { classes: ["file1.json", ...] }
          const files: string[] = (j as any).classes as string[];
          const results: any[] = [];
          for (const f of files) {
            try {
              const rr = await fetch(`/templates/classes/${f}`);
              if (!rr.ok) continue;
              const cj = await rr.json();
              results.push(cj);
            } catch (e) {
              // ignore individual file errors
            }
          }
          setAllClasses(results);
        } else {
          // single class object
          setAllClasses([j]);
        }
      } catch (e: any) {
        setError(String(e?.message || e));
        setAllClasses([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // If classes load and no active selected, pick the first visible class
  useEffect(() => {
    if (!activeClassId && allClasses) {
      const subsLocal = flattenSubs(allClasses);
      const first = subsLocal.find(visible);
      if (first) {
        const idKey = first.id || first.class || first.name || String(Math.random());
        setActiveClassId(idKey);
      }
    }
  }, [allClasses]);

  // persist selectedInventory whenever it changes
  useEffect(() => {
    try { localStorage.setItem('char_selected_inventory', JSON.stringify(selectedInventory)); } catch (e) { }
  }, [selectedInventory]);

  function flattenSubs(list: any[]) {
    return list.flatMap((c: any) => (Array.isArray(c.subclasses) && c.subclasses.length ? c.subclasses : [c]));
  }

  function visible(sub: any) {
    if (!sub) return false;
    if (sub.hidden) {
      // show only if player has it
      return preview.foundClasses.includes(sub.id) || preview.foundClasses.includes(sub.class) || false;
    }
    return true;
  }

  async function finalizeWithClass(sub: any) {
    // build final character and save (same behaviour as before)
    const mergedAbilities = { ...(preview.abilities || {}) };
    if (sub && sub.abilities) {
      const add = mergeAbilitiesObjects(sub.abilities);
      Object.entries(add).forEach(([k, v]) => {
        mergedAbilities[k] = (mergedAbilities[k] || 0) + v;
      });
    }

    const char: any = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      answers: preview.answers,
      abilities: mergedAbilities,
      cityLevel: preview.cityLevel,
    };
    if (sub) {
      char.class = { id: sub.id || sub.class, name: sub.name || sub.text };
      // attach selected inventory for this subclass if any
      const inv = selectedInventory[sub.id || sub.class || sub.name] || [];
      if (inv.length) char.inventory = inv;
    }

    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      if (session && session.tgId) {
        await fetch(`/profile/${session.tgId}/characters`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(char)
        });
      } else {
        const existing = JSON.parse(localStorage.getItem('characters') || '[]');
        existing.push(char);
        localStorage.setItem('characters', JSON.stringify(existing));
      }
    } catch (e) {
      const existing = JSON.parse(localStorage.getItem('characters') || '[]');
      existing.push(char);
      localStorage.setItem('characters', JSON.stringify(existing));
    }
    nav('/profile');
  }

  // cleanup draft after finalize
  function cleanupDraft() {
    try { localStorage.removeItem('char_preview'); localStorage.removeItem('char_selected_inventory'); } catch (e) {}
  }

  const subs = allClasses ? flattenSubs(allClasses) : [];

  const MAX_INV_DEFAULT = 2;

  return (
    <div className="char-root">
      <button className="char-back" onClick={() => nav('/character/create')}>← Назад</button>
      {/* Grid of tiles (4x4) */}
      <div className="class-grid">
        {subs.filter(visible).map((sub: any) => {
          const idKey = sub.id || sub.class || sub.name || String(Math.random());
          const isActive = activeClassId === idKey;
          return (
            <div key={idKey} className={`class-tile ${isActive ? 'selected' : ''}`} onClick={() => setActiveClassId(idKey)}>
              {/* if image available in class JSON you could render it here; otherwise show name */}
              <div className="tile-content">
                <div className="tile-title">{sub.name || sub.id || sub.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel for selected class */}
      {activeClassId && (() => {
        const sub = subs.filter(visible).find((s: any) => (s.id || s.class || s.name || String(s)).toString() === activeClassId);
        if (!sub) return null;
        const idKey = sub.id || sub.class || sub.name || String(Math.random());
        const invList: string[] = Array.isArray(sub.inventory) ? sub.inventory.flat().map((i:any)=>String(i)) : [];
        const selectedInv = selectedInventory[idKey] || [];
        const invLimit = typeof sub.inventoryLimit === 'number' ? sub.inventoryLimit : MAX_INV_DEFAULT;
        // abilities as ordered array of [key, value]
        const abilArr: Array<[string, number]> = Array.isArray(sub.abilities) ? sub.abilities.map((o: any) => { const k = Object.keys(o)[0]; return [k, o[k]] as [string, number]; }) : [];
        // pad to 16
        while (abilArr.length < 16) abilArr.push([``, 0]);

        return (
          <div className="detail-panel">
            <div className="detail-header">
              <h3>{sub.name} - <span className="detail-desc">{sub.description}</span></h3>
            </div>

            <div className="detail-inventory">
              <div className="inv-label">Ивентарь (inventory): {JSON.stringify(sub.inventory)}</div>
              <div className="inventory-list">
                {invList.length === 0 && <div className="no-inv">—</div>}
                {invList.map((it) => {
                  const selected = selectedInv.includes(it);
                  return (
                    <button key={it} className={`inv-btn ${selected ? 'selected' : ''}`} onClick={() => {
                      setSelectedInventory(prev => {
                        const copy = { ...(prev || {}) };
                        const cur = new Set(copy[idKey] || []);
                        if (cur.has(it)) cur.delete(it); else {
                          if (cur.size >= invLimit) { alert(`Максимум ${invLimit} предмет(ов) для этого класса`); return copy; }
                          cur.add(it);
                        }
                        copy[idKey] = Array.from(cur);
                        return copy;
                      });
                    }}>{it}</button>
                  );
                })}
              </div>
            </div>

            <div className="detail-abilities">
              <div className="abilities-grid grid-4x4">
                {abilArr.map(([k, v], idx) => (
                  <div key={idx} className="ability-cell">
                    {k ? (
                      <div className="ability-inner"><div className="ability-name">{ABILITY_LABELS[k] || k}</div><div className="ability-val">{v}</div></div>
                    ) : <div className="ability-empty">—</div>}
                  </div>
                ))}
              </div>
            </div>

            {Array.isArray(sub.skills) && sub.skills.length > 0 && (
              <div className="detail-skills">
                <h4>Навыки (skills)</h4>
                {sub.skills.map((sec: any, si: number) => (
                  <div key={si} className="skill-section">
                    {Object.entries(sec).map(([secName, items]: any) => (
                      <details key={secName} className="skill-details">
                        <summary>{secName}</summary>
                        <ul>
                          {Array.isArray(items) ? items.map((it:any, ix:number) => (
                            <li key={ix}>({it.level ? `${it.level}` : '?' } уровень) - <strong>{it.name}</strong> — {it.effect}</li>
                          )) : null}
                        </ul>
                      </details>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="detail-actions">
              <button className="choose-btn" onClick={async () => { await finalizeWithClass(sub); cleanupDraft(); }}>Выбрать</button>
            </div>
          </div>
        );
      })()}

      {/* preview moved to the bottom */}
      <div style={{ marginTop: 18 }}>
        <h4>Предварительный просмотр</h4>
        <div className="char-preview">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
