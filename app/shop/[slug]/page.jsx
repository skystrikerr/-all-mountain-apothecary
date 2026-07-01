import { notFound } from 'next/navigation'
import Image from 'next/image'
import { PortableText } from '@portabletext/react'
import { client } from '../../../lib/sanity/client'
import { productBySlugQuery, productSlugsQuery } from '../../../lib/sanity/queries'
import { urlFor } from '../../../lib/sanity/image'
import AddToCartButton from '../../../components/AddToCartButton'
import SupplementDisclaimer from '../../../components/SupplementDisclaimer'

export const revalidate = 60

export async function generateStaticParams() {
  const slugs = await client.fetch(productSlugsQuery)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await client.fetch(productBySlugQuery, { slug })
  if (!product) return {}

  const title = product.seo?.metaTitle || `${product.name} | All Mountain Apothecary`
  const description = product.seo?.metaDescription || product.tagline
  const ogImage = product.seo?.ogImage || product.images?.[0]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [urlFor(ogImage).width(1200).height(630).url()] : [],
    },
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await client.fetch(productBySlugQuery, { slug })

  if (!product) notFound()

  const mainImage = product.images?.[0]

  return (
    <div className="py-16 px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="aspect-square relative rounded-2xl overflow-hidden bg-apothecary-moss/10">
        {mainImage ? (
          <Image
            src={urlFor(mainImage).width(800).height(800).fit('crop').url()}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🌿</div>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-apothecary-clay font-semibold mb-2">
          {product.category}
        </p>
        <h1 className="text-3xl font-bold text-apothecary-forest mb-2">{product.name}</h1>
        {product.tagline && (
          <p className="text-gray-500 mb-6">{product.tagline}</p>
        )}

        <p className="text-2xl font-semibold text-apothecary-forest mb-6">
          ${product.retailPrice}
        </p>

        <AddToCartButton
          product={{
            slug: product.slug,
            name: product.name,
            image: mainImage,
            retailPrice: product.retailPrice,
          }}
        />

        {product.description && (
          <div className="prose prose-sm max-w-none mt-8 text-gray-700">
            <PortableText value={product.description} />
          </div>
        )}

        {product.botanicals?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-apothecary-forest mb-3">
              Key Botanicals
            </h2>
            <ul className="space-y-1">
              {product.botanicals.map((b) => (
                <li key={b.name} className="text-sm text-gray-700">
                  <span className="font-medium">{b.name}</span>
                  {b.note ? <span className="text-gray-500"> — {b.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-4 mt-8 text-sm border-t border-apothecary-moss/20 pt-6">
          {product.volume && (
            <div>
              <dt className="text-gray-400 uppercase text-xs tracking-wide">Volume</dt>
              <dd className="text-apothecary-forest">{product.volume}</dd>
            </div>
          )}
          {product.baseInfo && (
            <div>
              <dt className="text-gray-400 uppercase text-xs tracking-wide">Base</dt>
              <dd className="text-apothecary-forest">{product.baseInfo}</dd>
            </div>
          )}
          {product.shelfLife && (
            <div>
              <dt className="text-gray-400 uppercase text-xs tracking-wide">Shelf Life</dt>
              <dd className="text-apothecary-forest">{product.shelfLife}</dd>
            </div>
          )}
          {product.casePackSize && (
            <div>
              <dt className="text-gray-400 uppercase text-xs tracking-wide">Case Pack</dt>
              <dd className="text-apothecary-forest">{product.casePackSize} units</dd>
            </div>
          )}
        </dl>

        <SupplementDisclaimer />
      </div>
    </div>
  )
}
