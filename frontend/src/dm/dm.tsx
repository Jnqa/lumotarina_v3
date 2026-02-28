import { useEffect, useState } from 'react';
import './dm.css';
import CharacterCard from './components/CharacterCard';
import EditModal from './components/EditModal';
import QuickModal from './components/QuickModal';

function resolveApiBase(){
  try{ if ((window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) return (window as any).__RUNTIME__.VITE_API_BASE; }catch(e){}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
}

export default function DM(){
  const [API_BASE] = useState<string>(resolveApiBase());
  const [allCharacters, setAllCharacters] = useState<Array<any>>([]);
  const [lobby, setLobby] = useState<Array<any>>(()=>{ try{ return JSON.parse(localStorage.getItem('dm_lobby')||'[]'); }catch(e){ return []; } });
  const [editing, setEditing] = useState<any|null>(null);
  const [showAvailable, setShowAvailable] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  // enrich lobby on mount: fetch full char data for items missing hp/level
  useEffect(()=>{
    (async ()=>{
      if (!lobby || lobby.length===0) return;
      let changed = false;
      const updated = await Promise.all(lobby.map(async (entry:any)=>{
        if ((entry.hp !== undefined && entry.hp !== null) || entry.level !== undefined) return entry;
        const full = await fetchFullCharacter(entry.ownerId, entry.charId).catch(()=>null);
        if (full) { changed = true; return { ...entry, ...full }; }
        return entry;
      }));
      if (changed) saveLobby(updated);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  useEffect(()=>{ loadAllCharacters(); }, [API_BASE]);

  async function loadAllCharacters(){
    try{
      const r = await fetch(`${API_BASE}/characters/list`);
      if (!r.ok) return setAllCharacters([]);
      const j = await r.json();
      setAllCharacters(Array.isArray(j)?j:[]);
    }catch(e){ console.warn('loadAllCharacters', e); setAllCharacters([]); }
  }

  async function fetchFullCharacter(ownerId:string, charId:string){
    try{
      const resp = await fetch(`${API_BASE}/characters/user/${encodeURIComponent(ownerId)}/${encodeURIComponent(charId)}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data;
    }catch(e){ console.warn('fetchFullCharacter', e); return null; }
  }

  function saveLobby(next:Array<any>){
    setLobby(next);
    try{ localStorage.setItem('dm_lobby', JSON.stringify(next)); }catch(e){}
  }

  // (removed unused toggleInLobby) - adding is handled inline where needed

  async function handleSaveEdited(updated:any){
    // optimistic local update
    setAllCharacters(prev => prev.map(p => (p.ownerId===updated.ownerId && p.charId===updated.charId) ? ({...p, ...updated}) : p));
    saveLobby(lobby.map(p => (p.ownerId===updated.ownerId && p.charId===updated.charId) ? ({...p, ...updated}) : p));
    setEditing(null);
    try{
      await fetch(`${API_BASE}/characters/user/${encodeURIComponent(updated.ownerId)}/${encodeURIComponent(updated.charId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
    }catch(e){ console.warn('save edited', e); }
  }

  return (
    <div className="dm-root">
      <header className="dm-header">
        <h2>DM Room</h2>
        <div className="dm-actions">
          <button className="dm-btn" onClick={() => window.history.back()}>← Назад</button>
          <button onClick={()=> setShowQuick(true)} className="dm-btn">✨</button>
          <button onClick={()=> setShowAvailable(true)} className="dm-btn">👥</button>
          <button onClick={()=> loadAllCharacters()} className="dm-btn">🔁</button>
        </div>
      </header>
      <main className="dm-container">
        <section className="dm-panel">
          <div className="quick-btn"></div>
          <div className="dm-grid">
            {lobby.map((c:any)=> (
              <CharacterCard key={`${c.ownerId}::${c.charId}`} entry={c} onEdit={() => setEditing(c)} onToggle={async ()=> { /* remove */ saveLobby(lobby.filter((x:any)=> !(x.ownerId===c.ownerId && x.charId===c.charId))); }} />
            ))}
            {(!lobby || lobby.length===0) && <div className="dm-empty">No characters selected</div>}
          </div>
        </section>
      </main>

      {showAvailable && (
        <div className="modal-overlay-x" onClick={() => setShowAvailable(false)}>
          <div className="modal-available" onClick={(e)=> e.stopPropagation()}>
            <h3>Available Characters</h3>
            <div style={{maxHeight:380,overflow:'auto',display:'flex',flexDirection:'column',gap:8}}>
              {allCharacters.map((c:any)=> {
                const inSet = !!lobby.find((x:any)=> x.ownerId===c.ownerId && x.charId===c.charId);
                return (
                  <div key={`${c.ownerId}::${c.charId}`} style={{display:'flex',alignItems:'center',gap:12,padding:8,borderRadius:8,background:'transparent'}}>
                    <img src={c.picture||''} alt="pic" style={{width:56,height:56,objectFit:'cover',borderRadius:8,background:'#222'}}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700}}>{c.name||c.title||'Unnamed'}</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{c.ownerDisplayName || c.ownerId}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className={inSet? 'dm-btn active' : 'dm-btn'} onClick={async ()=> {
                        if (inSet){
                          // remove from lobby
                          saveLobby(lobby.filter((x:any)=> !(x.ownerId===c.ownerId && x.charId===c.charId)));
                        } else {
                          const full = await fetchFullCharacter(c.ownerId, c.charId).catch(()=>null);
                          saveLobby([...lobby, full?{...c,...full}:c]);
                        }
                      }}>{inSet? 'Remove' : 'Add'}</button>
                      <button className="dm-btn" onClick={()=> setEditing(c)}>Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
              <button className="save-btn" onClick={()=> setShowAvailable(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showQuick && <QuickModal apiBase={API_BASE} onClose={() => setShowQuick(false)} />}
      {editing && <EditModal character={editing} onClose={() => setEditing(null)} onSave={handleSaveEdited} />}
    </div>
  );
}
