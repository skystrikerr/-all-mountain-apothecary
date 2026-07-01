import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'
import { serverClient } from '../../../lib/sanity/serverClient'
import { urlFor } from '../../../lib/sanity/image'

export async function POST(request) {
  const { items } = await request.json()

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const slugs = items.map((item) => item.slug)

  // Re-fetch every product server-side, from the non-CDN client, so the
  // price charged always matches what's live in Sanity right now — the
  // client's cart is display-only and is never trusted for pricing.
  const products = await serverClient.fetch(
    `*[_type == "product" && slug.current in $slugs && isActive == true]{
      "slug": slug.current, name, retailPrice, images
    }`,
    { slugs }
  )

  const productsBySlug = Object.fromEntries(products.map((p) => [p.slug, p]))

  const line_items = []
  for (const item of items) {
    const product = productsBySlug[item.slug]
    const quantity = Number(item.quantity)

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: `Invalid item in cart: ${item.slug}` },
        { status: 400 }
      )
    }

    line_items.push({
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(product.retailPrice * 100),
        product_data: {
          name: product.name,
          images: product.images?.[0]
            ? [urlFor(product.images[0]).width(600).height(600).fit('crop').url()]
            : [],
        },
      },
    })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  // STRIPE_SHIPPING_RATE_ID references a Shipping Rate created in the
  // Stripe Dashboard (Settings > Shipping). Optional until that's set up.
  const shipping_options = process.env.STRIPE_SHIPPING_RATE_ID
    ? [{ shipping_rate: process.env.STRIPE_SHIPPING_RATE_ID }]
    : undefined

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    automatic_tax: { enabled: true },
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options,
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout/cancel`,
  })

  return NextResponse.json({ url: session.url })
}
