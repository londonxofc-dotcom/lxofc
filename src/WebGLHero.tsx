import { useRef, useMemo, RefObject } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { MotionValue } from 'framer-motion'
import { useMotionValueEvent } from 'framer-motion'
import { useAudioAnalyser } from './useAudioAnalyser'
import type { AudioBands } from './useAudioAnalyser'

// ── GLSL helpers shared by vert + frag ───────────────────────────────────────
const NOISE_GLSL = /* glsl */`
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),           hash(i + vec2(1.0,0.0)), f.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x),
    f.y
  );
}
`

// ── Vertex shader ─────────────────────────────────────────────────────────────
const vertexShader = /* glsl */`
${NOISE_GLSL}

uniform float uTime;
uniform float uDistortion;
varying vec2  vUv;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Alive breathing — very subtle, always on
  float breath = noise(uv * 3.0 + uTime * 0.12) * 0.012;

  // Dissolution displacement — scales with uDistortion
  float d1 = noise(uv * 7.0 + uTime * 0.28) * uDistortion * 0.38;
  float d2 = noise(uv * 2.2 - uTime * 0.09) * uDistortion * 0.22;
  float dx = noise(uv * 4.5 + uTime * 0.18) * uDistortion * 0.14;
  float dy = noise(uv * 3.8 - uTime * 0.22) * uDistortion * 0.11;

  pos.z += breath + d1 + d2;
  pos.x += dx;
  pos.y += dy;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

// ── Fragment shader ───────────────────────────────────────────────────────────
const fragmentShader = /* glsl */`
${NOISE_GLSL}

uniform sampler2D uTexture;
uniform float     uTime;
uniform float     uDistortion;
uniform vec2      uCursor;   // normalized -0.5..0.5

varying vec2 vUv;

