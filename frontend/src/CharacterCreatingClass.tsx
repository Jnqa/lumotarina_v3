import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CharacterCreatingClass.css';
import { showToast } from './utils/toast';

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
  Athletics: 'Атлетика',
  Acrobatics: 'Акробатика',
  History: 'История',
};

export default function CharacterCreatingClass() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
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

  

  // cleanup draft after finalize
  function cleanupDraft() {
    try { localStorage.removeItem('char_preview'); localStorage.removeItem('char_selected_inventory'); } catch (e) {}
  }

  const subs = allClasses ? flattenSubs(allClasses) : [];

  const [abilitiesMeta, setAbilitiesMeta] = useState<any | null>(null);
  const [actionTypes, setActionTypes] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/templates/abilities.json');
        if (!r.ok) return;
        const j = await r.json();
        setAbilitiesMeta(j);
      } catch (e) { /* ignore */ }
    })();
    // load action types (for skills panel)
    (async () => {
      try {
        const r2 = await fetch('/templates/classes.json');
        if (!r2.ok) return;
        const cj = await r2.json();
        const at = cj?.action_types || cj?.actionTypes || cj?.action_types || [];
        setActionTypes(at || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const MAX_INV_DEFAULT = 2;

  // modal state for naming character before creation
  const [namingModalOpen, setNamingModalOpen] = useState(false);
  const [pendingClass, setPendingClass] = useState<any | null>(null);
  const [charName, setCharName] = useState('');

  // helper: combine preview.answers into a History string
  function buildHistoryFromAnswers(answers: Record<string, any>) {
    try {
      return Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
    } catch (e) {
      return JSON.stringify(answers);
    }
  }

  // (removed unused RTDB helper) 

  async function createCharacterFromPending() {
    if (!pendingClass) return;
    const idKey = pendingClass.id || pendingClass.class || pendingClass.name || String(Math.random());
    const inv = selectedInventory[idKey] || [];
    const mergedAbilities = { ...(preview.abilities || {}) };
    if (pendingClass && pendingClass.abilities) {
      const add = mergeAbilitiesObjects(pendingClass.abilities);
      Object.entries(add).forEach(([k, v]) => { mergedAbilities[k] = (mergedAbilities[k] || 0) + v; });
    }

    const char: any = {
      id: Date.now().toString(),
      name: charName || 'Примероний Фамилионов',
      history: buildHistoryFromAnswers(preview.answers || {}),
      class: pendingClass.id || pendingClass.class || pendingClass.name,
      abilities: mergedAbilities,
      inventory: inv,
      level: 1,
      skillpoints: 0,
      // compute hpMax and hp from class base hp plus Constitution ability
      hpMax: ((pendingClass && (pendingClass.hp || pendingClass.baseHp)) || 0) + (mergedAbilities['Constitution'] || 0),
      hp: ((pendingClass && (pendingClass.hp || pendingClass.baseHp)) || 0) + (mergedAbilities['Constitution'] || 0),
      armor: 1,
      skills: {},
      createdAt: new Date().toISOString(),
    };

    // require logged-in user and save to backend
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const userId = session?.tgId || session?.uid || session?.userId || null;
    if (!userId) {
      showToast('Сохранение персонажа в базу возможно только для авторизованных пользователей. Войдите в систему.', { type: 'error' });
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(char) });
      if (resp.ok) {
        const body = await resp.json();
        if (body && body.id) char._remoteId = body.id;
      } else {
        const text = await resp.text();
        showToast('Ошибка при сохранении персонажа: ' + (text || resp.status), { type: 'error' });
        return;
      }
    } catch (e) {
      showToast('Не удалось сохранить персонажа на сервере. Проверьте соединение.', { type: 'error' });
      return;
    }

    // once saved remotely, keep a short local pointer for immediate edit
    try { localStorage.setItem('last_created_character', JSON.stringify(char)); } catch (e) {}

    // cleanup and navigate to edit
    setNamingModalOpen(false);
    setPendingClass(null);
    cleanupDraft();
    // navigate and pass the character via state
    nav('/character/edit', { state: { character: char } });
  }

  return (
    <div className="char-root">
      <button className="char-back" onClick={() => nav('/character/create')}>← Назад</button>
      {/* Grid of tiles (4x4) */}
      <div className="class-grid">
        {subs.filter(visible).map((sub: any) => {
          const idKey = sub.id || sub.class || sub.name || String(Math.random());
          const isActive = activeClassId === idKey;
          const isFound = Array.isArray(preview?.foundClasses) && preview.foundClasses.includes(idKey);
          return (
            <div key={idKey} className={`class-tile ${isActive ? 'selected' : ''} ${isFound ? 'found' : ''}`} onClick={() => setActiveClassId(idKey)}>
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
          <>
          <div className="detail-panel">
            <div className="detail-header">
              <h3>{sub.name} - <span className="detail-desc">{sub.description}</span></h3>
            </div>

            <div className="detail-inventory">
              <div className="inventory-list">🎒:
                {invList.length === 0 && <div className="no-inv">—</div>}
                {invList.map((it) => {
                  const selected = selectedInv.includes(it);
                  return (
                    <button key={it} className={`inv-btn ${selected ? 'selected' : ''}`} onClick={() => {
                      setSelectedInventory(prev => {
                        const copy = { ...(prev || {}) };
                        const cur = new Set(copy[idKey] || []);
                        if (cur.has(it)) cur.delete(it); else {
                          if (cur.size >= invLimit) { showToast(`Максимум ${invLimit} предмет(ов) для этого класса`, { type: 'error' }); return copy; }
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
              {(() => {
                const abilitiesObj = mergeAbilitiesObjects(sub.abilities || {});
                // Use canonical keys order from abilities metadata when available,
                // otherwise fall back to the built-in labels object.
                const canonical = abilitiesMeta ? Object.keys(abilitiesMeta) : Object.keys(ABILITY_LABELS);
                if (!canonical || canonical.length === 0) return <div className="small">— Нет способностей</div>;
                // Build entries ensuring missing abilities show as 0
                const entries: Array<[string, number]> = canonical.map(k => [k, Number(abilitiesObj[k] || 0)]);
                return (
                  <div className="abilities-grid responsive">
                    {entries.map(([k, v]) => {
                      const meta = abilitiesMeta && abilitiesMeta[k];
                      const label = (meta && meta.name) || ABILITY_LABELS[k] || k;
                      const color = (meta && meta.color) || 'transparent';
                      const icon = (meta && (meta.icon || meta.iconEmoji || meta.iconEmoji)) || '';
                      return (
                        <div key={k} className="ability-cell" style={{borderColor: color || undefined}}>
                          {k ? (
                            <>
                              <div className="ability-inner">
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                  <div style={{fontSize:18}}>{icon}</div>
                                  <div className="ability-name">{label}</div>
                                </div>
                              </div>
                              <div className="ability-val">{v}</div>
                            </>
                          ) : <div className="ability-empty">—</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

                
            </div>

            {/* skills panel is rendered separately below */}

            <div className="detail-actions">
              <button className="choose-btn" onClick={() => { setPendingClass(sub); setCharName(''); setNamingModalOpen(true); }}>Выбрать</button>
            </div>
          </div>

          {/* skills panel (separate) */}
          {(() => {
            const skillsObj = (sub && Array.isArray(sub.skills) && sub.skills[0]) ? sub.skills[0] : (sub && sub.skills) || {};
            if (!skillsObj) return null;
            const types = actionTypes || [];
            if (!types || types.length === 0) return null;
            function getItemsForType(sk:any, t:string) {
              if (!sk) return [];
              const tt = (t || '').toLowerCase();
              if (tt.includes('active')) return sk.actions || sk.active || [];
              if (tt.includes('short')) return sk.ShortRest || sk.short_rest || sk.shortRest || sk.Short_Rest || sk.Short || [];
              if (tt.includes('long')) return sk.LongRest || sk.long_rest || sk.longRest || sk.Long || [];
              if (tt.includes('pass')) return sk.Passive || sk.passive || [];
              return sk[t] || [];
            }

            return (
              <div className="skills-panel">
                {types.map((at: any) => {
                  const items = getItemsForType(skillsObj, at.type || at.key || '');
                  if (!items || items.length === 0) return null;
                  return (
                    <details key={at.type} className="skill-group">
                      <summary style={{display:'flex',alignItems:'center',gap:8}}>{at.icon || ''} <span style={{fontWeight:700}}>{at.name || at.type}</span></summary>
                      <div className="skill-group-items">
                        {items.map((it: any, ix: number) => (
                          <div key={ix} className="skill-row" onClick={() => {/* noop for now */}}>
                            <div style={{flex:'0 0 28px', textAlign:'center'}}>{it.level ? `L${it.level}` : ''}</div>
                            <div style={{flex:1}}><strong>{it.name}</strong> — <span style={{color:'#bbb'}}>{it.effect || it.description || ''}</span></div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            );
          })()}

          </>
        );
      })()}

      {/* Naming modal */}
      {namingModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Назови своего героя:</h3>
            <input className="modal-input" placeholder="Примероний Фамилионов" value={charName} onChange={(e) => setCharName(e.target.value)} />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
              <button className="choose-btn" onClick={() => { setNamingModalOpen(false); setPendingClass(null); }}>Отмена</button>
              <button className="choose-btn" onClick={() => createCharacterFromPending()}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* preview moved to the bottom */}
      <div style={{ marginTop: 18 }}>
        <details className="preview-spoiler">
          <summary style={{cursor:'pointer', fontWeight:100, fontSize:10}}>🧪Dev Panel</summary>
          <div className="char-preview" style={{marginTop:8}}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
}
