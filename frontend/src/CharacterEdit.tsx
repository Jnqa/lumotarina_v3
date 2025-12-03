import { useState, useEffect } from 'react';
import { showToast } from './utils/toast';
import { useLocation, useNavigate } from 'react-router-dom';
import './CharacterEdit.css';

const ABILITY_ORDER = ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma','Perception','Willpower','Engineering','Medicine','Lockpicking','Stealth','Lumion','Nature','Survival','Crafting','Athletics','Acrobatics','History'];

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
  Athletics: '🤾‍♂️',
  Acrobatics: '🤸‍♂️',
  History: '📜',
};

function clamp(v:number, min= -999, max=999){ return Math.max(min, Math.min(max, v)); }

export default function CharacterEdit(){
  const loc = useLocation();
  const nav = useNavigate();
  const state: any = (loc.state as any) || {};
  const charFromState = state.character || null;

  // Do not rely on localStorage for character state anymore; prefer navigation state and server
  const initial = charFromState || null;
  const [character, setCharacter] = useState<any>(initial);
  
  if (initial?.id) {
     // quiet: do not log initial character load in production
  } else {
     // quiet: do not log character load without ID in production
  }

  // If there is no initial character (no state and nothing persisted), but the URL
  // contains a character id (e.g. ?charId=2 or ?id=2), try to fetch it from server.
  // This helps when the user opened /character/edit directly or reloaded the page.
  useEffect(() => {
    // If we already have a useful initial character (it contains an id or charId),
    // skip fetching from URL. But if `initial` exists without any id fields, we
    // must still try to fetch by URL because persisted state may be incomplete.
    if (initial && (initial.id || initial.charId || initial._id || initial._remoteId || initial.remoteId)) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCharId = params.get('charId') || params.get('id');
      if (!urlCharId) return;
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const userId = session?.tgId || session?.uid || session?.userId || null;
      if (!userId) return;
      (async () => {
        try {
          const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(urlCharId)}`);
          console.log('[CharacterEdit.initFetch] resp:', resp);
          if (!resp.ok) return;
          const data = await resp.json();
            if (data) {
            setCharacter(data);
            try { localStorage.setItem('last_opened_character', JSON.stringify({ ownerId: userId, charId: urlCharId })); } catch(e) {}
          }
        } catch (e) {
          // ignore network errors
        }
      })();
    } catch (e) { /* ignore */ }
  }, []);

  // Helper: ensure the character has an `id`. If missing, attempt to resolve it
  // using URL param or by listing user's characters and matching name+picture.
  async function ensureCharacterId(c: any) {
    if (!c) return null;

    // If MasterRoom or other parts set `charId`/`ownerId`, accept that as remote id
    if ((c.charId || c._charId) && c.ownerId) {
      const attached = { ...(c||{}), id: c.charId };
      try { setCharacter(attached); } catch (e) { /* ignore */ }
      return attached;
    }

    if (c.id || c._remoteId || c._id || c.remoteId) return c;

    try {
      const params = new URLSearchParams(window.location.search);
      const urlCharId = params.get('charId') || params.get('id');
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const userId = session?.tgId || session?.uid || session?.userId || null;
      if (!userId) return c;

      // 1) If URL contains charId, try to fetch it
      if (urlCharId) {
        console.log('🧨[CharacterEdit.ensureCharacterId] urlCharId:', urlCharId);
        try {
          const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(urlCharId)}`);
          console.log('[CharacterEdit.ensureCharacterId] resp for urlCharId:', resp);
          if (resp.ok) {
            const data = await resp.json();
              if (data) {
              // ensure id field
              data.id = data.id || urlCharId;
              setCharacter(data);
              try { localStorage.setItem('last_opened_character', JSON.stringify({ ownerId: userId, charId: urlCharId })); } catch(e) {}
              return data;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // 2) Try to find by listing user's characters and matching name+picture
      try {
        const listResp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}`);
        console.log('💛[CharacterEdit.ensureCharacterId] listResp:', listResp);
        if (listResp.ok) {
          const chars = await listResp.json();
          const entries = Array.isArray(chars) ? chars : Object.keys(chars||{}).map(k => ({ id: k, ...chars[k] }));
          const match = entries.find((ch:any) => (ch.name === (c.name || '')) && ((ch.picture || '') === (c.picture || '')) );
          console.log('🧨match:', match);
            if (match && match.id) {
            // fetch full data for this id to get all fields
            try {
              const resp2 = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(match.id)}`);
                if (resp2.ok) {
                const full = await resp2.json();
                full.id = full.id || match.id;
                setCharacter(full);
                try { localStorage.setItem('last_opened_character', JSON.stringify({ ownerId: userId, charId: match.id })); } catch(e) {}
                return full;
              }
            } catch (e) { /* ignore */ }
            // if fetching full fails, attach id and return
            const attached = { ...(c||{}), id: match.id };
            setCharacter(attached);
            return attached;
          }
        }
      } catch (e) {
        console.log('❗[CharacterEdit.ensureCharacterId] list error 1:', e);
        // ignore
      }
    } catch (e) {
      // ignore
    }
    console.log('❗c:', c);
    return c;
  }

  // Run id resolution when a character exists in state but lacks id
  useEffect(() => {
    if (!character) return;
    if (character.id || character._remoteId || character._id || character.remoteId || character.charId) return;
    // resolve and set id if possible
    ensureCharacterId(character).catch(() => {});
  }, [character]);
  const [editMode, setEditMode] = useState(false);
  const [abilitiesMeta, setAbilitiesMeta] = useState<any>(null);
  const [abilityModal, setAbilityModal] = useState<any>(null);
  const [classIconUrl, setClassIconUrl] = useState<string | null>(null);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
  const [classMeta, setClassMeta] = useState<any>(null);
  const [actionTypesMap, setActionTypesMap] = useState<any>({});
  const [showAllSkills, setShowAllSkills] = useState<boolean>(false);
  
  const [showNewInv, setShowNewInv] = useState<boolean>(false);
  const [noteEditMode, setNoteEditMode] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [pictures, setPictures] = useState<any[]>([]);
  const [pictureModalOpen, setPictureModalOpen] = useState<boolean>(false);
  const [pictureFilter, setPictureFilter] = useState<string>('all');
  // helper to force reload of metadata
  async function refreshMetadata(){
    try{
      const ab = await fetch('/templates/abilities.json'); if (ab.ok){ setAbilitiesMeta(await ab.json()); }
    }catch(e){}

    // If we have a synced character and a logged-in session, attempt to refresh the character from server
    try {
      const { ownerId, charId } = getOwnerAndChar();
      if (ownerId && charId) {
        try {
          const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerId)}/${encodeURIComponent(charId)}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data) {
              setCharacter(data);
              setNoteText(data.note ?? '');
              setNotesFetchedFor(charId);
            }
          }
        } catch (e) {
          console.error('Error fetching character from server:', e);
        }
      }
    } catch (e) {
      // ignore session parsing errors
    }

    // re-run class meta load by toggling class (triggered by effect)
    setClassMeta(null);
    setTimeout(()=> setClassMeta(classMeta), 50);
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

    // load character pictures manifest
    fetch('/templates/character_pictures.json').then(r => r.ok ? r.json() : null).then(data => {
      if (data && Array.isArray(data.pictures)) setPictures(data.pictures);
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

  // keep noteText in sync with character.note when character loads/changes
  useEffect(() => {
    if (!character) return;
    setNoteText(character.note ?? '');
  }, [character]);

  // initialize notesOpen depending on whether a note exists; keep in sync when character changes
  useEffect(() => {
    if (!character) { setNotesOpen(false); return; }
    setNotesOpen(!!(character.note && String(character.note).trim()));
  }, [character]);

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
    // derive owner and charId (prefer character.ownerId if editing someone else's entry)
    const { ownerId: derivedOwner, charId: derivedCharId } = getOwnerAndChar();
    const ownerToUse = character?.ownerId || derivedOwner || userId;
    if (!ownerToUse) { showToast('Нужно войти в аккаунт чтобы сохранять изменения.', { type: 'error' }); return; }
    let remoteId = derivedCharId || character.charId || character.id || character._remoteId || character._id || character.remoteId;
    // If we don't have a remoteId, try to find matching character on server by name+picture
    if (!remoteId) {
      try {
        const listResp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}`);
        if (listResp.ok) {
          const chars = await listResp.json();
          const entries = Array.isArray(chars) ? chars : Object.keys(chars||{}).map(k => ({ id: k, ...chars[k] }));
          const match = entries.find((c:any) => (c.name === character.name) && ((c.picture || '') === (character.picture || '')) );
          if (match && match.id) {
            remoteId = match.id;
          }
        }
      } catch (e) {
        // ignore lookup errors here; will produce not-synced message below
      }
    }
    if (!remoteId) { showToast('Персонаж не синхронизирован. Создайте персонажа заново.', { type: 'error' }); return; }
    try{
      const payload: any = { ...character };
      delete payload.id; delete payload._id; delete payload.remoteId; delete payload._remoteId; delete payload.ownerId;
      try {
        const check = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerToUse)}/${encodeURIComponent(remoteId)}`);
        if (!check.ok) {
          const listResp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerToUse)}`);
          if (listResp.ok) {
            const chars = await listResp.json();
            const entries = Array.isArray(chars) ? chars : Object.keys(chars||{}).map(k => ({ id: k, ...chars[k] }));
            const match = entries.find((c:any) => (c.name === character.name) && ((c.picture || '') === (character.picture || '')) );
            if (match && match.id) {
              remoteId = match.id;
            } else {
              console.error('[CharacterEdit.saveToServer] No matching character found');
              showToast('Не удалось найти соответствующий персонаж на сервере. Сохранение отменено, чтобы не создать дубликат.', { type: 'error' });
              return;
            }
          } else {
            console.error('[CharacterEdit.saveToServer] Failed to list characters');
            showToast('Не удалось проверить существование персонажа на сервере. Сохранение отменено.', { type: 'error' });
            return;
          }
        }
      } catch (e) {
        console.error('[CharacterEdit.saveToServer] Exception during character check:', e);
        showToast('Ошибка соединения при проверке персонажа на сервере', { type: 'error' });
        return;
      }

      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerToUse)}/${encodeURIComponent(remoteId)}`, { method: 'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)});
      if (resp.ok){
        // prefer server-returned representation when available
        let updated = character;
        try { const j = await resp.json(); if (j) updated = j; } catch(e) { /* ignore non-json response */ }
        setCharacter(updated);
        setEditMode(false);
        showToast('Сохранено', { type: 'success' });
      } else {
        const txt = await resp.text(); 
        console.error('[CharacterEdit.saveToServer] PUT error:', resp.status, txt);
        showToast('Ошибка: '+ (txt||resp.status), { type: 'error' });
      }
    }catch(e){ 
      console.error('[CharacterEdit.saveToServer] Exception:', e);
      showToast('Ошибка соединения', { type: 'error' }); 
    }
  }

  // Save a note for the character (optimistic local update + server POST)
  async function saveNote() {
    if (!character) return;
    const newNote = noteText ?? '';
    // optimistic local update
    setCharacter((c:any) => ({ ...c, note: newNote }));
    // no local persistence

    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const userId = session?.tgId || session?.uid || session?.userId || null;
    const remoteId = getRemoteId();
    if (userId && remoteId) {
      try {
        const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}/note`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: newNote })
        });
        if (resp.ok) {
          showToast('Заметка сохранена', { type: 'success' });
          setNoteEditMode(false);
        } else {
          const txt = await resp.text();
          showToast('Ошибка при сохранении заметки: ' + (txt || resp.status), { type: 'error' });
        }
      } catch (e) {
        showToast('Ошибка соединения при сохранении заметки', { type: 'error' });
      }
    } else {
      showToast('Заметка сохранена локально (неавторизовано)', { type: 'info' });
      setNoteEditMode(false);
    }
  }

  // Resolve the remote id of the character (support several possible field names)
  function getRemoteId() {
    // prefer last_opened_character if present, then URL param, then character fields
    try {
      try {
        const last = JSON.parse(localStorage.getItem('last_opened_character') || 'null');
        if (last && last.charId) return last.charId;
      } catch (e) { /* ignore parse errors */ }
      const params = new URLSearchParams(window.location.search);
      const urlCharId = params.get('charId') || params.get('id');
      if (urlCharId) return urlCharId;
    } catch (e) { /* ignore */ }
    return character ? (character.charId || character.id || character._remoteId || character._id || character.remoteId) : null;
  }

  // Derive both ownerId and charId for calls that need both (prefer explicit ownerId on character)
  function getOwnerAndChar() {
    // Check navigation state first (supports nav(..., { state: { character } })
    const navState: any = (loc.state as any) || {};
    const navChar = navState.character || navState;
    const params = new URLSearchParams(window.location.search);
    const urlCharId = params.get('charId') || params.get('id');
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const sessionUserId = session?.tgId || session?.uid || session?.userId || null;

    // fallback to last opened character stored locally
    let stored: any = null;
    try {
      stored = JSON.parse(localStorage.getItem('last_opened_character') || 'null');
    } catch(e) { /* ignore */ }

    const ownerId = (navState && (navState.ownerId || navState.owner)) || character?.ownerId || (stored && stored.ownerId) || sessionUserId;
    const charId = urlCharId || (navChar && (navChar.charId || navChar.id || navChar._remoteId || navChar._id || navChar.remoteId)) || (character ? (character.charId || character.id || character._remoteId || character._id || character.remoteId) : null) || (stored && stored.charId) || null;

    // debug: show where charId came from when missing earlier
    console.log('[CharacterEdit.getOwnerAndChar] navState:', navState, 'urlCharId:', urlCharId, 'characterIdFields:', character && (character.charId || character.id || character._remoteId || character._id || character.remoteId), 'stored:', stored, 'resolved ownerId:', ownerId, 'charId:', charId);

    return { ownerId, charId };
  }

  // Fetch the persisted note from server when character is synced (and avoid refetching)
  const [notesFetchedFor, setNotesFetchedFor] = useState<string | null>(null);
  const [fetchedCharacterFor, setFetchedCharacterFor] = useState<string | null>(null);
  useEffect(() => {
    const { ownerId, charId } = getOwnerAndChar();
    if (!ownerId || !charId) return;
    if (notesFetchedFor === charId) return; // already fetched for this remote id

    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerId)}/${encodeURIComponent(charId)}/note`);
        if (resp.ok) {
          const data = await resp.json();
          if (data && typeof data.note !== 'undefined' && data.note !== null) {
            setCharacter((c:any) => ({ ...(c||{}), note: data.note }));
            setNoteText(data.note ?? '');
          }
        }
      } catch (e) {
        // ignore network errors; leave local state as-is
      } finally {
        setNotesFetchedFor(charId);
      }
    })();
  }, [character?.id, character?.charId, character?._id, character?._remoteId, character?.remoteId, API_BASE, notesFetchedFor]);

  // Fetch full character from server on initial load (so picture and other fields come from DB)
  useEffect(() => {
    const { ownerId, charId } = getOwnerAndChar();
    console.log('[CharacterEdit.fetchCharacterEffect] ownerId:', ownerId, 'charId:', charId, 'fetchedCharacterFor:', fetchedCharacterFor);
    if (!ownerId || !charId) return;
    if (fetchedCharacterFor === charId) return; // already fetched

    (async () => {
      try {
          const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerId)}/${encodeURIComponent(charId)}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data) {
              setCharacter(data);
              try { localStorage.setItem('last_opened_character', JSON.stringify({ ownerId, charId })); } catch(e) {}
              setNoteText(data.note ?? '');
              setNotesFetchedFor(charId);
            }
          }
      } catch (e) {
        console.error('[CharacterEdit.fetchCharacterEffect] Exception:', e);
        // ignore network errors
      } finally {
        setFetchedCharacterFor(charId);
      }
    })();
  }, [character?.id, character?.charId, character?._id, character?._remoteId, character?.remoteId, API_BASE, fetchedCharacterFor]);

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
  // compute defense display: base defense from class + floor(Dexterity / 10)
  const _dex = (character.abilities && character.abilities['Dexterity']) || 0;
  const _baseDef = (classMeta && (classMeta.defense || classMeta.defence)) || 0;
  const _defenseComputed = _baseDef + Math.floor(_dex / 10);

  return (
    <div className="char-edit-root">
      <div style={{display:'flex',gap:8,alignItems:'center',justifyContent: 'space-between'}}>
        <button className="char-back" onClick={() => nav('/')}>← Home</button>
        {!editMode && <button className="char-refresh" onClick={refreshMetadata}>Обновить</button>}
        <button className="edit-btn" onClick={()=> setEditMode(e=>!e)}>{editMode? '✖':'✍'}</button>
        {editMode && <button className="save-btn" onClick={saveToServer}>💾 Сохранить</button>}
      </div>
      <div className="card-wrap">
        <div className="char-card-visual">
          <div className="top-bars">
            <div className="defense" title={"Defense: " + (_baseDef || 0) + " + Dex/10"}>🛡{_defenseComputed}</div>
            <div className="hp-bar">
              <div className="hp-label"> ❤</div>
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
          <div className="avatar"><img src={`/profile_pictures/${character.picture || 'profile_picture_00.jpg'}`} alt="avatar"/></div>
          <div className="main-row">
            <div className="level">{character.level || 1}</div>
            <div className="class-icon" onClick={() => {
              if (classMeta) setAbilityModal({ title: classMeta.name || character.class, desc: classMeta.description || JSON.stringify(classMeta,null,2), extra:{ type: 'class' } });
              else setAbilityModal({ title: character.class || 'Класс', desc: 'Данных класса нет', extra:{ type: 'class' } });
            }}>
              {classIconUrl ? <img src={classIconUrl} alt={character.class} style={{width:48,height:48,objectFit:'cover',borderRadius:8}} /> : (character.class || '')}
            </div>
          </div>
          {editMode && (
            <div className="name-row">
              <button className="simple-btn" onClick={() => setPictureModalOpen(true)}>Изменить изображение</button>
            </div>
          )}
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
        <div className="char-card-notes">
          <details open={notesOpen} onToggle={(e:any)=> setNotesOpen(e.currentTarget.open)}>
            <summary className="section-header">Заметки  
                <button className="simple-btn" onClick={(e)=>{ e.stopPropagation(); e.preventDefault(); setNotesOpen(true); setNoteEditMode(true); }}>📝</button>
                </summary>
            <div style={{padding:8}}>
              {noteEditMode ? (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <textarea className="note-input" value={noteText||''} onChange={(e)=>setNoteText(e.target.value)} />
                  <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                    <button className="save-btn" onClick={saveNote}>Сохранить</button>
                    <button className="delete-btn" onClick={()=>{ setNoteEditMode(false); setNoteText(character.note || ''); }}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{whiteSpace:'pre-wrap',minHeight:48,background:'rgba(255,255,255,0.02)',padding:8,borderRadius:6}}>{character.note || 'Нет заметок'}</div>
                </div>
              )}
            </div>
          </details>
        </div>
        <div className="char-card-details">
          <div className="section abilities-section">
            <details className="abilities-details" >
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
                        <div
                          className="skill-group-header"
                          onClick={(e) => {
                            e.stopPropagation();
                            const desc = (typeMeta && (typeMeta.description || typeMeta.desc || typeMeta.info)) || 'Нет описания';
                            showToast(desc, { type: 'info' });
                          }}
                        >
                          {(typeMeta.icon||'')} {typeMeta.name || secKey} {learnedCount>0? `— ${learnedCount}`: ''}
                        </div>
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

      {pictureModalOpen && (
        <div className="ability-modal" onClick={() => setPictureModalOpen(false)}>
          <div className="ability-modal-content" onClick={(e)=>e.stopPropagation()} style={{width:520,maxWidth:'95%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Выберите изображение</strong>
              <button className="ability-modal-close" onClick={() => setPictureModalOpen(false)}>×</button>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <button className={`simple-btn`} onClick={()=>setPictureFilter('all')}>Все</button>
              <button className={`simple-btn`} onClick={()=>setPictureFilter('default')}>Default</button>
              <button className={`simple-btn`} onClick={()=>setPictureFilter('male')}>Male</button>
              <button className={`simple-btn`} onClick={()=>setPictureFilter('female')}>Female</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:8,maxHeight:360,overflow:'auto'}}>
              {pictures.filter(p => pictureFilter==='all' ? true : p.tag === pictureFilter).map((p:any)=> (
                <div key={p.file} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <img src={`/profile_pictures/${p.file}`} alt={p.file} style={{width:80,height:80,objectFit:'cover',borderRadius:8,border: (character.picture===p.file? '2px solid #6b5cff' : '1px solid #222') ,cursor:'pointer'}} onClick={async()=>{
                    // optimistic update
                    const next = {...character, picture: p.file};
                    setCharacter(next);
                    // persist to server when possible
                    const session = JSON.parse(localStorage.getItem('session') || '{}');
                    const userId = session?.tgId || session?.uid || session?.userId || null;
                    const remoteId = getRemoteId();
                    if (userId && remoteId) {
                      try {
                        const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}/picture`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ picture: p.file })
                        });
                        if (resp.ok) showToast('Изображение сохранено', { type: 'success' });
                        else { const txt = await resp.text(); showToast('Ошибка: '+(txt||resp.status), { type: 'error' }); }
                      } catch (e) { showToast('Ошибка соединения при сохранении изображения', { type: 'error' }); }
                    } else {
                      showToast('Изображение изменено локально (неавторизовано)', { type: 'info' });
                    }
                    setPictureModalOpen(false);
                  }} />
                  <div style={{fontSize:12}}>{p.file.replace('.jpg','')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
