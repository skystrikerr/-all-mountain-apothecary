'use client'

import dynamic from 'next/dynamic'

// next/dynamic with ssr:false must be called from a Client Component in
// the App Router — this thin wrapper is that boundary, kept separate from
// the homepage (a Server Component) which just renders this.
const BottleScene = dynamic(() => import('./BottleScene'), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-apothecary-cream/10 rounded-2xl" />,
})

export default function BottleSceneLoader() {
  return <BottleScene />
}