void main() {
  // ── object-fit: cover — 1:1 image on 3.0×2.8 plane (aspect 1.071)
  // Scale by width: full image width visible, clip 6.7% height (3.3% each side)
  vec2 uv = vec2(vUv.x, vUv.y * 0.9333 + 0.0333);

  // ── UV warp — face melts under distortion ──────────────────────────────
  uv.x += noise(vUv * 5.5 + uTime * 0.18) * uDistortion * 0.075;
  uv.y += noise(vUv * 4.8 - uTime * 0.14) * uDistortion * 0.055;

  // Cursor micro-parallax on UV
  uv += uCursor * 0.007;

  vec4 col = texture2D(uTexture, uv);

  // ── Film grain — always present, amplifies with distortion ─────────────
  float grain = hash(vUv * 800.0 + uTime * 73.0);
  col.rgb += (grain - 0.5) * (0.022 + uDistortion * 0.07);

  // ── Pixel dissolution — noise threshold sweeps across face ────────────
  float dissolveNoise = noise(vUv * 11.0 + uTime * 0.42);
  float threshold = uDistortion * 1.08 - 0.04;
  if (threshold > 0.0) {
    float edge    = 0.08;
    float fadeAmt = smoothstep(threshold - edge, threshold, dissolveNoise);
    col.a *= fadeAmt;
  }

  // ── Cursor light — soft additive highlight ─────────────────────────────
  float dist      = length(vUv - (uCursor + 0.5));
  float lightSpot = smoothstep(0.55, 0.0, dist) * 0.10;
  col.rgb         = clamp(col.rgb + lightSpot, 0.0, 1.0);

  gl_FragColor = col;
}
`

// ── Scene-aware audio multiplier ─────────────────────────────────────────────
// Maps scroll progress 0..1 to an audio influence multiplier per scene:
//   Identity  (0.00–0.17) → 0.15  restrained, presence only
//   Sound     (0.17–0.46) → 0.45  music scene, more alive
//   Bio       (0.50–0.78) → 0.60  energized
//   Contact   (0.83–1.00) → 1.00  full chaos
function getAudioMult(p: number): number {
  const ml = THREE.MathUtils.mapLinear
  if (p < 0.11)  return 0.15
  if (p < 0.17)  return 0.15
  if (p < 0.27)  return ml(p, 0.17, 0.27, 0.15, 0.45)
  if (p < 0.38)  return 0.45
  if (p < 0.50)  return ml(p, 0.38, 0.50, 0.45, 0.35)
  if (p < 0.60)  return ml(p, 0.50, 0.60, 0.35, 0.60)
  if (p < 0.70)  return 0.60
  if (p < 0.83)  return ml(p, 0.70, 0.83, 0.60, 0.85)
  return           ml(p, 0.83, 1.00, 0.85, 1.00)
}

// ── Dynamic ambient light — highs drive micro flicker ────────────────────────
interface DynamicLightProps {
  audio: RefObject<AudioBands>
  scrollProgress: RefObject<number>
}

function DynamicLight({ audio, scrollProgress }: DynamicLightProps) {
  const light = useRef<THREE.AmbientLight>(null)

  useFrame(() => {
    if (!light.current) return

    const rawHighs = audio.current?.highs ?? 0
    const ud = light.current.userData
    // Slow smooth on highs — micro flicker not strobe
    ud.sHighs = (ud.sHighs ?? 0) + (rawHighs - (ud.sHighs ?? 0)) * 0.06

    const mult = getAudioMult(scrollProgress.current ?? 0)
    light.current.intensity = 0.9 + ud.sHighs * 0.28 * mult
  })

  return <ambientLight ref={light} intensity={0.9} />
}

// ── Face plane component ─────────────────────────────────────────────────────
interface FacePlaneProps {
  cursorX:        MotionValue<number>
  cursorY:        MotionValue<number>
  scrollScale:    MotionValue<number>
  distortion:     MotionValue<number>
  audio:          RefObject<AudioBands>
  scrollProgress: RefObject<number>
}

function FacePlane({ cursorX, cursorY, scrollScale, distortion, audio, scrollProgress }: FacePlaneProps) {
  const mesh    = useRef<THREE.Mesh>(null)
  const texture = useLoader(TextureLoader, '/hero-fresh.jpg')

  // Live refs — read in useFrame without subscribe overhead
  const cx   = useRef(0)
  const cy   = useRef(0)
  const sc   = useRef(1)
  const dist = useRef(0)

  useMotionValueEvent(cursorX,    'change', v => { cx.current   = v })
  useMotionValueEvent(cursorY,    'change', v => { cy.current   = v })
  useMotionValueEvent(scrollScale,'change', v => { sc.current   = v })
  useMotionValueEvent(distortion, 'change', v => { dist.current = v })

  // Shader material — created once, uniforms mutated each frame
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    uniforms: {
      uTexture:    { value: texture },
      uTime:       { value: 0 },
      uDistortion: { value: 0 },
      uCursor:     { value: new THREE.Vector2(0, 0) },
    },
  }), [texture])

  // Geometry with enough segments for vertex displacement
  // fov=28, z=5 → visible height ≈ 2.49 units. 2.8 fills ~112% (cinematic tight crop).
  const geo = useMemo(() => new THREE.PlaneGeometry(3.0, 2.8, 64, 80), [])

  useFrame(({ clock }) => {
    if (!mesh.current) return

    // ── Uniforms ───────────────────────────────────────────────────────────
    mat.uniforms.uTime.value       = clock.elapsedTime
    mat.uniforms.uDistortion.value = THREE.MathUtils.lerp(
      mat.uniforms.uDistortion.value,
      dist.current,
      0.04
    )
    mat.uniforms.uCursor.value.set(
      cx.current / 24,   // map ±12 range → ±0.5
      -cy.current / 16   // map ±8 range → ±0.5, flip y
    )

    // ── Mesh rotation (real 3D tilt from cursor) ───────────────────────────
    mesh.current.rotation.y = THREE.MathUtils.lerp(
      mesh.current.rotation.y,
      (cx.current / 12) * 0.065,
      0.07
    )
    mesh.current.rotation.x = THREE.MathUtils.lerp(
      mesh.current.rotation.x,
      -(cy.current / 8) * 0.042,
      0.07
    )

    // ── Scroll → z push ────────────────────────────────────────────────────
    mesh.current.position.z = THREE.MathUtils.lerp(
      mesh.current.position.z,
      (sc.current - 1) * 2.2,
      0.055
    )

    // ── Audio → subtle face scale pulse (bass = kick) ──────────────────────
    const rawBass = audio.current?.bass ?? 0
    const ud = mesh.current.userData
    ud.sBass = (ud.sBass ?? 0) + (rawBass - (ud.sBass ?? 0)) * 0.04

    const mult = getAudioMult(scrollProgress.current ?? 0)
    const targetScale = 1 + ud.sBass * 0.02 * mult
    mesh.current.scale.setScalar(
      THREE.MathUtils.lerp(mesh.current.scale.x, targetScale, 0.06)
    )
  })

  // x=-0.45 pulls face left → eye sits slightly left of center
  // fade dissolves AFTER the face, not through it
  return (
    <mesh ref={mesh} geometry={geo} material={mat} position={[-0.74, 0, 0]} />
  )
}

// ── Particle system ───────────────────────────────────────────────────────────
// Grid-sampled across the face plane.
// At distortion=0: invisible, collapsed on face surface.
// As distortion rises: scatter outward with per-particle noise offsets.
const PARTICLE_COUNT = 1000

const particleVertShader = /* glsl */`
${NOISE_GLSL}

attribute vec3  aOffset;    // per-particle scatter direction
attribute float aSpeed;     // per-particle timing variance
attribute float aSize;      // per-particle base size

uniform float uTime;
uniform float uDistortion;

varying float vAlpha;

void main() {
  // Rest position on face, scattered position = rest + aOffset
  float scatter = smoothstep(0.0, 1.0, uDistortion) * aSpeed;
  vec3  pos     = position + aOffset * scatter;

  // Secondary life: slow drift after explosion
  pos.x += sin(uTime * 0.4 + aOffset.x * 3.0) * uDistortion * 0.05;
  pos.y += cos(uTime * 0.3 + aOffset.y * 2.0) * uDistortion * 0.04;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position  = projectionMatrix * mv;

  // Size: appear only when distortion starts, grow then fade at extreme scatter
  float appear  = smoothstep(0.0, 0.25, uDistortion);
  float fade    = 1.0 - smoothstep(0.7, 1.0, scatter);
  vAlpha        = appear * fade * (0.5 + aSize * 0.5);

  gl_PointSize  = (aSize * 2.5 + 1.0) * (300.0 / -mv.z);
}
`

const particleFragShader = /* glsl */`
varying float vAlpha;

