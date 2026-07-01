// Seeds the 6 products detailed in the wholesale pitch deck.
// Run once after connecting a real Sanity project:
//   1. Create a write token: manage.sanity.io > your project > API > Tokens ("Editor" permission)
//   2. SANITY_API_TOKEN=sk... node scripts/seed.mjs
//
// Products are created without images (isActive is left true, isFeatured
// set on 3 of them) — Studio will show a validation warning until photos
// are added, which is expected per "I'll add pics of products later."
import { createClient } from '@sanity/client'
import { projectId, dataset, apiVersion } from '../sanity/env.js'

const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error('Missing SANITY_API_TOKEN. Create a write token at manage.sanity.io and re-run:\n  SANITY_API_TOKEN=sk... node scripts/seed.mjs')
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })

const products = [
  {
    name: 'Ridge Reishi Daily',
    category: 'Daily Tonic',
    tagline: 'Adaptogenic baseline for stress and stamina.',
    botanicals: [{ name: 'Reishi mushroom' }, { name: 'Ashwagandha' }, { name: 'Tulsi' }],
    retailPrice: 48,
    wholesalePrice: 32,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Hollow Moon Sleep',
    category: 'Sleep',
    tagline: 'Quiet the mind and ease into deep rest.',
    botanicals: [{ name: 'Valerian' }, { name: 'Passionflower' }, { name: 'Skullcap' }],
    retailPrice: 52,
    wholesalePrice: 34,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: 'Immune Boost',
    category: 'Immune',
    tagline: 'Six wild-foraged immuno-boosting herbs, wild-foraged in western PA.',
    description: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'A sublingual immuno-boosting elixir blending six wild-foraged medicinal plants — elderberry, elder flower, pine pollen, chaga, reishi, and wild garlic. Extracted slow in organic cane alcohol, delivered under the tongue for fast absorption.',
          },
        ],
      },
    ],
    botanicals: [
      { name: 'Elderberry', note: 'Common cold, influenza, sinus pain, chronic fatigue' },
      { name: 'Elder Flower', note: 'Sinusitis, colds, flu, bronchitis' },
      { name: 'Pine Pollen', note: 'Immune stimulant, brain health, detoxification' },
      { name: 'Chaga Mushroom', note: 'Antioxidant, anti-inflammatory' },
      { name: 'Reishi Mushroom', note: 'Immune support, insulin sensitivity' },
      { name: 'Wild Garlic', note: 'Blood pressure, cholesterol, antibiotic properties' },
    ],
    volume: '2 fl oz',
    baseInfo: 'Organic cane alcohol',
    shelfLife: '3 years',
    casePackSize: 12,
    retailPrice: 46,
    wholesalePrice: 30,
    isFeatured: true,
    sortOrder: 3,
  },
  {
    name: 'Hearth Bitter',
    category: 'Digestion',
    tagline: 'Pre-meal bitter for digestion and appetite.',
    botanicals: [{ name: 'Gentian' }, { name: 'Burdock' }, { name: 'Orange peel' }],
    retailPrice: 40,
    wholesalePrice: 26,
    sortOrder: 4,
  },
  {
    name: 'Stillwater Calm',
    category: 'Calm',
    tagline: 'In-the-moment composure without drowsiness.',
    botanicals: [{ name: 'Lemon balm' }, { name: 'Milky oat' }, { name: 'Lavender' }],
    retailPrice: 46,
    wholesalePrice: 30,
    sortOrder: 5,
  },
  {
    name: 'Stovepipe Joint',
    category: 'Joint',
    tagline: 'Warming support for stiff, overworked joints.',
    botanicals: [{ name: "St. John's Wort" }, { name: 'Turmeric' }, { name: 'Cottonwood' }],
    retailPrice: 52,
    wholesalePrice: 34,
    sortOrder: 6,
  },
]

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

for (const product of products) {
  const doc = {
    _type: 'product',
    slug: { _type: 'slug', current: slugify(product.name) },
    isActive: true,
    volume: '2 fl oz',
    baseInfo: 'Organic cane alcohol',
    shelfLife: '3 years',
    casePackSize: 12,
    ...product,
  }
  const result = await client.createIfNotExists({ _id: `product-${doc.slug.current}`, ...doc })
  console.log(`Seeded: ${result.name}`)
}

console.log('\nDone. Add product photos in Studio — images are required before a product is fully valid.')
