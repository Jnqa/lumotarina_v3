export default function Backstory({ story }: { story?: string }) {
  if (!story) return null
  return (
    <div className="backstory">
      <h2>История персонажа</h2>
      <p>{story}</p>
    </div>
  )
}
