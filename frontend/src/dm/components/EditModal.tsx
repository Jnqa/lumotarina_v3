import { useState } from 'react';

export default function EditModal({ character, onClose, onSave, onCreateQuest }:{ character:any, onClose:()=>void, onSave:(arg:any)=>void, onCreateQuest: (quest: { title: string; description: string; type: 'team' | 'private' }, character?: any) => void }){
  const [form, setForm] = useState<any>({ ...character });
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [questForm, setQuestForm] = useState({ title: '', description: '', type: 'private' as 'team' | 'private' });

  function updateField(k:string, v:any){ setForm((f:any)=> ({ ...f, [k]: v })); }

  async function handleCreateQuest() {
    if (!questForm.title.trim()) {
      alert('Введите название квеста');
      return;
    }
    onCreateQuest(questForm, character);
    setQuestForm({ title: '', description: '', type: 'private' });
    setShowCreateQuest(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60}} onClick={onClose}>
      {!showCreateQuest && (
        <div style={{width:360,background:'#0d0d0d',padding:12,borderRadius:8}} onClick={(e)=>e.stopPropagation()}>
          <h3 style={{marginTop:0}}>Edit character</h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <label>Name<input value={form.name||''} onChange={e=>updateField('name', e.target.value)} className="inputStylized" /></label>
            <label>Level<input type="number" value={form.level||0} onChange={e=>updateField('level', Number(e.target.value))} className="inputStylized short" /></label>
            <label>HP<input type="number" value={form.hp||0} onChange={e=>updateField('hp', Number(e.target.value))} className="inputStylized short" /></label>
            <label>Status
              <select value={form.status||'alive'} onChange={e=>updateField('status', e.target.value)} className="selectStylized">
                <option value="alive">alive</option>
                <option value="dead">dead</option>
              </select>
            </label>
            <label>Ability Points<input type="number" value={form.abilityPoints||0} onChange={e=>updateField('abilityPoints', Number(e.target.value))} className="inputStylized short" /></label>
            <label>Skill Points<input type="number" value={form.skillPoints||0} onChange={e=>updateField('skillPoints', Number(e.target.value))} className="inputStylized short" /></label>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
              <button className="dm-btn" onClick={() => setShowCreateQuest(true)}>Создать квест</button>
              <div style={{display:'flex',gap:8}}>
                <button className="dm-btn" onClick={onClose}>Cancel</button>
                <button className="dm-btn active" onClick={()=> onSave(form)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateQuest && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:70}} onClick={() => setShowCreateQuest(false)}>
          <div style={{width:400,background:'#0d0d0d',padding:12,borderRadius:8}} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Создать приватный квест</h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <label>
                Название квеста
                <input
                  type="text"
                  value={questForm.title}
                  onChange={e => setQuestForm({ ...questForm, title: e.target.value })}
                  className="inputStylized"
                />
              </label>
              <label>
                Описание
                <textarea
                  value={questForm.description}
                  onChange={e => setQuestForm({ ...questForm, description: e.target.value })}
                  rows={4}
                  className="inputStylized"
                />
              </label>
              <label>
                Тип
                <select
                  value={questForm.type}
                  onChange={e => setQuestForm({ ...questForm, type: e.target.value as 'team' | 'private' })}
                  className="selectStylized"
                >
                  <option value="private">Личный</option>
                  <option value="team">Командный</option>
                </select>
              </label>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button className="dm-btn" onClick={() => setShowCreateQuest(false)}>Отмена</button>
                <button className="dm-btn active" onClick={() => handleCreateQuest()}>Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
