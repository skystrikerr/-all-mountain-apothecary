import { client } from '../../lib/sanity/client'
import { activeProductsQuery } from '../../lib/sanity/queries'
import ProductCard from '../../components/ProductCard'

export const metadata = {
  title: 'Shop | All Mountain Apothecary',
  description: 'Small-batch herbal elixirs, wild-harvested and organically grown from the mountains of Pennsylvania.',
}

export const revalidate = 60

export default async function ShopPage() {
  const products = await client.fetch(activeProductsQuery)

  return (
    <div className="py-16 px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-apothecary-forest text-center mb-2">
        The Elixir Line
      </h1>
      <p className="text-gray-500 text-center mb-12">
        Small-batch, wild-harvested, and organically grown botanicals.
      </p>

      {products.length === 0 ? (
        <p className="text-center text-gray-500">
          No products yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
