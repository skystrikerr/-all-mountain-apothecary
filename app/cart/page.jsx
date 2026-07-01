'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '../../components/CartContext'
import { urlFor } from '../../lib/sanity/image'

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart()
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState(null)

  async function handleCheckout() {
    setError(null)
    setCheckingOut(true)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ slug: item.slug, quantity: item.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setCheckingOut(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-20 px-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-apothecary-forest mb-4">Your cart is empty</h1>
        <Link href="/shop" className="text-apothecary-clay font-semibold hover:underline">
          Browse the shop →
        </Link>
      </div>
    )
  }

  return (
    <div className="py-16 px-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-apothecary-forest mb-8">Your Cart</h1>

      <ul className="divide-y divide-apothecary-moss/20">
        {items.map((item) => (
          <li key={item.slug} className="py-4 flex items-center gap-4">
            <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-apothecary-moss/10 flex-shrink-0">
              {item.image ? (
                <Image
                  src={urlFor(item.image).width(128).height(128).fit('crop').url()}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>
              )}
            </div>

            <div className="flex-1">
              <Link href={`/shop/${item.slug}`} className="font-semibold text-apothecary-forest hover:underline">
                {item.name}
              </Link>
              <p className="text-sm text-gray-500">${item.displayPrice} each</p>
            </div>

            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.slug, parseInt(e.target.value, 10) || 1)}
              className="w-16 border border-apothecary-moss/30 rounded-lg px-2 py-1 text-center"
            />

            <button
              onClick={() => removeItem(item.slug)}
              className="text-sm text-gray-400 hover:text-red-500"
              aria-label={`Remove ${item.name}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-apothecary-moss/20 pt-6">
        <span className="text-gray-500">Subtotal</span>
        <span className="text-xl font-semibold text-apothecary-forest">
          ${subtotal.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1">Tax and shipping calculated at checkout.</p>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={checkingOut}
        className="mt-6 w-full bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {checkingOut ? 'Redirecting to checkout…' : 'Checkout'}
      </button>
    </div>
  )
}
