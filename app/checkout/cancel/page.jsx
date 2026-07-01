import Link from 'next/link'

export const metadata = {
  title: 'Checkout Cancelled | All Mountain Apothecary',
}

export default function CheckoutCancelPage() {
  return (
    <div className="py-20 px-8 max-w-2xl mx-auto text-center">
      <h1 className="text-2xl font-bold text-apothecary-forest mb-4">
        Checkout cancelled
      </h1>
      <p className="text-gray-500 mb-8">
        No charge was made. Your cart is still here whenever you're ready.
      </p>
      <Link href="/cart" className="text-apothecary-clay font-semibold hover:underline">
        Return to cart →
      </Link>
    </div>
  )
}
