import Link from 'next/link'
import { client } from '../lib/sanity/client'
import { featuredProductsQuery, homePageQuery } from '../lib/sanity/queries'
import { homePageDefaults } from '../lib/content-defaults'
import ProductCard from '../components/ProductCard'
import BottleSceneLoader from '../components/three/BottleSceneLoader'
import MountainBackdrop from '../components/MountainBackdrop'
import Reveal from '../components/Reveal'

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
      <section className="relative overflow-hidden bg-apothecary-forest text-apothecary-cream py-16 md:py-24 px-8">
        <MountainBackdrop />
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <p
              className="text-apothecary-clay uppercase tracking-widest text-sm mb-4 animate-fade-up"
              style={{ animationDelay: '0.1s' }}
            >
              {content.heroEyebrow}
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-up"
              style={{ animationDelay: '0.25s' }}
            >
              {content.heroHeadline}
            </h1>
            <p
              className="max-w-xl mx-auto md:mx-0 text-apothecary-cream/80 text-lg mb-10 animate-fade-up"
              style={{ animationDelay: '0.4s' }}
            >
              {content.heroSubtext}
            </p>
            <Link
              href="/shop"
              className="inline-block bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity animate-fade-up"
              style={{ animationDelay: '0.55s' }}
            >
              {content.heroCtaText}
            </Link>
          </div>

          <div className="h-72 md:h-96 order-first md:order-last">
            <BottleSceneLoader />
          </div>
        </div>
      </section>

      {/* Featured Elixirs */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <Reveal>
          <h2 className="text-2xl font-semibold text-apothecary-forest text-center mb-12">
            {content.featuredHeading}
          </h2>
        </Reveal>

        {featured.length === 0 ? (
          <Reveal>
            <div className="text-center">
              <p className="text-gray-500 mb-8">
                The full line is on its way — check back soon.
              </p>
              <Link href="/shop" className="text-apothecary-clay font-semibold hover:underline">
                Browse the shop →
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {featured.map((product, i) => (
              <Reveal key={product._id} delay={i * 130} className="h-full">
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
