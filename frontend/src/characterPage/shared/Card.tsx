// removed unused React import (using automatic JSX runtime)

type Props = {
  children?: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: Props) {
  return <div className={`card ${className}`}>{children}</div>
}
