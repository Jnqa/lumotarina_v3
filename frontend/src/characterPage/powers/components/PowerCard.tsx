// removed unused React import (using automatic JSX runtime)

type Props = {
  title: string
  description?: string
}

export default function PowerCard({ title, description }: Props) {
  return (
    <article className="power-card">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </article>
  )
}
