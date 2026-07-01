import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="bg-apothecary-forest text-apothecary-cream px-8 py-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-semibold tracking-wide">
        All Mountain Apothecary
      </Link>
      <div className="flex gap-8 text-sm">
        <Link href="/shop" className="hover:text-apothecary-clay transition-colors">
          Shop
        </Link>
        <Link href="/our-story" className="hover:text-apothecary-clay transition-colors">
          Our Story
        </Link>
        <Link href="/wholesale" className="hover:text-apothecary-clay transition-colors">
          Wholesale
        </Link>
        <Link href="/cart" className="hover:text-apothecary-clay transition-colors">
          Cart
        </Link>
      </div>
    </nav>
  )
}
