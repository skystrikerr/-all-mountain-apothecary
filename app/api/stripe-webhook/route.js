import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'

export async function POST(request) {
  // Signature verification requires the raw, unparsed body — reading it as
  // text (not request.json()) before any parsing is what makes this work.
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    // v1: log for now. Stripe's built-in Checkout receipt email covers
    // customer-facing confirmation — a custom order-management flow is
    // explicitly out of scope for v1 (see plan).
    console.log('Order completed:', session.id, session.customer_details?.email)
  }

  return NextResponse.json({ received: true })
}
