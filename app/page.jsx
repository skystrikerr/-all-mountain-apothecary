import Link from 'next/link'
import { client } from '../lib/sanity/client'
import { featuredProductsQuery } from '../lib/sanity/queries'
import ProductCard from '../components/ProductCard'

export const revalidate = 60

export default async function HomePage() {
  const featured = await client.fetch(featuredProductsQuery)

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-apothecary-forest text-apothecary-cream py-24 px-8 text-center">
        <p className="text-apothecary-clay uppercase tracking-widest text-sm mb-4">
          All Natural Remedies
        </p>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Handcrafted Elixirs &amp; Herbs
        </h1>
        <p className="max-w-xl mx-auto text-apothecary-cream/80 text-lg mb-10">
          Sourced from the heart of the mountains. Pure, potent, and mindfully
          crafted to restore natural balance to your body and spirit.
        </p>
        <Link
          href="/shop"
          className="inline-block bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Explore the Collection
        </Link>
      </section>

      {/* Featured Elixirs */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-apothecary-forest text-center mb-12">
          Featured Elixirs
        </h2>

        {featured.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-500 mb-8">
              The full line is on its way — check back soon.
            </p>
            <Link href="/shop" className="text-apothecary-clay font-semibold hover:underline">
              Browse the shop →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {featured.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
