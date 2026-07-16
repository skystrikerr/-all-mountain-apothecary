'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import MountainBackdrop from './MountainBackdrop'

const SplashBottleScene = dynamic(() => import('./three/SplashBottleScene'), {
  ssr: false,
  loading: () => null,
})

const STORAGE_KEY = 'ama-splash-seen'

// Brand intro overlay. Shows once per browser session (sessionStorage),
// never on the server render (starts hidden and activates post-mount,
// same hydration-safe pattern as the cart), and is skipped entirely for
// users with prefers-reduced-motion.
export default function SplashScreen() {
  const [phase, setPhase] = useState('hidden') // hidden | showing | leaving

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY)) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      window.sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      return
    }
    setPhase('showing')
    // A little longer than the text-only version so the 3D bottle has time
    // to load its chunk and complete at least part of a rotation.
    const leaveTimer = setTimeout(() => setPhase('leaving'), 3200)
    const doneTimer = setTimeout(() => setPhase('hidden'), 4000)
    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  function dismiss() {
    setPhase('leaving')
    setTimeout(() => setPhase('hidden'), 700)
  }

  if (phase === 'hidden') return null

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-apothecary-forest cursor-pointer transition-opacity duration-700 ${
        phase === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <MountainBackdrop />
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="w-44 h-60 md:w-56 md:h-80 mb-2 animate-splash-in"
          style={{ animationDelay: '0.1s' }}
        >
          <SplashBottleScene />
        </div>
        <p
          className="text-apothecary-clay uppercase tracking-[0.35em] text-xs mb-4 animate-splash-in"
          style={{ animationDelay: '0.15s' }}
        >
          Est. 2019 · Pennsylvania
        </p>
        <h1
          className="text-apothecary-cream text-4xl md:text-6xl font-bold text-center px-8 animate-splash-in"
          style={{ animationDelay: '0.4s' }}
        >
          All Mountain Apothecary
        </h1>
        <div
          className="mt-6 h-px w-16 bg-apothecary-clay/60 animate-splash-in"
          style={{ animationDelay: '0.7s' }}
        />
        <p
          className="text-apothecary-cream/60 text-sm mt-6 animate-splash-in"
          style={{ animationDelay: '0.9s' }}
        >
          elixirs &amp; herbal remedies, sourced from the mountains
        </p>
      </div>
    </div>
  )
}
