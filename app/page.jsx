import Link from 'next/link'
import { client } from '../lib/sanity/client'
import { featuredProductsQuery, homePageQuery } from '../lib/sanity/queries'
import { homePageDefaults } from '../lib/content-defaults'
import ProductCard from '../components/ProductCard'

export const revalidate = 60

export default async function HomePage() {
  const [featured, page] = await Promise.all([
    client.fetch(featuredProductsQuery),
    client.fetch(homePageQuery),
  ])

  const content = { ...homePageDefaults, ...page }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-apothecary-forest text-apothecary-cream py-24 px-8 text-center">
        <p className="text-apothecary-clay uppercase tracking-widest text-sm mb-4">
          {content.heroEyebrow}
        </p>
        <h1 className="text-5xl font-bold mb-6 leading-tight">{content.heroHeadline}</h1>
        <p className="max-w-xl mx-auto text-apothecary-cream/80 text-lg mb-10">
          {content.heroSubtext}
        </p>
        <Link
          href="/shop"
          className="inline-block bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {content.heroCtaText}
        </Link>
      </section>

      {/* Featured Elixirs */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-apothecary-forest text-center mb-12">
          {content.featuredHeading}
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
