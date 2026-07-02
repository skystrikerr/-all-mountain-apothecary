// Fallback copy used both as page defaults (so nothing looks broken before
// Sanity singletons are seeded/edited) and as the initial seed content —
// keeping one source avoids the two drifting out of sync.

export const homePageDefaults = {
  heroEyebrow: 'All Natural Remedies',
  heroHeadline: 'Handcrafted Elixirs & Herbs',
  heroSubtext:
    'Sourced from the heart of the mountains. Pure, potent, and mindfully crafted to restore natural balance to your body and spirit.',
  heroCtaText: 'Explore the Collection',
  featuredHeading: 'Featured Elixirs',
}

export const ourStoryPageDefaults = {
  title: 'Our Story',
  subtitle: 'Roots in the mountains of Pennsylvania.',
  bodyPlainText: [
    'All Mountain Apothecary began as a single woodstove operation in the Appalachian ridge of north-central Pennsylvania. What started as tinctures brewed for neighbors — for winter colds, sleepless nights, and tired joints — became a small-batch apothecary serving customers across the Mid-Atlantic.',
    'Every elixir we make is rooted in three commitments: ingredients we can trace to a forest, a farm, or a field; recipes built on traditional Western herbal practice, not trends; and a craft process that stays small enough to honor each batch.',
    'We are not a mass-market wellness brand. We are a working apothecary, built by hand and sold by hand.',
  ],
  stats: [
    { value: '2019', label: 'Founded · Pennsylvania Ridge' },
    { value: '12', label: 'Core Elixirs in Production' },
    { value: '<200', label: 'Bottles per Batch, Every Time' },
  ],
}

export const wholesalePageDefaults = {
  title: 'Wholesale',
  subtitle:
    'Straightforward terms designed for boutique grocers, apothecaries, and wellness shops — no slotting fees, no minimums that punish small orders.',
  terms: [
    { label: 'Minimum Order', value: '$300 wholesale · ~9 units mix-and-match' },
    { label: 'Case Pack', value: '12 units per SKU, but mixed cases accepted on first order' },
    { label: 'Lead Time', value: '10 business days from PO to ship' },
    { label: 'Shipping', value: 'Flat $18 ground; free over $600 wholesale' },
    { label: 'Payment', value: 'Net 30 on approved credit; credit card anytime' },
    { label: 'Return Policy', value: 'Full credit on damaged; 50% on slow-movers within 90 days' },
    { label: 'Co-Marketing', value: 'Free 5-copy shelf talkers + tasting cards per SKU on first order' },
    { label: 'Territory', value: 'No exclusivity, but we will not oversaturate a single neighborhood' },
  ],
  contactHeading: 'Get in touch',
  contactBody:
    "Reply with your shop name and target SKUs — we'll send a line sheet and a credit application.",
}
