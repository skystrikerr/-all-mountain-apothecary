'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import Bottle from './Bottle'

// Splash-intro variant of the bottle scene: transparent background, gentle
// self-rotation, no controls — the overlay dismisses on click so drag
// interaction would never be reachable anyway.
function SpinningBottle() {
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5
  })
  return (
    <group ref={ref}>
      <Bottle position={[0, -0.85, 0]} />
    </group>
  )
}

export default function SplashBottleScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 5.4], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <directionalLight position={[-3, 2, -4]} intensity={0.5} color="#c88a66" />
      <Suspense fallback={null}>
        <SpinningBottle />
      </Suspense>
    </Canvas>
  )
}
