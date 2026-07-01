import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'

export async function GET(request) {
  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  })

  return NextResponse.json({
    status: session.payment_status,
    email: session.customer_details?.email,
    amountTotal: session.amount_total,
    lineItems: session.line_items?.data.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      amountTotal: li.amount_total,
    })),
  })
}
