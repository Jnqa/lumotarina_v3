import CharacterPreview from '../../modules/CharacterPreview';
import ClassSkills from '../../modules/ClassSkills';
import '../dm.css'

export default function CharacterCard({ entry, onEdit }:{ entry:any, onEdit:()=>void, onToggle:()=>void }){
  const name = entry.name || entry.title || 'Unnamed';
  const hp = (entry.hp !== undefined && entry.hp !== null) ? entry.hp : (entry.hpMax !== undefined ? `${entry.hpMax}` : '-');
  const hpMax = (entry.hpMax !== undefined && entry.hpMax !== null) ? entry.hpMax : '-';
  const level = entry.level !== undefined ? entry.level : '-';
  const armor = entry.armor !== undefined ? entry.armor : '0';
  const charClass = entry.class !== undefined ? entry.class : '-';
  // const story = entry.story !== undefined ? entry.story : '';
  const race = entry.race !== undefined ? entry.race : '';
  const picture = entry.picture || entry.avatar || '';
  return (
    <div className="dm-card">
      <div style={{display:'flex',gap:10}}>
        <div style={{width:72,height:72,flex:'0 0 72px',borderRadius:8,overflow:'hidden',background:'#222'}}>
          {picture ? <img src={picture} alt="pic" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{width:'100%',height:'100%'}} />}
        </div>
        <div style={{flex:1}}>
          <h4 style={{margin:0}}>{name}</h4>
          <div style={{marginTop:8,display:'flex',gap:12,alignItems:'center'}}>
            <div>🛡<strong>{armor}</strong></div>
            <div>💚<span className="dm-hp">{hp}/{hpMax}</span></div>
            <div><strong>{charClass}({level})</strong></div>
            <div><strong>{race}</strong></div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button className="dm-btn" onClick={onEdit}>⚙</button>
        </div>
    </div>
    <div>
        <div>
          <details style={{marginTop:8}} className="abilities-details">
            <summary className='summary-btn'>Навыки и способности</summary>
            <div style={{marginTop:8}}>
              <div className="abilities-map" style={{marginBottom:8}}>
                <CharacterPreview userId={entry.ownerId} charId={entry.charId || entry.id} />
              </div>
              <details className="abilities-details">
                <summary className='summary-btn'>Навыки</summary>
                    <div className="skills-map">
                        <ClassSkills CharacterID={{ userId: entry.ownerId, characterId: entry.charId || entry.id }} />
                    </div>
              </details>
            </div>
          </details>
        </div>
        
      </div>
    </div>
  );
}
