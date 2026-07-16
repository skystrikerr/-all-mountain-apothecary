'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import Bottle from './Bottle'

export default function BottleScene() {
  return (
    <div className="w-full h-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#c88a66" />

        <Suspense fallback={null}>
          {/* Slightly shrunk/lowered so the taller dropper cap stays in frame */}
          <Bottle position={[0, -0.5, 0]} scale={0.92} />
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.4}
            scale={4}
            blur={2.5}
            far={2}
          />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  )
}
