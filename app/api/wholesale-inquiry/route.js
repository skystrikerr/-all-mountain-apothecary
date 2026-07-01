import { NextResponse } from 'next/server'

export async function POST(request) {
  const { shopName, email, message } = await request.json()

  if (!shopName || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Without RESEND_API_KEY configured, log instead of erroring so the form
  // still works end-to-end during development. Wire up a real inbox once
  // WHOLESALE_NOTIFY_EMAIL + RESEND_API_KEY are set.
  if (!process.env.RESEND_API_KEY || !process.env.WHOLESALE_NOTIFY_EMAIL) {
    console.log('Wholesale inquiry (email not configured):', { shopName, email, message })
    return NextResponse.json({ ok: true })
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'All Mountain Apothecary <wholesale@allmountainapothecary.com>',
    to: process.env.WHOLESALE_NOTIFY_EMAIL,
    reply_to: email,
    subject: `Wholesale inquiry: ${shopName}`,
    text: `Shop: ${shopName}\nEmail: ${email}\n\n${message || '(no message)'}`,
  })

  return NextResponse.json({ ok: true })
}
