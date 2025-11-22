import { useState, useEffect } from 'react';
// Small subset of ability order + emoji used by CharacterEdit to render highlights
const ABILITY_ORDER = ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma','Perception','Willpower','Engineering','Medicine','Lockpicking','Stealth','Lumion','Nature','Survival','Crafting'];
const ABILITY_EMOJI: Record<string,string> = {
  Strength: '💪', Dexterity: '🤸', Constitution: '🛡️', Intelligence: '🧠', Wisdom: '🔮', Charisma: '🗣️',
  Perception: '👀', Willpower: '🫡', Engineering: '⚙️', Medicine: '🩺', Lockpicking: '🪝', Stealth: '🕶️',
  Lumion: '✨', Nature: '🌿', Survival: '🏕️', Crafting: '🔨',
};
import './MasterRoom.css';

export default function MasterRoom(){
  const [diceHistory, setDiceHistory] = useState<Array<any>>([]);
  const [showCommands, setShowCommands] = useState(false);
  const [noteText, setNoteText] = useState('');
  const quickCommands = ['!heal 10', '!damage 5', '!advantage', '!inspiration', '!shortrest'];
  
  const [allCharacters, setAllCharacters] = useState<Array<any>>([]);
  const [lobby, setLobby] = useState<Array<any>>(() => {
    try { return JSON.parse(localStorage.getItem('masterroom_lobby') || '[]'); } catch(e){ return []; }
  });
  const [showSelectModal, setShowSelectModal] = useState(false);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';

  // abilities metadata (icons, colors, localized names) loaded from public templates
  const [abilitiesMeta, setAbilitiesMeta] = useState<any | null>(null);

  // simple in-memory cache for display names to avoid refetching
  const displayNameCache: { [key:string]: string } = {};

  // fetch list of all characters from backend when opening selector
  async function loadAllCharacters(){
    try{
      const resp = await fetch(`${API_BASE}/characters/list`);
      if (!resp.ok) return;
      let data = await resp.json();
      data = data || [];

      // find unique ownerIds that don't have ownerDisplayName and fetch their names
      const missingOwners = Array.from(new Set(data.filter((d:any)=> !d.ownerDisplayName).map((d:any)=> d.ownerId)));
      if (missingOwners.length > 0) {
        await Promise.all(missingOwners.map(async (ownerId) => {
          const k = String(ownerId);
          try {
            const r = await fetch(`${API_BASE}/users/${k}/displayName`);
            if (!r.ok) { displayNameCache[k] = 'Игрок'; return; }
            const json = await r.json();
            displayNameCache[k] = (json && json.displayName) ? json.displayName : 'Игрок';
          } catch (e) { displayNameCache[k] = 'Игрок'; }
        }));
      }

      // attach ownerDisplayName where missing
      const normalized = data.map((d:any)=> ({ ...d, ownerDisplayName: d.ownerDisplayName || displayNameCache[String(d.ownerId)] || d.ownerId }));
      setAllCharacters(normalized);
    }catch(e){ console.warn('loadAllCharacters error', e); }
  }

  function saveLobby(next:any[]){
    setLobby(next);
    try{ localStorage.setItem('masterroom_lobby', JSON.stringify(next)); }catch(e){}
  }

  // Fetch full character from backend (cached by ownerId/charId) and return merged object
  const _charCache: Record<string, any> = {};
  async function fetchFullCharacter(ownerId:string, charId:string){
    const key = `${ownerId}::${charId}`;
    if (_charCache[key]) return _charCache[key];
    try{
      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerId)}/${encodeURIComponent(charId)}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      _charCache[key] = data;
      return data;
    }catch(e){ console.warn('fetchFullCharacter error', e); return null; }
  }

  async function toggleLobbyMember(entry:any){
    const exists = lobby.find((x:any)=> x.ownerId===entry.ownerId && x.charId===entry.charId);
    if (exists){
      const next = lobby.filter((x:any)=> !(x.ownerId===entry.ownerId && x.charId===entry.charId));
      saveLobby(next);
    } else {
      // ensure we have ownerDisplayName on the entry
      if (!entry.ownerDisplayName) {
        try{
          const r = await fetch(`${API_BASE}/users/${entry.ownerId}/displayName`);
          if (r.ok){
            const j = await r.json();
            entry = { ...entry, ownerDisplayName: j.displayName || entry.ownerId };
          } else {
            entry = { ...entry, ownerDisplayName: entry.ownerId };
          }
        }catch(e){ entry = { ...entry, ownerDisplayName: entry.ownerId }; }
      }
      const next = [...lobby, entry];
      saveLobby(next);
      // enrich newly added entry with full data from DB (if available)
      (async () => {
        const full = await fetchFullCharacter(entry.ownerId, entry.charId);
        if (full) {
          const merged = { ...entry, ...full };
          setLobby(prev => prev.map(x => (x.ownerId===entry.ownerId && x.charId===entry.charId) ? merged : x));
          setAllCharacters(prev => prev.map(x => (x.ownerId===entry.ownerId && x.charId===entry.charId) ? ({ ...x, ...full }) : x));
          // update localStorage copy
          try{ localStorage.setItem('masterroom_lobby', JSON.stringify(lobby.map(x => (x.ownerId===entry.ownerId && x.charId===entry.charId) ? merged : x))); }catch(e){}
        }
      })();
    }
  }

  function roll(sides:number){
    const r = Math.floor(Math.random()*sides) + 1;
    const entry = { sides, value: r, ts: Date.now() };
    // append to the end so newest appear on the right; keep only last 7
    setDiceHistory(h => {
      const next = [...h, entry].slice(-7);
      return next;
    });
  }

  // load characters when the component mounts so selector is fast
  useEffect(()=>{ loadAllCharacters(); }, []);

  // load ability metadata (icons/colors) to show proper emoji/icons in highlights
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/templates/abilities.json');
        if (r.ok) {
          const json = await r.json();
          setAbilitiesMeta(json);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  // When component mounts, try to enrich lobby with full character data from DB
  useEffect(()=>{
    async function enrichLobby(){
      if (!lobby || lobby.length===0) return;
      const updated = await Promise.all(lobby.map(async (entry:any) => {
        // skip if already has hp or abilities
        if (entry && (entry.hp !== undefined || (entry.abilities && Object.keys(entry.abilities).length>0))) return entry;
        const full = await fetchFullCharacter(entry.ownerId, entry.charId);
        return full ? { ...entry, ...full } : entry;
      }));
      // update state only if any changes
      let changed = false;
      for (let i=0;i<updated.length;i++) if (JSON.stringify(updated[i]) !== JSON.stringify(lobby[i])) { changed = true; break; }
      if (changed) saveLobby(updated);
    }
    enrichLobby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<any | null>(null);
  const [editTab, setEditTab] = useState<'notes'|'abilities'|'skills'>('notes');
  // class metadata for the currently editing character (to render skills groups)
  const [editingClassMeta, setEditingClassMeta] = useState<any | null>(null);

  function openEditModal(character:any){
    setEditingChar(JSON.parse(JSON.stringify(character || {})));
    setEditTab('notes');
    setEditModalOpen(true);
  }

  // load class metadata when editing a character with a class
  useEffect(() => {
    if (!editingChar || !editingChar.class) { setEditingClassMeta(null); return; }
    let mounted = true;
    (async () => {
      const cls = editingChar.class;
      // try direct class file first
      try {
        let r = await fetch(`/templates/classes/${encodeURIComponent(cls)}.json`);
        if (r.ok) {
          const json = await r.json(); if (mounted) setEditingClassMeta(json); return;
        }
      } catch (e) { /* ignore */ }
      // fallback to classes manifest and search
      try {
        const r2 = await fetch('/templates/classes.json');
        if (r2.ok) {
          const j = await r2.json();
          // j may be array or object with classes
          const files = Array.isArray(j) ? j : (Array.isArray(j.classes) ? j.classes : []);
          for (const f of files) {
            try {
              const rr = await fetch(`/templates/classes/${f}`);
              if (!rr.ok) continue;
              const jf = await rr.json();
              if (jf && ((jf.name && jf.name === cls) || jf.id === cls || jf.slug === cls)) { if (mounted) setEditingClassMeta(jf); return; }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }
      if (mounted) setEditingClassMeta(null);
    })();
    return () => { mounted = false; };
  }, [editingChar && editingChar.class]);

  function closeEditModal(){
    setEditModalOpen(false);
    setEditingChar(null);
  }

  async function saveEditedCharacter(){
    if (!editingChar) return;
    try{
      const ownerId = editingChar.ownerId;
      const charId = editingChar.charId;
      const payload:any = {};
      // Only send fields that masterroom modal edits
      if ('note' in editingChar) payload.note = editingChar.note;
      if ('abilities' in editingChar) payload.abilities = editingChar.abilities;
      if ('inventory' in editingChar) payload.inventory = editingChar.inventory;
      if ('skills' in editingChar) payload.skills = editingChar.skills;
      if ('abilityPoints' in editingChar) payload.abilityPoints = editingChar.abilityPoints;
      // include skill points (handle common naming variants)
      if ('skillpoints' in editingChar) payload.skillpoints = editingChar.skillpoints;
      else if ('skillPoints' in editingChar) payload.skillpoints = editingChar.skillPoints;

      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerId)}/${encodeURIComponent(charId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Save failed');

      // update local arrays: lobby and allCharacters
      setLobby(prev => prev.map((x:any) => (x.ownerId===ownerId && x.charId===charId) ? { ...x, ...editingChar } : x));
      setAllCharacters(prev => prev.map((x:any) => (x.ownerId===ownerId && x.charId===charId) ? { ...x, ...editingChar } : x));
      closeEditModal();
    }catch(e){ console.warn('saveEditedCharacter error', e); alert('Ошибка сохранения'); }
  }

  return (
    <div className="master-room-root">
      <header className="master-room-header">
        <div className="header-left"><button className="simple-btn" onClick={() => window.history.back()}>← Назад</button></div>
        <div className="header-right"><button className="simple-btn" onClick={() => window.location.reload()}>Обновить</button></div>
      </header>

      <main className="master-room-container">
        <section className="card">
          <div className="card-body">
            <button className="fast-btn" onClick={() => setShowCommands(true)}>Открыть список команд</button>
          </div>
        </section>
        <section className="card">
          <div className="dice-history">
              <div className="dice-list">
                {diceHistory.length===0 ? <div className="small">▫</div> : diceHistory.map((v,idx)=>(
                  <div key={v.ts || idx} className={`dice-entry d${v.sides}`}>{v.value}</div>
                ))}
              </div>
            </div>
          <div className="card-body">
            <div className="dice-buttons">
              {[4,6,8,12,20].map(s => (
                <button key={s} className={`dice-btn d${s}`} onClick={() => roll(s)}>d{s}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{margin:0}}>Игроки</h3>
            <div>
              <button className="simple-btn" onClick={() => { setShowSelectModal(true); loadAllCharacters(); }}>Выбрать игроков</button>
            </div>
          </div>
          <div className="card-body">
            <div className="players-grid three-cols">
              {lobby.length===0 ? <div className="small">Нет выбранных игроков</div> : lobby.map((p:any, i:number) => {
                const character = p || {};
                const hp = character.hp ?? 0;
                const hpMax = character.hpMax ?? 0;
                const hpPercent = Math.max(0, Math.min(100, (hpMax > 0 ? (hp / hpMax) * 100 : 0)));
                const level = character.level || 1;
                const pic = character.picture || 'profile_picture_00.jpg';
                return (
                <div key={i} className="mr-char-card-visual" onClick={() => openEditModal(character)}>
                  <div className="mr-top-bars">
                    
                    {/* compute a simple defense: use explicit armor or character.defense or derive from Dexterity */}
                    {(() => {
                      const dex = (character.abilities && character.abilities['Dexterity']) || 0;
                      const baseDef = (character.armor !== undefined && character.armor !== null) ? character.armor : ((character.defense !== undefined && character.defense !== null) ? character.defense : 0);
                      const defComputed = baseDef + Math.floor(dex / 10);
                      return <div className="defense" title={`Defense: ${baseDef} + Dex/10`}>🛡{defComputed}</div>;
                    })()}
                    <div className="mr-hp-bar">
                      <div className="mr-hp-label"> ❤</div>
                      <div className="mr-hp-meter">
                        <div className="mr-hp-fill" style={{width: `${hpPercent}%`}} />
                      </div>
                      <div className="mr-hp-info">
                        <span className="mr-hp-val">{hp}/{hpMax}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mr-avatar"><img src={`/profile_pictures/${pic}`} alt="avatar"/></div>
                  <div className="mr-main-row">
                    <div className="mr-level">{level}</div>
                  </div>
                    <div className="mr-highlights">
                      {/* ability highlights */}
                      {ABILITY_ORDER.map(k => {
                        const meta = abilitiesMeta && abilitiesMeta[k];
                        const icon = (meta && (meta.icon || meta.emoji || (meta.iconEmoji as any))) || ABILITY_EMOJI[k] || '';
                        const v = (character.abilities || {})[k] || 0;
                        const abs = Math.abs(v);
                        if (abs >= 10) {
                          const bg = (meta && meta.color) ? meta.color : 'var(--accent)';
                          const label = (meta && meta.name) || k;
                          const mod = v >= 0 ? `+${Math.floor(abs/10)}` : `-${Math.floor(abs/10)}`;
                          return (
                            <div key={k} className={`mr-highlight-block ${v>=0? 'pos':'neg'}`} title={label} style={{background: bg, color:'#fff'}}>
                              <div className="mr-hb-top">
                                <span className="mr-hb-icon">{icon}{k.length > 4 ? k.slice(0,3).toUpperCase() : k.toUpperCase()}</span>
                                <span className="mr-hb-mod">{mod}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}

                      <div className="mr-highlight-block mr-items-card">
                        <div className="mr-hb-top">
                          <span className="mr-hb-icon">🎒</span>
                          <span className="mr-hb-mod">{(character.inventory||[]).length}</span>
                        </div>
                        
                      </div>
                    </div>
                  <div className="mr-name-row">
                    <h2>{character.name}</h2>
                  </div>
                </div>
              );})}
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Быстрые заметки</h3>
          <div className="card-body">
            <details className="notes-spoiler">
              <summary>Показать / Скрыть</summary>
              <div className="notes-edit">
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Быстрая заметка..." />
                <div className="notes-actions"><button className="save-btn" onClick={()=> alert('Сохранено локально')}>Сохранить</button></div>
              </div>
            </details>
          </div>
        </section>
      </main>

      {showCommands && (
        <div className="modal-overlay" onClick={() => setShowCommands(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h4>Быстрые команды</h4>
            <ul className="commands-list">
              {quickCommands.map((c, i) => (
                <li key={i}><button className="cmd-btn" onClick={() => { navigator.clipboard?.writeText(c); alert('Скопировано: ' + c); }}>{c}</button></li>
              ))}
            </ul>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="simple-btn" onClick={() => setShowCommands(false)}>Закрыть</button></div>
          </div>
        </div>
      )}
        {showSelectModal && (
          <div className="modal-overlay" onClick={() => setShowSelectModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <h4>Выбрать игроков</h4>
              <div style={{maxHeight: '50vh', overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <tbody>
                    {allCharacters.map((c:any, idx:number) => {
                      const inLobby = lobby.find((x:any)=> x.ownerId===c.ownerId && x.charId===c.charId);
                      return (
                        <tr key={idx} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:8,verticalAlign:'middle',width:56}}>
                            <img src={`/profile_pictures/${c.picture}`} alt="p" style={{width:44,height:44,borderRadius:8}}/>
                          </td>
                          <td style={{padding:8}}>
                            <div style={{fontWeight:600}}>{c.name}</div>
                            <div style={{fontSize:12,color:'var(--muted)'}}>{c.ownerDisplayName || c.ownerId}</div>
                          </td>
                          <td style={{padding:8,whiteSpace:'nowrap'}}>
                            <button className="simple-btn" onClick={() => toggleLobbyMember(c)}>{inLobby? 'Убрать':'Добавить'}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="simple-btn" onClick={() => setShowSelectModal(false)}>Готово</button></div>
            </div>
          </div>
        )}

      {editModalOpen && editingChar && (
        <div className="modal-overlay" onClick={() => closeEditModal()}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h4>Редактировать: {editingChar.name || `${editingChar.charId}`}</h4>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <button className={editTab==='notes'? 'blue-btn':''} onClick={() => setEditTab('notes')}>Заметки / Инвентарь</button>
              <button className={editTab==='abilities'? 'blue-btn':''} onClick={() => setEditTab('abilities')}>Способности</button>
              <button className={editTab==='skills'? 'blue-btn':''} onClick={() => setEditTab('skills')}>Навыки</button>
            </div>
            <div style={{maxHeight:'50vh',overflow:'auto',padding:6}}>
              {editTab==='notes' && (
                <div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:13,color:'var(--muted)',marginBottom:6}}>Заметка персонажа</div>
                    <textarea style={{width:'100%',minHeight:120}} value={editingChar.note||''} onChange={e => setEditingChar((c:any)=> ({...c, note: e.target.value}))} />
                  </div>
                  <div style={{marginTop:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div style={{fontSize:13,color:'var(--muted)'}}>Инвентарь</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{(editingChar.inventory||[]).length} предмет(а/ов)</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <input id="newItemInput" placeholder="Новый предмет" style={{flex:1}} />
                      <button className="simple-btn" onClick={() => {
                        const el = document.getElementById('newItemInput') as HTMLInputElement | null; if (!el) return; const v = el.value.trim(); if (!v) return; setEditingChar((c:any)=> ({...c, inventory:[...(c.inventory||[]), v]})); el.value='';
                      }}>Добавить</button>
                    </div>
                    <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                      {(editingChar.inventory||[]).map((it:string, idx:number) => (
                        <div key={idx} style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',padding:6,background:'rgba(255,255,255,0.02)',borderRadius:6}}>
                          <div style={{flex:1}}>{it}</div>
                          <button className="delete-btn" onClick={() => setEditingChar((c:any)=> ({...c, inventory: (c.inventory||[]).filter((_:any,i:number)=> i!==idx)}))}>Удалить</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {editTab==='abilities' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{fontWeight:700}}>Ability Points</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="number" value={Number(editingChar.abilityPoints || 0)} onChange={e => setEditingChar((c:any)=> ({...c, abilityPoints: Number(e.target.value)}))} style={{width:80,padding:6,borderRadius:6}} />
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:8}}>
                    {ABILITY_ORDER.map((k:string) => (
                      <div key={k} style={{display:'contents'}}>
                        <div style={{padding:6,alignSelf:'center',display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontWeight:600}}>{k}</span>
                          <span style={{fontSize:12,color:'var(--muted)'}}>{(abilitiesMeta && abilitiesMeta[k] && abilitiesMeta[k].abbreviation) || ''}</span>
                        </div>
                        <div style={{padding:6}}>
                          <input type="number" value={Number((editingChar.abilities || {})[k] || 0)} onChange={e => setEditingChar((c:any)=> ({...c, abilities:{...(c.abilities||{}), [k]: Number(e.target.value)}}))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {editTab==='skills' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{fontWeight:700}}>Skill Points</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="number" value={Number(editingChar.skillpoints || editingChar.skillPoints || 0)} onChange={e => setEditingChar((c:any)=> ({...c, skillpoints: Number(e.target.value)}))} style={{width:80,padding:6,borderRadius:6}} />
                    </div>
                  </div>

                  {editingClassMeta ? (() => {
                    const skillsObj = (editingClassMeta && editingClassMeta.skills && Array.isArray(editingClassMeta.skills) && editingClassMeta.skills[0]) || (editingClassMeta && editingClassMeta.skills) || {};
                    const groups: any = {
                      actions: skillsObj.actions || [],
                      ShortRest: skillsObj.ShortRest || skillsObj.short_rest || skillsObj.Short_Rest || [],
                      LongRest: skillsObj.LongRest || skillsObj.long_rest || skillsObj.Long_Rest || [],
                      Passive: skillsObj.Passive || skillsObj.passive || [],
                    };
                    const learnedSet = () => {
                      const out = new Set<string>();
                      const s = editingChar?.skills;
                      if (!s) return out;
                      if (Array.isArray(s)) { for (const it of s) { if (it && it.name) out.add(it.name); else if (typeof it==='string') out.add(it); } }
                      else if (typeof s === 'object') { for (const key of Object.keys(s)) { const arr = s[key] || []; if (Array.isArray(arr)) for (const it of arr) { if (it && it.name) out.add(it.name); else if (typeof it==='string') out.add(it); } } }
                      return out;
                    };
                    const isSkillLearned = (skill:any) => learnedSet().has(skill.name || skill);
                    const learnSkill = (skill:any, sectionKey:string) => {
                      const sp = Number(editingChar.skillpoints || editingChar.skillPoints || 0);
                      if (sp <= 0) { alert('Нет skillpoints'); return; }
                      const next = {...editingChar};
                      if (!next.skills || typeof next.skills !== 'object') next.skills = {};
                      if (!Array.isArray(next.skills[sectionKey])) next.skills[sectionKey] = [];
                      // avoid dup
                      const already = (next.skills[sectionKey]||[]).some((x:any)=> (x && x.name ? x.name : x) === (skill.name || skill));
                      if (already) return;
                      next.skills[sectionKey] = [...(next.skills[sectionKey]||[]), skill.name ? skill : (skill)];
                      next.skillpoints = Math.max(0, sp - 1);
                      setEditingChar(next);
                    };

                    const order = ['actions','ShortRest','LongRest','Passive'];
                    return (
                      <div>
                        {order.map((grpKey) => {
                          const arr = groups[grpKey] || [];
                          if (!arr || arr.length===0) return null;
                          return (
                            <div key={grpKey} style={{marginBottom:10}}>
                              <div style={{fontWeight:700,marginBottom:6}}>{grpKey}</div>
                              <div style={{display:'grid',gridTemplateColumns:'1fr 120px',gap:8}}>
                                {arr.map((skill:any, idx:number)=> (
                                  <div key={idx} style={{display:'contents'}}>
                                    <div style={{padding:6,display:'flex',alignItems:'center',gap:8}}>
                                      <div style={{flex:1}}>{skill.name || skill}</div>
                                    </div>
                                    <div style={{padding:6}}>
                                      {isSkillLearned(skill) ? (
                                        <button className="small-btn" onClick={() => alert('Уже изучено')}>Изучено</button>
                                      ) : (
                                        <button className="small-btn" onClick={() => learnSkill(skill, grpKey)}>Изучить</button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : (
                    <div className="small">Нет данных класса для отображения навыков</div>
                  )}
                </div>
              )}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
              <button className="simple-btn" onClick={() => { closeEditModal(); }}>Отмена</button>
              <button className="save-btn" onClick={() => saveEditedCharacter()}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
