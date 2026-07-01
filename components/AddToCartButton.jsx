'use client'

import { useState } from 'react'
import { useCart } from './CartContext'

export default function AddToCartButton({ product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  function handleClick() {
    addItem(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full sm:w-auto bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
    >
      {added ? 'Added ✓' : 'Add to Cart'}
    </button>
  )
}