void main() {
  // Circular soft point
  vec2  uv   = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.15, dist) * vAlpha;
  gl_FragColor = vec4(1.0, 0.98, 0.94, alpha);
}
`

interface FaceParticlesProps {
  distortion:     MotionValue<number>
  audio:          RefObject<AudioBands>
  scrollProgress: RefObject<number>
}

function FaceParticles({ distortion, audio, scrollProgress }: FaceParticlesProps) {
  const points = useRef<THREE.Points>(null)
  const dist   = useRef(0)
  useMotionValueEvent(distortion, 'change', v => { dist.current = v })

  const { geo, mat } = useMemo(() => {
    const W = 3.0, H = 2.8
    const cols = Math.round(Math.sqrt(PARTICLE_COUNT * (W / H)))
    const rows = Math.round(PARTICLE_COUNT / cols)
    const count = cols * rows

    const positions = new Float32Array(count * 3)
    const offsets   = new Float32Array(count * 3)
    const speeds    = new Float32Array(count)
    const sizes     = new Float32Array(count)

    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * W
        const y = (r / (rows - 1) - 0.5) * H
        positions[i * 3]     = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = 0

        // Scatter: explode outward from center + random
        const ang = Math.random() * Math.PI * 2
        const rad = 0.8 + Math.random() * 2.4
        offsets[i * 3]     = Math.cos(ang) * rad + x * 0.35
        offsets[i * 3 + 1] = Math.sin(ang) * rad + y * 0.35
        offsets[i * 3 + 2] = (Math.random() - 0.5) * 1.2

        speeds[i] = 0.6 + Math.random() * 0.8
        sizes[i]  = Math.random()
        i++
      }
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aOffset',  new THREE.BufferAttribute(offsets,   3))
    g.setAttribute('aSpeed',   new THREE.BufferAttribute(speeds,    1))
    g.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))

    const m = new THREE.ShaderMaterial({
      vertexShader:   particleVertShader,
      fragmentShader: particleFragShader,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      uniforms: {
        uTime:       { value: 0 },
        uDistortion: { value: 0 },
      },
    })

    return { geo: g, mat: m }
  }, [])

  useFrame(({ clock }) => {
    if (!points.current) return

    mat.uniforms.uTime.value       = clock.elapsedTime
    mat.uniforms.uDistortion.value = THREE.MathUtils.lerp(
      mat.uniforms.uDistortion.value,
      dist.current,
      0.04
    )

    // ── Audio → particle motion ────────────────────────────────────────────
    const rawBass = audio.current?.bass ?? 0
    const rawMids = audio.current?.mids ?? 0
    const mult = getAudioMult(scrollProgress.current ?? 0)

    // Two smoothing layers: fast (feel) + slow inertia (weight)
    const ud = points.current.userData
    ud.sBass = (ud.sBass ?? 0) + (rawBass - (ud.sBass ?? 0)) * 0.04
    ud.sMids = (ud.sMids ?? 0) + (rawMids - (ud.sMids ?? 0)) * 0.04
    ud.iBass = (ud.iBass ?? 0) + (ud.sBass - (ud.iBass ?? 0)) * 0.02  // inertia

    const { sMids, iBass } = ud

    // Mids drive subtle rotation — zero in silence (Apple: static until touched)
    points.current.rotation.y += sMids * 0.006 * mult

    // Scale: inertia bass × scene mult
    const targetScale = 1 + iBass * 0.10 * mult
    points.current.scale.setScalar(
      THREE.MathUtils.lerp(points.current.scale.x, targetScale, 0.06)
    )
  })

  return <points ref={points} geometry={geo} material={mat} position={[-0.74, 0, 0]} />
}

// ── Exported canvas ───────────────────────────────────────────────────────────
interface WebGLHeroProps {
  cursorX:        MotionValue<number>
  cursorY:        MotionValue<number>
  scrollScale:    MotionValue<number>
  distortion:     MotionValue<number>
  scrollProgress: MotionValue<number>
}

export default function WebGLHero(props: WebGLHeroProps) {
  const audio = useAudioAnalyser()

  // Sync scrollProgress MotionValue → ref so R3F components can read it in useFrame
  const progressRef = useRef(0)
  useMotionValueEvent(props.scrollProgress, 'change', v => { progressRef.current = v })

  return (
    <div className="cin-webgl-mask">
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 28 }}
        dpr={[1, 1.5]}
      >
        <DynamicLight audio={audio} scrollProgress={progressRef} />
        <FacePlane {...props} audio={audio} scrollProgress={progressRef} />
        <FaceParticles distortion={props.distortion} audio={audio} scrollProgress={progressRef} />
      </Canvas>
    </div>
  )
}
