// removed unused React import (using automatic JSX runtime)

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export default function Button({ variant = 'primary', children, ...rest }: Props) {
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  )
}
