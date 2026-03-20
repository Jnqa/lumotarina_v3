type Stat = { name: string; value: number }

export default function CharacterStats({ stats }: { stats?: Stat[] }) {
  if (!stats || stats.length === 0) return null
  return (
    <aside className="character-stats">
      <h2>Характеристики</h2>
      <ul>
        {stats.map(s => (
          <li key={s.name}>{s.name}: {s.value}</li>
        ))}
      </ul>
    </aside>
  )
}
