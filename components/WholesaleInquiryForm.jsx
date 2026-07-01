'use client'

import { useState } from 'react'

export default function WholesaleInquiryForm() {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')

    const form = new FormData(e.target)
    const payload = Object.fromEntries(form.entries())

    try {
      const res = await fetch('/api/wholesale-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      e.target.reset()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-apothecary-forest bg-white rounded-2xl shadow-sm p-6">
        Thanks — we'll follow up by email shortly.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <label htmlFor="shopName" className="block text-sm font-medium text-apothecary-forest mb-1">
          Shop name
        </label>
        <input
          id="shopName"
          name="shopName"
          required
          className="w-full border border-apothecary-moss/30 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-apothecary-forest mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-apothecary-moss/30 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-apothecary-forest mb-1">
          Target SKUs / message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full border border-apothecary-moss/30 rounded-lg px-3 py-2"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-500">Something went wrong — please email us directly instead.</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  )
}
