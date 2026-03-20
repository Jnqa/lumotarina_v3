export default function ClassInfo({ classInfo }: { classInfo?: string }) {
  if (!classInfo) return null
  return (
    <section className="class-info">
      <h2>Класс</h2>
      <p>{classInfo}</p>
    </section>
  )
}
