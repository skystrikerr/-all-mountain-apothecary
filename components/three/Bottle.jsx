'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

// Procedural amber glass dropper bottle modeled on the real Immune Boost
// product photo: dark amber 30ml glass, tall black ribbed dropper cap with
// rubber bulb, kraft paper wrap label. No external 3D asset needed.
// Rotation is handled by the parent scene (OrbitControls / useFrame),
// not here — spinning it independently would fight user drag input.

const GLASS = {
  color: '#7a3e14',
  transmission: 0.5,
  roughness: 0.15,
  thickness: 0.6,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.12,
}

// Kraft label drawn at runtime — text baked into a CanvasTexture so it
// wraps around the glass like the real paper label.
function useLabelTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 640
    const ctx = c.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, 0, 640)
    bg.addColorStop(0, '#c9a87c')
    bg.addColorStop(1, '#b99c6e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 512, 640)

    // subtle paper speckle
    ctx.fillStyle = 'rgba(90, 70, 40, 0.05)'
    for (let i = 0; i < 260; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 640, 2, 2)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // distressed black strip behind "ALL MOUNTAIN"
    ctx.fillStyle = '#1c1712'
    ctx.fillRect(36, 96, 440, 62)
    ctx.fillStyle = '#efe6d4'
    ctx.font = '600 40px Georgia, serif'
    ctx.letterSpacing = '10px'
    ctx.fillText('ALL MOUNTAIN', 260, 129)

    ctx.fillStyle = '#221a10'
    ctx.font = '700 58px Georgia, serif'
    ctx.letterSpacing = '6px'
    ctx.fillText('APOTHECARY', 258, 216)

    ctx.font = '700 40px Georgia, serif'
    ctx.letterSpacing = '4px'
    ctx.fillText('IMMUNE BOOST', 257, 330)

    // fine-print contents lines
    ctx.letterSpacing = '0px'
    ctx.fillStyle = '#3a2d1c'
    ctx.font = '13px Georgia, serif'
    ctx.fillText('CONTENTS: ELDERFLOWER 5ML, ELDERBERRY 5ML,', 256, 408)
    ctx.fillText('PINE POLLEN 5ML, GARLIC 5ML, CHAGA 5ML,', 256, 428)
    ctx.fillText('REISHI 5ML, PER 30ML', 256, 448)

    ctx.font = '11px Georgia, serif'
    ctx.fillText('KEEP BOTTLE TIGHTLY CAPPED · STORE IN A COOL, DRY SPOT', 256, 530)
    ctx.fillText('NOT INTENDED FOR MEDICINAL USE', 256, 556)

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }, [])
}

// Vertical knurling stripes for the ribbed cap collar.
function useRibTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 8
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 128, 8)
    ctx.fillStyle = '#ffffff'
    for (let x = 0; x < 128; x += 8) ctx.fillRect(x, 0, 4, 8)
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.set(6, 1)
    return tex
  }, [])
}

export default function Bottle(props) {
  const labelTex = useLabelTexture()
  const ribTex = useRibTexture()

  return (
    <group {...props}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.58, 0.6, 1.7, 48]} />
        <meshPhysicalMaterial {...GLASS} />
      </mesh>

      {/* Shoulder taper */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.58, 0.32, 48]} />
        <meshPhysicalMaterial {...GLASS} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.3, 32]} />
        <meshPhysicalMaterial {...GLASS} />
      </mesh>

      {/* Ribbed black dropper collar */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <cylinderGeometry args={[0.225, 0.225, 0.42, 48]} />
        <meshStandardMaterial
          color="#141414"
          roughness={0.55}
          bumpMap={ribTex}
          bumpScale={0.6}
        />
      </mesh>

      {/* Rubber dropper bulb */}
      <mesh position={[0, 1.98, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.19, 0.22, 32]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.13, 0]} castShadow>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.45} />
      </mesh>

      {/* Kraft label wrapped around the front of the body */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry
          args={[0.625, 0.625, 1.1, 48, 1, true, -1.25, 2.5]}
        />
        <meshStandardMaterial map={labelTex} roughness={0.9} />
      </mesh>
    </group>
  )
}
