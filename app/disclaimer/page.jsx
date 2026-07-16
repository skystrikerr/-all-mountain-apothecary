import { PortableText } from '@portabletext/react'
import { client } from '../../lib/sanity/client'
import { disclaimerPageQuery } from '../../lib/sanity/queries'
import { disclaimerPageDefaults } from '../../lib/content-defaults'

export const metadata = {
  title: 'Terms of Use & Disclaimer | All Mountain Apothecary',
  description:
    'Terms of use and health disclaimer for All Mountain Apothecary products and site content.',
}

export const revalidate = 60

export default async function DisclaimerPage() {
  const page = await client.fetch(disclaimerPageQuery)

  const title = page?.title || disclaimerPageDefaults.title
  const subtitle = page?.subtitle || disclaimerPageDefaults.subtitle

  return (
    <div className="py-16 px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-apothecary-forest mb-2">{title}</h1>
      <p className="text-gray-500 mb-10">{subtitle}</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        {page?.body?.length ? (
          <PortableText value={page.body} />
        ) : (
          disclaimerPageDefaults.bodyPlainText.map((paragraph, i) => <p key={i}>{paragraph}</p>)
        )}
      </div>

      <p className="text-xs text-gray-400 mt-12 border-t border-apothecary-moss/20 pt-6">
        These statements have not been evaluated by the Food and Drug
        Administration. These products are not intended to diagnose, treat,
        cure, or prevent any disease.
      </p>
    </div>
  )
}
