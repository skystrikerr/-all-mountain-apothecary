export const metadata = {
  title: 'Our Story | All Mountain Apothecary',
  description:
    'Roots in the mountains of Pennsylvania — how All Mountain Apothecary began as a single woodstove operation in the Appalachian ridge.',
}

export default function OurStoryPage() {
  return (
    <div className="py-16 px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-apothecary-forest mb-2">Our Story</h1>
      <p className="text-gray-500 mb-10">Roots in the mountains of Pennsylvania.</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          All Mountain Apothecary began as a single woodstove operation in the
          Appalachian ridge of north-central Pennsylvania. What started as
          tinctures brewed for neighbors — for winter colds, sleepless
          nights, and tired joints — became a small-batch apothecary serving
          customers across the Mid-Atlantic.
        </p>
        <p>
          Every elixir we make is rooted in three commitments: ingredients we
          can trace to a forest, a farm, or a field; recipes built on
          traditional Western herbal practice, not trends; and a craft
          process that stays small enough to honor each batch.
        </p>
        <p>
          We are not a mass-market wellness brand. We are a working
          apothecary, built by hand and sold by hand.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-6 mt-12 border-t border-apothecary-moss/20 pt-8 text-center">
        <div>
          <dt className="text-3xl font-bold text-apothecary-forest">2019</dt>
          <dd className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Founded · Pennsylvania Ridge
          </dd>
        </div>
        <div>
          <dt className="text-3xl font-bold text-apothecary-forest">12</dt>
          <dd className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Core Elixirs in Production
          </dd>
        </div>
        <div>
          <dt className="text-3xl font-bold text-apothecary-forest">&lt;200</dt>
          <dd className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Bottles per Batch, Every Time
          </dd>
        </div>
      </dl>
    </div>
  )
}
