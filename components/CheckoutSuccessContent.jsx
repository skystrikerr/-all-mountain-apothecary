'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from './CartContext'

export default function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { clearCart } = useCart()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/checkout-session?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setOrder(data)
          if (data.status === 'paid') clearCart()
        }
      })
      .catch(() => setError('Could not load order details.'))
    // clearCart identity is stable for the CartProvider's lifetime; omitting
    // it from deps avoids re-running this fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (!sessionId) {
    return (
      <div className="py-20 px-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-apothecary-forest mb-4">Order confirmed</h1>
        <Link href="/shop" className="text-apothecary-clay font-semibold hover:underline">
          Continue shopping →
        </Link>
      </div>
    )
  }

  return (
    <div className="py-20 px-8 max-w-2xl mx-auto text-center">
      <h1 className="text-2xl font-bold text-apothecary-forest mb-2">Thank you!</h1>
      <p className="text-gray-500 mb-8">Your order has been placed.</p>

      {error && <p className="text-sm text-red-500 mb-8">{error}</p>}

      {order && (
        <div className="text-left bg-white rounded-2xl shadow-sm p-6 mb-8">
          {order.email && (
            <p className="text-sm text-gray-500 mb-4">
              Confirmation sent to {order.email}
            </p>
          )}
          <ul className="divide-y divide-apothecary-moss/20">
            {order.lineItems?.map((li, i) => (
              <li key={i} className="py-3 flex justify-between text-sm">
                <span>
                  {li.description} × {li.quantity}
                </span>
                <span>${(li.amountTotal / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-4 mt-2 border-t border-apothecary-moss/20 font-semibold">
            <span>Total</span>
            <span>${(order.amountTotal / 100).toFixed(2)}</span>
          </div>
        </div>
      )}

      <Link href="/shop" className="text-apothecary-clay font-semibold hover:underline">
        Continue shopping →
      </Link>
    </div>
  )
}
