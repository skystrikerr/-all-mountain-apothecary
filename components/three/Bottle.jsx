'use client'

// Procedural amber glass dropper bottle — no external 3D model needed.
// Matches the real product spec (2 fl oz amber glass, dropper cap) closely
// enough to read as "our bottle" until real product photography/scanning
// exists to build an exact model from.
// Rotation is handled by the parent scene's OrbitControls (autoRotate),
// not here — spinning it independently would fight user drag input.
export default function Bottle(props) {
  return (
    <group {...props}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 1.7, 48]} />
        <meshPhysicalMaterial
          color="#6b3a17"
          transmission={0.65}
          roughness={0.12}
          thickness={0.6}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Shoulder taper */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.55, 0.3, 48]} />
        <meshPhysicalMaterial
          color="#6b3a17"
          transmission={0.65}
          roughness={0.12}
          thickness={0.6}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.32, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.35, 32]} />
        <meshPhysicalMaterial
          color="#6b3a17"
          transmission={0.65}
          roughness={0.12}
          thickness={0.6}
          ior={1.5}
        />
      </mesh>

      {/* Dropper cap */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.25, 32]} />
        <meshStandardMaterial color="#1b3b2b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color="#1b3b2b" roughness={0.6} />
      </mesh>

      {/* Label */}
      <mesh position={[0, 0, 0.601]}>
        <planeGeometry args={[0.65, 0.85]} />
        <meshStandardMaterial color="#f9f6f0" roughness={0.9} />
      </mesh>
    </group>
  )
}
