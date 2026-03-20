// removed unused React import (using automatic JSX runtime)

type Props = {
  open?: boolean
  onClose?: () => void
  children?: React.ReactNode
}

export default function Modal({ open = false, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
