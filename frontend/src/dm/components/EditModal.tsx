import { useState } from 'react';

export default function EditModal({ character, onClose, onSave }:{ character:any, onClose:()=>void, onSave:(arg:any)=>void }){
  const [form, setForm] = useState<any>({ ...character });

  function updateField(k:string, v:any){ setForm((f:any)=> ({ ...f, [k]: v })); }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60}} onClick={onClose}>
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
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button className="dm-btn" onClick={onClose}>Cancel</button>
            <button className="dm-btn active" onClick={()=> onSave(form)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
