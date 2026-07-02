import { client } from '../../lib/sanity/client'
import { wholesalePageQuery } from '../../lib/sanity/queries'
import { wholesalePageDefaults } from '../../lib/content-defaults'
import WholesaleInquiryForm from '../../components/WholesaleInquiryForm'

export const metadata = {
  title: 'Wholesale | All Mountain Apothecary',
  description:
    'Straightforward wholesale terms for boutique grocers, apothecaries, and wellness shops. No slotting fees, no minimums that punish small orders.',
}

export const revalidate = 60

export default async function WholesalePage() {
  const page = await client.fetch(wholesalePageQuery)
  const content = { ...wholesalePageDefaults, ...page }
  const terms = page?.terms?.length ? page.terms : wholesalePageDefaults.terms

  return (
    <div className="py-16 px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-apothecary-forest mb-2">{content.title}</h1>
      <p className="text-gray-500 mb-12">{content.subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        {terms.map((term) => (
          <div key={term.label} className="bg-white rounded-2xl shadow-sm p-5">
            <dt className="text-xs uppercase tracking-wide text-apothecary-clay font-semibold mb-1">
              {term.label}
            </dt>
            <dd className="text-sm text-gray-700">{term.value}</dd>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-apothecary-forest mb-4">
        {content.contactHeading}
      </h2>
      <p className="text-gray-500 mb-6">{content.contactBody}</p>

      <WholesaleInquiryForm />
    </div>
  )
}
