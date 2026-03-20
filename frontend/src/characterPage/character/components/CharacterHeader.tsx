type Props = {
  name?: string
  avatar?: string
  hp?: number
  armor?: number
  lum?: number
}

export default function CharacterHeader({ name = 'Unnamed', avatar, hp, armor, lum }: Props) {
  return (
    <header className="character-header">
      {avatar && <img src={avatar} alt={name} className="character-avatar" />}
      <div>
        <h1>{name}</h1>
        <div className="character-meta">HP: {hp ?? '—'} • Armor: {armor ?? '—'} • Lum: {lum ?? '—'}</div>
      </div>
    </header>
  )
}
