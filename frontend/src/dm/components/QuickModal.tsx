import { useEffect, useState } from 'react';

export default function QuickModal({ apiBase, onClose, onCreateQuest }:{ apiBase:string, onClose:()=>void, onCreateQuest: (quest: { title: string; description: string; type: 'team' | 'private' }, character?: any) => void }){
  const [tab, setTab] = useState<'actions'|'tea'>('actions');
  const [teaData, setTeaData] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRoll] = useState<{tableId:string, roll:number, effect:any}|null>(null);
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [questForm, setQuestForm] = useState({ title: '', description: '', type: 'team' as 'team' | 'private' });

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

  async function handleCreateQuest() {
    if (!questForm.title.trim()) {
      alert('Введите название квеста');
      return;
    }
    onCreateQuest(questForm);
    setQuestForm({ title: '', description: '', type: 'team' });
    setShowCreateQuest(false);
  }


  return (
    <div className="modal-overlay-x" onClick={onClose}>
      {!showCreateQuest && (
        <div className="modal modal-available" onClick={e=>e.stopPropagation()}>
          <div className="modal-header">
            <h3>Быстрые действия</h3>
            <div>
              <button className="dm-btn close" onClick={onClose}>Закрыть</button>
            </div>
          </div>

          <div className='dm-tabs'>
            <button className={tab==='actions'? 'dm-tab active':'dm-tab'} onClick={()=>setTab('actions')}>Действия</button>
            <button className={tab==='tea'? 'dm-tab active':'dm-tab'} onClick={()=>setTab('tea')}>Чай</button>
          </div>

          <div style={{marginTop:12,overflow:'auto', borderRadius:6}}>
            {tab === 'actions' && (
              <div>
                <p>Действия:</p>
                <div className="dm-btn-group">
                  <button className="dm-btn-qm">Вылечить всех</button>
                  <button className="dm-btn-qm">Нанести урон всем</button>
                  <button className="dm-btn-qm">Установить полное HP</button>
                  <button className="dm-btn-qm" onClick={() => setShowCreateQuest(true)}>Создать квест для команды</button>
                </div>
              </div>
            )}

            {tab === 'tea' && (
              <div>
                {loading && <div>Loading...</div>}
                {!loading && !teaData && <div>No tea tables</div>}
                {!loading && teaData && Array.isArray(teaData.tables) && (
                  <div>
                    {teaData.tables.map((t:any)=> (
                      <div key={t.id}>
                        <div className='tea-table'>
                          <div>
                            <div className='tea-caption'>🍵 {t.name}</div>
                          </div>
                        </div>

                        <div>
                          {Array.isArray(t.effects) && t.effects.map((e:any)=> (
                            <div key={String(e.roll)}>
                              <div className="tea-1">🎲 {e.roll} — {e.title || e.effect || ''}</div>
                              <div className="tea-random">{e.dice_effect || e.effect || ''}</div>
                              {e.roleplay_effect && <div className="tea-number">{e.roleplay_effect}</div>}
                              {e.npc_effect && <div className="tea-npc">{e.npc_effect}</div>}
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
      )}

      {showCreateQuest && (
        <div className="modal-overlay-x" onClick={() => setShowCreateQuest(false)}>
          <div className="modal modal-available" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать квест</h3>
              <button className="dm-btn close" onClick={() => setShowCreateQuest(false)}>×</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <label>
                Название квеста
                <input
                  type="text"
                  value={questForm.title}
                  onChange={e => setQuestForm({ ...questForm, title: e.target.value })}
                  style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </label>
              <label>
                Описание
                <textarea
                  value={questForm.description}
                  onChange={e => setQuestForm({ ...questForm, description: e.target.value })}
                  rows={4}
                  style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </label>
              <label>
                Тип
                <select
                  value={questForm.type}
                  onChange={e => setQuestForm({ ...questForm, type: e.target.value as 'team' | 'private' })}
                  style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                >
                  <option value="team">Командный</option>
                  <option value="private">Личный</option>
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="dm-btn" onClick={() => setShowCreateQuest(false)}>Отмена</button>
                <button className="dm-btn" onClick={() => handleCreateQuest()}>Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
