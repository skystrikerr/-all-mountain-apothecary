import WholesaleInquiryForm from '../../components/WholesaleInquiryForm'

export const metadata = {
  title: 'Wholesale | All Mountain Apothecary',
  description:
    'Straightforward wholesale terms for boutique grocers, apothecaries, and wellness shops. No slotting fees, no minimums that punish small orders.',
}

const terms = [
  { label: 'Minimum Order', value: '$300 wholesale · ~9 units mix-and-match' },
  { label: 'Case Pack', value: '12 units per SKU, but mixed cases accepted on first order' },
  { label: 'Lead Time', value: '10 business days from PO to ship' },
  { label: 'Shipping', value: 'Flat $18 ground; free over $600 wholesale' },
  { label: 'Payment', value: 'Net 30 on approved credit; credit card anytime' },
  { label: 'Return Policy', value: 'Full credit on damaged; 50% on slow-movers within 90 days' },
  { label: 'Co-Marketing', value: 'Free 5-copy shelf talkers + tasting cards per SKU on first order' },
  { label: 'Territory', value: 'No exclusivity, but we will not oversaturate a single neighborhood' },
]

export default function WholesalePage() {
  return (
    <div className="py-16 px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-apothecary-forest mb-2">Wholesale</h1>
      <p className="text-gray-500 mb-12">
        Straightforward terms designed for boutique grocers, apothecaries,
        and wellness shops — no slotting fees, no minimums that punish small
        orders.
      </p>

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
        Get in touch
      </h2>
      <p className="text-gray-500 mb-6">
        Reply with your shop name and target SKUs — we'll send a line sheet
        and a credit application.
      </p>

      <WholesaleInquiryForm />
    </div>
  )
}
