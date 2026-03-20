import { useNavigate } from 'react-router-dom'

type Props = {
  name?: string
  picture?: string
  hp?: number
  hpMax?: number
  classNameStr?: string
  level?: number
}

export default function CharacterVisual({ name, picture, hp = 0, hpMax = 0, classNameStr, level }: Props) {
  const nav = useNavigate()
  const percent = hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : 0

  return (
    <div className="char-visual" style={{display:'flex',gap:12,alignItems:'center'}}>
      <div className="avatar" style={{width:84,height:84,background:'#222',borderRadius:8,overflow:'hidden'}}>
        <img src={picture || '/profile_pictures/profile_picture_00.jpg'} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
      </div>
      <div style={{flex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:'#fff'}}>{name}</div>
            <div style={{fontSize:12,color:'#bbb'}}>{classNameStr || ''} · Уровень {level || 1}</div>
          </div>
          <div>
            <button onClick={() => nav('edit')} style={{padding:'6px 10px'}}>Редактировать</button>
          </div>
        </div>
        <div style={{marginTop:8}}>
          <div style={{height:8,background:'#333',borderRadius:4,overflow:'hidden'}}>
            <div style={{width:`${percent}%`,height:'100%',background:'#e74c3c'}} />
          </div>
          <div style={{fontSize:12,color:'#ccc',marginTop:6}}>{hp ?? 0}/{hpMax ?? 0} HP</div>
        </div>
      </div>
    </div>
  )
}
