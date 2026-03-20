// removed unused React import (using automatic JSX runtime)

type Props = {
  name: string
  qty?: number
}

export default function InventoryItem({ name, qty = 1 }: Props) {
  return (
    <div className="inventory-item">
      <span className="item-name">{name}</span>
      <span className="item-qty">×{qty}</span>
    </div>
  )
}
