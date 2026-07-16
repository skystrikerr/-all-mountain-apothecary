import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '../lib/sanity/image'

export default function ProductCard({ product }) {
  const image = product.images?.[0]

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="h-full bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-lg hover:-translate-y-1 transition-[box-shadow,transform] duration-300 text-center"
    >
      <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-apothecary-moss/10">
        {image ? (
          <Image
            src={urlFor(image).width(400).height(400).fit('crop').url()}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
        )}
      </div>
      <p className="text-xs uppercase tracking-wide text-apothecary-clay font-semibold">
        {product.category}
      </p>
      <h3 className="text-apothecary-forest font-semibold">{product.name}</h3>
      {product.tagline && (
        <p className="text-sm text-gray-500">{product.tagline}</p>
      )}
      <p className="mt-auto text-apothecary-forest font-semibold">
        ${product.retailPrice}
      </p>
    </Link>
  )
}
