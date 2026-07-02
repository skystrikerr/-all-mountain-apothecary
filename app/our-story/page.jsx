import { PortableText } from '@portabletext/react'
import { client } from '../../lib/sanity/client'
import { ourStoryPageQuery } from '../../lib/sanity/queries'
import { ourStoryPageDefaults } from '../../lib/content-defaults'

export const metadata = {
  title: 'Our Story | All Mountain Apothecary',
  description:
    'Roots in the mountains of Pennsylvania — how All Mountain Apothecary began as a single woodstove operation in the Appalachian ridge.',
}

export const revalidate = 60

export default async function OurStoryPage() {
  const page = await client.fetch(ourStoryPageQuery)

  const title = page?.title || ourStoryPageDefaults.title
  const subtitle = page?.subtitle || ourStoryPageDefaults.subtitle
  const stats = page?.stats?.length ? page.stats : ourStoryPageDefaults.stats

  return (
    <div className="py-16 px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-apothecary-forest mb-2">{title}</h1>
      <p className="text-gray-500 mb-10">{subtitle}</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        {page?.body?.length ? (
          <PortableText value={page.body} />
        ) : (
          ourStoryPageDefaults.bodyPlainText.map((paragraph, i) => <p key={i}>{paragraph}</p>)
        )}
      </div>

      <dl className="grid grid-cols-3 gap-6 mt-12 border-t border-apothecary-moss/20 pt-8 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-3xl font-bold text-apothecary-forest">{stat.value}</dt>
            <dd className="text-xs uppercase tracking-wide text-gray-500 mt-1">{stat.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
