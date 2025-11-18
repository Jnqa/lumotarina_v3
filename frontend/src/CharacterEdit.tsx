import { useState, useEffect } from 'react';
import { showToast } from './utils/toast';
import { useLocation, useNavigate } from 'react-router-dom';
import './CharacterEdit.css';

const ABILITY_ORDER = ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma','Perception','Willpower','Engineering','Medicine','Lockpicking','Stealth','Lumion','Nature','Survival','Crafting'];

const ABILITY_EMOJI: Record<string,string> = {
  Strength: '💪',
  Dexterity: '🤸',
  Constitution: '🛡️',
  Intelligence: '🧠',
  Wisdom: '🔮',
  Charisma: '🗣️',
  Perception: '👀',
  Willpower: '🫡',
  Engineering: '⚙️',
  Medicine: '🩺',
  Lockpicking: '🪝',
  Stealth: '🕶️',
  Lumion: '✨',
  Nature: '🌿',
  Survival: '🏕️',
  Crafting: '🔨',
};

function clamp(v:number, min= -999, max=999){ return Math.max(min, Math.min(max, v)); }

export default function CharacterEdit(){
  const loc = useLocation();
  const nav = useNavigate();
  const state: any = (loc.state as any) || {};
  const charFromState = state.character || null;

  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem('last_created_character') || 'null'); } catch (e) { return null; }
  })();

  const initial = charFromState || persisted;
  const [character, setCharacter] = useState<any>(initial);
  const [editMode, setEditMode] = useState(false);
  const [abilitiesMeta, setAbilitiesMeta] = useState<any>(null);
  const [abilityModal, setAbilityModal] = useState<any>(null);
  const [classIconUrl, setClassIconUrl] = useState<string | null>(null);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
  const [classMeta, setClassMeta] = useState<any>(null);
  const [actionTypesMap, setActionTypesMap] = useState<any>({});
  const [showAllSkills, setShowAllSkills] = useState<boolean>(false);
  
  const [showNewInv, setShowNewInv] = useState<boolean>(false);
  // helper to force reload of metadata
  async function refreshMetadata(){
    try{ const ab = await fetch('/templates/abilities.json'); if (ab.ok){ setAbilitiesMeta(await ab.json()); }
    }catch(e){}
    // re-run class meta load by toggling class (triggered by effect)
    setClassMeta(null);
    setTimeout(()=> setClassMeta(classMeta), 50);
    showToast('Обновлено', { type: 'success' });
  }

  useEffect(() => {
    // load ability localization metadata from public templates
    fetch('/templates/abilities.json').then(r => r.ok ? r.json() : null).then(data => {
      if (data) setAbilitiesMeta(data);
    }).catch(() => {});
    // also load classes action types (icons & names)
    fetch('/templates/classes.json').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return;
      const map: any = {};
      const arr = data.action_types || data.actionTypes || [];
      for (const it of arr) if (it && it.type) map[it.type] = it;
      setActionTypesMap(map);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    // try to fetch class metadata to get icon and base hp
    async function loadClassMeta() {
      try {
        const cls = character?.class;
        if (!cls) { setClassIconUrl(null); setClassMeta(null); return; }
        // attempt direct filename match
        const tryPaths = [
          `/templates/classes/${cls}.json`,
          `/templates/classes/${cls.toLowerCase()}.json`,
        ];
        let meta: any = null;
        for (const p of tryPaths) {
          try {
            const r = await fetch(p);
            if (!r.ok) continue;
            meta = await r.json();
            break;
          } catch (e) { continue; }
        }
        // fallback: try manifest and search inside files
        if (!meta) {
          try {
            const m = await fetch('/templates/classes.json');
            if (m.ok) {
              const mj = await m.json();
              const files = Array.isArray(mj) ? mj : Array.isArray(mj.classes) ? mj.classes : [];
              for (const f of files) {
                try {
                  const r = await fetch(`/templates/classes/${f}`);
                  if (!r.ok) continue;
                  const cj = await r.json();
                  if ((cj.id && String(cj.id) === String(cls)) || (cj.class && String(cj.class) === String(cls)) || (cj.name && String(cj.name) === String(cls))) { meta = cj; break; }
                } catch (e) { }
              }
            }
          } catch (e) { }
        }
        if (meta) {
          if (meta.icon) {
            let iconPath = meta.icon;
            if (!iconPath.startsWith('/')) iconPath = `/templates/classes/${iconPath}`;
            setClassIconUrl(iconPath);
          } else {
            setClassIconUrl(null);
          }
          setClassMeta(meta);
        } else {
          setClassIconUrl(null);
          setClassMeta(null);
        }
      } catch (e) {
        setClassIconUrl(null);
        setClassMeta(null);
      }
    }
    loadClassMeta();
  }, [character?.class]);

  if (!character) return (
    <div style={{padding:16}}>
      <button onClick={() => nav(-1)}>← Назад</button>
      <h3>Персонаж не найден</h3>
    </div>
  );

  function changeName(v:string){ setCharacter((c:any)=> ({...c, name:v})); }

  function adjustAbility(key:string, delta:number){
    // adjust and consume abilityPoints when editing
    if (!editMode) return;
    const cur = (character.abilities && character.abilities[key]) || 0;
    const ap = character.abilityPoints || 0;
    if (delta>0 && ap<=0) { showToast('Нет ability points', { type: 'error' }); return; }
    const newVal = clamp(cur + delta);
    setCharacter((c:any)=> {
      const newAbilities = {...(c.abilities||{}), [key]: newVal};
      const updated: any = {...c, abilities: newAbilities, abilityPoints: Math.max(0, (c.abilityPoints||0) - (delta>0?1:0))};
      // if Constitution changed, recalculate hpMax based on class base hp + Constitution
      if (key === 'Constitution') {
        const classHp = (classMeta && (classMeta.hp || classMeta.baseHp)) || 0;
        const newHpMax = classHp + (newAbilities['Constitution'] || 0);
        const prevHp = c.hp || 0;
        // if previous hp was equal to previous max (or absent), keep it at max; otherwise clamp
        const prevMax = c.hpMax ?? (classHp + ((c.abilities && c.abilities['Constitution']) || 0));
        let newHp = prevHp;
        if (prevHp === prevMax || prevHp === undefined || prevHp === null) newHp = newHpMax;
        if (newHp > newHpMax) newHp = newHpMax;
        updated.hpMax = newHpMax;
        updated.hp = newHp;
      }
      return updated;
    });
  }

  // ensure character has hp and armor defaults when classMeta or abilities are loaded
  useEffect(() => {
    if (!character) return;
    setCharacter((c:any) => {
      let changed = false;
      const out = {...c};
      if (out.armor === undefined || out.armor === null) { out.armor = 1; changed = true; }
      if ((out.hpMax === undefined || out.hpMax === null) && classMeta) {
        const classHp = (classMeta && (classMeta.hp || classMeta.baseHp)) || 0;
        const con = (out.abilities && out.abilities['Constitution']) || 0;
        out.hpMax = classHp + con;
        // initialize current hp to max if not present
        if (out.hp === undefined || out.hp === null) out.hp = out.hpMax;
        changed = true;
      }
      // ensure hp does not exceed hpMax
      if (out.hpMax !== undefined && out.hp !== undefined && out.hp > out.hpMax) { out.hp = out.hpMax; changed = true; }
      return changed ? out : c;
    });
  }, [classMeta]);

  // Helpers for skills handling
  function getClassSkills() {
    // classMeta.skills often is an array with one object that groups actions
    const skillsObj = (classMeta && classMeta.skills && Array.isArray(classMeta.skills) && classMeta.skills[0]) || (classMeta && classMeta.skills) || {};
    // normalize keys to expected names
    return {
      actions: skillsObj.actions || [],
      ShortRest: skillsObj.ShortRest || skillsObj.short_rest || skillsObj.Short_Rest || [],
      LongRest: skillsObj.LongRest || skillsObj.long_rest || skillsObj.Long_Rest || [],
      Passive: skillsObj.Passive || skillsObj.passive || [],
    };
  }

  function learnedSet() {
    const out = new Set<string>();
    const s = character?.skills;
    if (!s) return out;
    if (Array.isArray(s)) {
      for (const it of s) { if (it && it.name) out.add(it.name); }
    } else if (typeof s === 'object') {
      for (const key of Object.keys(s)) {
        const arr = s[key] || [];
        if (Array.isArray(arr)) for (const it of arr) if (it && it.name) out.add(it.name);
      }
    }
    return out;
  }

  function isSkillLearned(skill:any) {
    const set = learnedSet();
    return set.has(skill.name || '');
  }

  function onSkillClick(skill:any, sectionKey:string) {
    setAbilityModal({ title: skill.name, desc: skill.effect || skill.description || '', extra:{ skill, sectionKey } });
  }

  function learnSkill(skill:any, sectionKey:string) {
    (async ()=>{
      const sp = character.skillpoints || 0;
      if (sp <= 0) { showToast('Нет skillpoints', { type: 'error' }); return; }
      const requiredLevel = skill.level || 1;
      if ((character.level || 1) < requiredLevel) { showToast(`Требуется уровень ${requiredLevel}`, { type: 'error' }); return; }

      // build optimistic next state
      const next = {...character};
      if (!next.skills || typeof next.skills !== 'object') next.skills = {};
      if (!Array.isArray(next.skills[sectionKey])) next.skills[sectionKey] = [];
      // avoid duplicates
      if ((next.skills[sectionKey]||[]).some((x:any)=>x.name===skill.name)) { setAbilityModal(null); return; }
      next.skills[sectionKey] = [...(next.skills[sectionKey]||[]), skill];
      next.skillpoints = Math.max(0, (next.skillpoints||0)-1);

      // optimistic update locally
      setCharacter(next);
      setAbilityModal(null);
      showToast(`Изучено: ${skill.name}`, { type: 'success' });

      // attempt to persist to server when possible
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const userId = session?.tgId || session?.uid || session?.userId || null;
      const remoteId = getRemoteId();
      if (userId && remoteId) {
        try {
          const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next)
          });
          if (resp.ok) {
            showToast('Навык сохранён на сервере', { type: 'success' });
            try { localStorage.setItem('last_created_character', JSON.stringify(next)); } catch(e){}
          } else {
            const txt = await resp.text();
            showToast('Ошибка при сохранении навыка: ' + (txt || resp.status), { type: 'error' });
          }
        } catch (e) {
          showToast('Ошибка соединения при сохранении навыка', { type: 'error' });
        }
      } else {
        showToast('Навык добавлен локально (неавторизовано)', { type: 'info' });
      }
    })();
  }

  async function saveToServer(){
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const userId = session?.tgId || session?.uid || session?.userId || null;
    if (!userId) { showToast('Нужно войти в аккаунт чтобы сохранять изменения.', { type: 'error' }); return; }
    const remoteId = character._remoteId || character.id || character._id || character.remoteId;
    if (!remoteId) { showToast('Персонаж не синхронизирован. Создайте персонажа заново.', { type: 'error' }); return; }
    try{
      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}`, { method: 'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(character)});
      if (resp.ok){ showToast('Сохранено', { type: 'success' }); setEditMode(false); localStorage.setItem('last_created_character', JSON.stringify(character)); }
      else { const txt = await resp.text(); showToast('Ошибка: '+ (txt||resp.status), { type: 'error' }); }
    }catch(e){ showToast('Ошибка соединения', { type: 'error' }); }
  }

  // Resolve the remote id of the character (support several possible field names)
  function getRemoteId() {
    return character? (character._remoteId || character.id || character._id || character.remoteId) : null;
  }

  // Add inventory item (call backend if character is synced, otherwise local-only)
  async function addInventoryItem(value: string) {
    if (!value) return;
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const userId = session?.tgId || session?.uid || session?.userId || null;
    const remoteId = getRemoteId();
    if (userId && remoteId) {
      try {
        const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: value })
        });
        if (!resp.ok) { const txt = await resp.text(); showToast('Ошибка: ' + (txt || resp.status), { type: 'error' }); return; }
        // success: update local state
        setCharacter((c: any) => ({ ...c, inventory: [...(c.inventory || []), value] }));
        showToast('Предмет добавлен', { type: 'success' });
      } catch (e) { showToast('Ошибка соединения', { type: 'error' }); }
    } else {
      setCharacter((c: any) => ({ ...c, inventory: [...(c.inventory || []), value] }));
      showToast('Предмет добавлен (локально)', { type: 'success' });
    }
  }

  // Delete inventory item by index (call backend if possible)
  async function deleteInventoryItem(index: number) {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const userId = session?.tgId || session?.uid || session?.userId || null;
    const remoteId = getRemoteId();
    if (userId && remoteId) {
      try {
        const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}/items/${index}`, { method: 'DELETE' });
        if (resp.ok) {
          setCharacter((c: any) => ({ ...c, inventory: (c.inventory || []).filter((_: any, i: number) => i !== index) }));
          showToast('Предмет удалён', { type: 'success' });
          return;
        }
        // Treat 404 as idempotent success (item already missing on server)
        if (resp.status === 404) {
          setCharacter((c: any) => ({ ...c, inventory: (c.inventory || []).filter((_: any, i: number) => i !== index) }));
          showToast('Предмет удалён (локально)', { type: 'info' });
          return;
        }
        const txt = await resp.text();
        showToast('Ошибка: ' + (txt || resp.status), { type: 'error' });
      } catch (e) { showToast('Ошибка соединения', { type: 'error' }); }
    } else {
      setCharacter((c: any) => ({ ...c, inventory: (c.inventory || []).filter((_: any, i: number) => i !== index) }));
      showToast('Предмет удалён (локально)', { type: 'success' });
    }
  }

  // (removed unused displayMod helper)

  return (
    <div className="char-edit-root">
      <div style={{display:'flex',gap:8,alignItems:'center',justifyContent: 'space-between'}}>
        <button className="char-back" onClick={() => nav(-1)}>← Назад</button>
        {!editMode && <button className="char-refresh" onClick={refreshMetadata}>Обновить</button>}
        <button className="edit-btn" onClick={()=> setEditMode(e=>!e)}>{editMode? '✖':'✍'}</button>
        {editMode && <button className="save-btn" onClick={saveToServer}>💾 Сохранить</button>}
      </div>
      <div className="card-wrap">
        <div className="char-card-visual">
          <div className="top-bars">
            <div className="hp-bar">
              <div className="hp-label">HP</div>
                {editMode && (
                  <>
                    <button className="hp-btn" onClick={() => setCharacter((c:any)=> ({...c, hp: Math.max(0, (c.hp||0)-1)}))}>−</button>
                  </>
                )}
              <div className="hp-meter">
                <div className="hp-fill" style={{width: `${Math.max(0, Math.min(100, ((character.hp||0) / Math.max(1, (character.hpMax||1))) * 100))}%`}} />
              </div>
              <div className="hp-info">
                <span className="hp-val">{character.hp ?? 0}/{character.hpMax ?? 0}</span>
                {editMode && (
                  <>
                    <button className="hp-btn" onClick={() => setCharacter((c:any)=> ({...c, hp: Math.min((c.hpMax||0), (c.hp||0)+1)}))}>+</button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="avatar"><img src="/profile_pictures/profile_picture_00.jpg" alt="avatar"/></div>
          <div className="main-row">
            <div className="level">lvl {character.level || 1}</div>
            <div className="class-icon" onClick={() => {
              if (classMeta) setAbilityModal({ title: classMeta.name || character.class, desc: classMeta.description || JSON.stringify(classMeta,null,2), extra:{ type: 'class' } });
              else setAbilityModal({ title: character.class || 'Класс', desc: 'Данных класса нет', extra:{ type: 'class' } });
            }}>
              {classIconUrl ? <img src={classIconUrl} alt={character.class} style={{width:48,height:48,objectFit:'cover',borderRadius:8}} /> : (character.class || '')}
            </div>
          </div>
          <div className="name-row">
            {editMode ? <input value={character.name||''} onChange={e=>changeName(e.target.value)} /> : <h2>{character.name}</h2>}
          </div>
          <div className="highlights">
            {ABILITY_ORDER.map(k => {
              const v = (character.abilities || {})[k] || 0;
              const abs = Math.abs(v);
              if (abs >= 10) {
                const meta = abilitiesMeta && abilitiesMeta[k];
                const icon = (meta && (meta.icon || meta.emoji || meta.iconEmoji)) || ABILITY_EMOJI[k] || '';
                const abbr = meta?.abbreviation || (k.length > 4 ? k.slice(0, 3).toUpperCase() : k.toUpperCase());
                const mod = v >= 0 ? `+${Math.floor(Math.abs(v)/10)}` : `-${Math.floor(Math.abs(v)/10)}`;
                return (
                  <div key={k} className={`highlight-block ${v>=0? 'pos':'neg'}`} onClick={() => setAbilityModal({ title: k, desc: meta?.description || k })}>
                    <div className="hb-top">
                      <span className="hb-icon">{icon}</span>
                      <span className="hb-mod">{mod}</span>
                    </div>
                    <div className="hb-bottom">
                      <span className="hb-abbr">{abbr}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })}
            <div className="highlight-block items-card" onClick={() => { const el = document.querySelector('.inv-section'); if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' }); }}>
              <div className="hb-top">
                <span className="hb-icon">🎒</span>
                <span className="hb-mod">{(character.inventory||[]).length}</span>
              </div>
              <div className="hb-bottom"><span className="hb-abbr">items</span></div>
            </div>
          </div>
        </div>

        <div className="char-card-details">
          <div className="section abilities-section">
            <details className="abilities-details" open>
              <summary className="section-header">Способности <span className="small">AbilityPoints: {character.abilityPoints||0}</span></summary>
              <div className="abilities-grid">
                {ABILITY_ORDER.map((k)=>{
                  const v=(character.abilities||{})[k]||0;
                  const pct = Math.max(0, Math.min(100, 50 + v));
                  const meta = abilitiesMeta && abilitiesMeta[k];
                  const emoji = (meta && (meta.icon || meta.emoji || meta.iconEmoji)) || ABILITY_EMOJI[k] || '';
                  const abbr = meta?.abbreviation || (k.length>4? k.slice(0,3).toUpperCase(): k.toUpperCase());
                  return (
                    <div className="ability-row" key={k}>
                      <div className="ability-circle" title={meta?.name || k} onClick={() => setAbilityModal({ title: meta?.name || k, desc: meta?.description || '' })} style={{background: meta?.color || '#888'}}>{emoji}</div>
                      <div className="ability-name">{meta?.name || k}</div>
                      <div className="ability-bar"><div className="ability-fill" style={{width: `${pct}%`}}>{abbr}</div></div>
                      <div className="ability-val">{v}</div>
                      {editMode && <div className="ability-controls"><button onClick={()=>adjustAbility(k,1)}>+</button></div>}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>

          <div className="section inv-section">
            <div className="section-header">
              Инвентарь
              <div>
                <button className="section-add" onClick={()=>{ setShowNewInv(s=>!s); }}>{showNewInv? '✖':'➕'}</button>
              </div>
            </div>
            <div className="inv-list">
                {(character.inventory||[]).map((it:any, idx:number)=> (
                  <div key={idx} className="inv-item-row">
                    <button className="inv-item-btn" onClick={()=> setAbilityModal({ title: String(it), desc: '', extra:{ type:'inv', index: idx, name: it } })}>
                      <div className="inv-name">{it}</div>
                    </button>
                  </div>
                ))}
                {showNewInv && (
                <div style={{marginTop:8}}>
                  <input placeholder="Новый предмет" id="new-inv" /> <button onClick={async ()=>{ const el:any=document.getElementById('new-inv'); if(!el) return; const val=el.value; if(!val) return; await addInventoryItem(val); el.value=''; setShowNewInv(false); }}>Добавить</button>
                </div>
              )}
            </div>
          </div>

          <div className="section skills-section">
            <div className="section-header">
              Навыки
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button className="skill-learn-count" onClick={()=>setShowAllSkills(s=>!s)}>[{character.skillpoints||0}]</button>
                <button className="skill-toggle" onClick={()=>setShowAllSkills(s=>!s)}>{showAllSkills? 'Показать изученные':'Показать все'}</button>
              </div>
            </div>

            {/* Render grouped skills from classMeta (only learned by default) */}
            {classMeta ? (()=>{
              const groups = getClassSkills();
              // mapping from our keys to classes.json type keys
              const mapKey: any = { actions: 'active', ShortRest: 'short_rest', LongRest: 'long_rest', Passive: 'passive' };
              const order = ['actions','ShortRest','LongRest','Passive'];
              const learned = learnedSet();
              return (
                <div className="skills-list">
                  {order.map((secKey)=>{
                    const arr = (groups as any)[secKey] || [];
                    if (!arr || arr.length===0) return null;
                    const typeKey = mapKey[secKey];
                    const typeMeta = actionTypesMap[typeKey] || {};
                    // count of learned in this group
                    const learnedCount = arr.filter((it:any)=> learned.has(it.name)).length;
                    // if not showing all and none learned, skip
                    if (!showAllSkills && learnedCount===0) return null;
                    return (
                      <div key={secKey} className="skill-group">
                        <div className="skill-group-header">{(typeMeta.icon||'')} {typeMeta.name || secKey} {learnedCount>0? `— ${learnedCount}`: ''}</div>
                        <div className="skill-group-items">
                          {arr.map((it:any, idx:number)=>{
                            const learnedFlag = learned.has(it.name);
                            if (!showAllSkills && !learnedFlag) return null;
                            const canAccess = (character.level || 1) >= (it.level || 1);
                            return (
                              <div key={idx} className={`skill-row ${learnedFlag? 'learned':''} ${!canAccess? 'disabled':''}`} onClick={()=> { if (canAccess) onSkillClick(it, secKey); }}>
                                <div className="skill-dot">▪</div>
                                <div className="skill-level">lvl{it.level || 1}</div>
                                <div className="skill-name">{it.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="small">Нет данных класса</div>
            )}
          </div>


        </div>
      </div>
      {abilityModal && (
        <div className="ability-modal" onClick={() => setAbilityModal(null)}>
          <div className="ability-modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="ability-modal-header">
              <strong>{abilityModal.title}</strong>
              <button className="ability-modal-close" onClick={() => setAbilityModal(null)}>×</button>
            </div>
            <div className="ability-modal-body">
              <div style={{marginBottom:8}}>{abilityModal.desc}</div>
              {abilityModal.extra && (()=>{
                const extra = abilityModal.extra as any;
                if (extra.type === 'class') {
                  const meta = classMeta || {};
                  return (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div><strong>HP base:</strong> {meta.hp ?? meta.baseHp ?? '—'}</div>
                      <div><strong>Описание:</strong> {meta.description || ''}</div>
                      {meta.inventory && <div><strong>Старт. инвентарь:</strong> {JSON.stringify(meta.inventory)}</div>}
                    </div>
                  );
                }
                if (extra.type === 'inv') {
                  return (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{flex:1}}><strong>Предмет:</strong> {extra.name}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <button className="delete-btn" onClick={async ()=>{ await deleteInventoryItem(extra.index); setAbilityModal(null); }}>Удалить</button>
                      </div>
                    </div>
                  );
                }
                // skill object handling (legacy shape)
                if (extra.skill) {
                  const sk = extra.skill;
                  const sec = extra.sectionKey || 'actions';
                  const learnedFlag = isSkillLearned(sk);
                  return (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{flex:1}}>
                        <div><strong>Уровень:</strong> {sk.level || 1}</div>
                        <div><strong>Раздел:</strong> {sec}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {learnedFlag ? <div style={{padding:6,borderRadius:6,background:'#223322',color:'#bfffbf'}}>Изучено</div> : null}
                        {showAllSkills && !learnedFlag ? (
                          ((character.level || 1) >= (sk.level || 1))
                            ? <button className="learn-btn" onClick={()=>learnSkill(sk, sec)}>Изучить (−1)</button>
                            : <button className="learn-btn" disabled title={`Требуется уровень ${sk.level || 1}`}>Недоступно</button>
                        ) : null}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
