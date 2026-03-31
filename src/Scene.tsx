import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import * as THREE from 'three'

// ─── CAMERA RIG ───────────────────────────────────────────────────────────────
const CAM_POSITIONS = [
  new THREE.Vector3(  0,    0,    8.5),
  new THREE.Vector3(-5.5,  1.8,  6.5),
  new THREE.Vector3( 5.0, -2.2,  7.0),
  new THREE.Vector3( 0,   -3.5, 12.0),
]

const CAM_TARGETS = [
  new THREE.Vector3(0,  0,    0),
  new THREE.Vector3(0,  0.4,  0),
  new THREE.Vector3(0, -0.5,  0),
  new THREE.Vector3(0, -1.0,  0),
]

function CameraRig({ scrollY }: { scrollY: React.MutableRefObject<number> }) {
  const posTarget  = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())
  const curLook    = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    const p   = scrollY.current * (CAM_POSITIONS.length - 1)
    const idx = Math.min(Math.floor(p), CAM_POSITIONS.length - 2)
    const frac = p - idx
    posTarget.current.copy(CAM_POSITIONS[idx]).lerp(CAM_POSITIONS[idx + 1], frac)
    lookTarget.current.copy(CAM_TARGETS[idx]).lerp(CAM_TARGETS[idx + 1], frac)
    camera.position.lerp(posTarget.current, 0.05)
    curLook.current.lerp(lookTarget.current, 0.05)
    camera.lookAt(curLook.current)
  })
  return null
}

// ─── SCENE ROOT ───────────────────────────────────────────────────────────────
export default function Scene({ scrollY }: { scrollY: React.MutableRefObject<number> }) {
  return (
    <>
      <CameraRig scrollY={scrollY} />

      <EffectComposer>
        <Bloom mipmapBlur intensity={1.4} luminanceThreshold={0.3} luminanceSmoothing={0.85} />
        <ChromaticAberration
          offset={new Vector2(0.0007, 0.0007)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.15} darkness={1.2} />
      </EffectComposer>
    </>
  )
}
