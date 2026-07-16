'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ama-age-verified'

// 18+ age verification popup. Blocks the page until confirmed; the answer
// persists in localStorage so returning visitors aren't asked again.
// Starts hidden and activates post-mount (hydration-safe, same pattern as
// the splash). Sits at z-40 — below the splash intro (z-50), so on a first
// visit the splash plays first and the gate is revealed underneath it.
export default function AgeGate() {
  const [open, setOpen] = useState(false)
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return
    } catch {
      // storage unavailable — still show the gate, it just won't persist
    }
    setOpen(true)
  }, [])

  function confirm() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore — gate simply reappears next visit
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-apothecary-forest/80 backdrop-blur-sm px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-heading"
    >
      <div className="bg-apothecary-cream rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-splash-in">
        <p className="text-apothecary-clay uppercase tracking-[0.3em] text-xs mb-3">
          All Mountain Apothecary
        </p>
        <h2
          id="age-gate-heading"
          className="text-2xl font-bold text-apothecary-forest mb-3"
        >
          Are you 18 or older?
        </h2>

        {declined ? (
          <p className="text-gray-600 text-sm mb-6">
            Sorry — you must be 18 or older to browse our products. Come back
            and see us when you are.
          </p>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-8">
              Our herbal elixirs are intended for adults. You must be 18 or
              older to enter this site.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={confirm}
                className="bg-apothecary-forest text-apothecary-cream px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Yes, I&apos;m 18 or older
              </button>
              <button
                onClick={() => setDeclined(true)}
                className="border border-apothecary-forest/30 text-apothecary-forest px-8 py-3 rounded-full text-sm font-semibold hover:bg-apothecary-forest/5 transition-colors"
              >
                No, I&apos;m not
              </button>
            </div>
          </>
        )}

        <p className="text-[11px] text-gray-400 mt-6">
          These statements have not been evaluated by the FDA. Products are
          not intended to diagnose, treat, cure, or prevent any disease.
        </p>
      </div>
    </div>
  )
}
