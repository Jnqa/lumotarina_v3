import { useEffect, useState } from 'react';

export default function QuickModal({ apiBase, onClose }:{ apiBase:string, onClose:()=>void }){
  const [tab, setTab] = useState<'actions'|'tea'>('actions');
  const [teaData, setTeaData] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRoll, setLastRoll] = useState<{tableId:string, roll:number, effect:any}|null>(null);

  useEffect(()=>{
    if (tab === 'tea') loadTea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadTea(){
    setLoading(true);
    try{
      const r = await fetch(`${apiBase}/characters/tea`);
      if (!r.ok) { setTeaData(null); setLoading(false); return; }
      const j = await r.json();
      setTeaData(j);
    }catch(e){ console.warn('loadTea', e); setTeaData(null); }
    setLoading(false);
  }

  function rollDice(dice:string){
    const m = String(dice||'d20').match(/d(\d+)/i);
    const sides = m ? Number(m[1]) : 20;
    return Math.floor(Math.random()*sides) + 1;
  }

  function onRollTable(table:any){
    const r = rollDice(table.dice || 'd20');
    const eff = (table.effects || []).find((e:any)=> Number(e.roll) === Number(r)) || null;
    setLastRoll({ tableId: table.id, roll: r, effect: eff });
  }

  return (
    <div className="modal-overlay-x" onClick={onClose}>
      <div className="modal modal-available" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3>Quick Actions</h3>
          <div>
            <button className="dm-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button className={tab==='actions'? 'dm-btn active':'dm-btn'} onClick={()=>setTab('actions')}>Действия</button>
          <button className={tab==='tea'? 'dm-btn active':'dm-btn'} onClick={()=>setTab('tea')}>Чай</button>
        </div>

        <div style={{marginTop:12,maxHeight:420,overflow:'auto'}}>
          {tab === 'actions' && (
            <div>
              <p>Здесь можно добавить быстрые действия (heal everyone, damage, level up и т.д.).</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button className="dm-btn">Heal everyone</button>
                <button className="dm-btn">Damage everyone</button>
                <button className="dm-btn">Set full HP</button>
              </div>
            </div>
          )}

          {tab === 'tea' && (
            <div>
              {loading && <div>Loading...</div>}
              {!loading && !teaData && <div>No tea tables</div>}
              {!loading && teaData && Array.isArray(teaData.tables) && (
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {teaData.tables.map((t:any)=> (
                    <div key={t.id} style={{border:'1px solid rgba(255,255,255,0.04)',padding:10,borderRadius:8,background:'rgba(255,255,255,0.02)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontWeight:800}}>{t.name}</div>
                          <div style={{fontSize:12,color:'var(--muted)'}}>{t.type} • {t.dice}</div>
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <button className="dm-btn" onClick={()=> onRollTable(t)}>Roll {t.dice || 'd20'}</button>
                        </div>
                      </div>

                      <div style={{marginTop:8,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>
                        {Array.isArray(t.effects) && t.effects.map((e:any)=> (
                          <div key={String(e.roll)} style={{padding:8,borderRadius:6,background: (lastRoll && lastRoll.tableId===t.id && lastRoll.roll===Number(e.roll)) ? 'linear-gradient(90deg,#09302348,#07d18e7a)' : 'transparent',border: '1px solid rgba(255,255,255,0.03)'}}>
                            <div style={{fontWeight:700}}>#{e.roll} — {e.title || e.effect || ''}</div>
                            <div style={{fontSize:13,marginTop:6}}>{e.dice_effect || e.effect || ''}</div>
                            {e.roleplay_effect && <div style={{fontSize:12,marginTop:4,color:'var(--muted)'}}>{e.roleplay_effect}</div>}
                          </div>
                        ))}
                      </div>

                      {lastRoll && lastRoll.tableId===t.id && (
                        <div style={{marginTop:8,padding:8,borderRadius:6,background:'rgba(7,209,142,0.06)'}}>
                          <div style={{fontWeight:800}}>Roll: {lastRoll.roll}</div>
                          <div style={{marginTop:6}}>{lastRoll.effect ? (lastRoll.effect.title || lastRoll.effect.effect || lastRoll.effect.dice_effect) : 'No matching effect'}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
