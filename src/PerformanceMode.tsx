import { useRef, useMemo, useEffect, useState, RefObject } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { useAudioAnalyser } from './useAudioAnalyser'
import type { AudioBands } from './useAudioAnalyser'

// ── GLSL ─────────────────────────────────────────────────────────────────────
const NOISE_GLSL = /* glsl */`
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y
  );
}
`

const vertShader = /* glsl */`
${NOISE_GLSL}
uniform float uTime;
varying vec2  vUv;
void main() {
  vUv = uv;
  vec3 pos = position;
  float breath = noise(uv * 3.0 + uTime * 0.12) * 0.012;
  pos.z += breath;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const fragShader = /* glsl */`
${NOISE_GLSL}
uniform sampler2D uTexture;
uniform float     uTime;
uniform float     uTexShift;
uniform vec2      uCursor;
varying vec2 vUv;
void main() {
  // object-fit: cover — square image (1:1) on portrait plane (2.3×3.3)
  // visibleX = planeAspect / imageAspect = 0.697
  vec2 uv = vec2(vUv.x * 0.6970 + uTexShift, vUv.y);
  uv += uCursor * 0.007;
  vec4 col = texture2D(uTexture, uv);
  float grain = hash(vUv * 800.0 + uTime * 73.0);
  col.rgb += (grain - 0.5) * 0.022;
  float dist = length(vUv - (uCursor + 0.5));
  col.rgb = clamp(col.rgb + smoothstep(0.55, 0.0, dist) * 0.10, 0.0, 1.0);
  gl_FragColor = col;
}
`

const ptVertShader = /* glsl */`
${NOISE_GLSL}
attribute vec3  aOffset;
attribute float aSpeed;
attribute float aSize;
uniform float uTime;
uniform float uDistortion;
varying float vAlpha;
void main() {
  float scatter = smoothstep(0.0, 1.0, uDistortion) * aSpeed;
  vec3  pos     = position + aOffset * scatter;
  pos.x += sin(uTime * 0.4 + aOffset.x * 3.0) * uDistortion * 0.05;
  pos.y += cos(uTime * 0.3 + aOffset.y * 2.0) * uDistortion * 0.04;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position  = projectionMatrix * mv;
  float appear  = smoothstep(0.0, 0.25, uDistortion);
  float fade    = 1.0 - smoothstep(0.7, 1.0, scatter);
  vAlpha        = appear * fade * (0.5 + aSize * 0.5);
  gl_PointSize  = (aSize * 2.5 + 1.0) * (300.0 / -mv.z);
}
`

const ptFragShader = /* glsl */`
varying float vAlpha;
void main() {
  vec2  uv   = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.15, dist) * vAlpha;
  gl_FragColor = vec4(1.0, 0.98, 0.94, alpha);
}
`

// ── Face — full audio reactive, no scroll distortion ─────────────────────────
function PerfFace({ audio }: { audio: RefObject<AudioBands> }) {
  const mesh    = useRef<THREE.Mesh>(null)
  const texture = useLoader(TextureLoader, '/hero-fresh.jpg')
  const cx = useRef(0)
  const cy = useRef(0)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      cx.current = (e.clientX / window.innerWidth  - 0.5) * 12
      cy.current = (e.clientY / window.innerHeight - 0.5) *  8
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertShader,
    fragmentShader: fragShader,
    transparent: true,
    side: THREE.FrontSide,
    uniforms: {
      uTexture:  { value: texture },
      uTime:     { value: 0 },
      uCursor:   { value: new THREE.Vector2(0, 0) },
      uTexShift: { value: 0.02 },  // cover pan: 0=full left (face), ~0.15=center
    },
  }), [texture])

  // fov=35, z=5 → visible height ≈ 3.15 units. 3.3 bleeds edge-to-edge.
  const geo = useMemo(() => new THREE.PlaneGeometry(2.3, 3.3, 64, 80), [])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uCursor.value.set(cx.current / 24, -cy.current / 16)

    mesh.current.rotation.y = THREE.MathUtils.lerp(
      mesh.current.rotation.y, (cx.current / 12) * 0.055, 0.06
    )
    mesh.current.rotation.x = THREE.MathUtils.lerp(
      mesh.current.rotation.x, -(cy.current / 8) * 0.035, 0.06
    )

    const rawBass = audio.current?.bass ?? 0
    const ud = mesh.current.userData
    ud.sBass = (ud.sBass ?? 0) + (rawBass - (ud.sBass ?? 0)) * 0.04
    mesh.current.scale.setScalar(
      THREE.MathUtils.lerp(mesh.current.scale.x, 1 + ud.sBass * 0.025, 0.06)
    )
  })

  return <mesh ref={mesh} geometry={geo} material={mat} position={[-0.2, 0, 0]} />
}

// ── Particles — full reactivity ───────────────────────────────────────────────
const PERF_COUNT = 2400

function PerfParticles({ audio }: { audio: RefObject<AudioBands> }) {
  const points = useRef<THREE.Points>(null)

  const { geo, mat } = useMemo(() => {
    const W = 2.3, H = 3.3
    const cols = Math.round(Math.sqrt(PERF_COUNT * (W / H)))
    const rows = Math.round(PERF_COUNT / cols)
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
        positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = 0
        const ang = Math.random() * Math.PI * 2
        const rad = 0.8 + Math.random() * 3.2
        offsets[i*3]   = Math.cos(ang) * rad + x * 0.4
        offsets[i*3+1] = Math.sin(ang) * rad + y * 0.4
        offsets[i*3+2] = (Math.random() - 0.5) * 1.8
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
      vertexShader: ptVertShader,
      fragmentShader: ptFragShader,
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
    mat.uniforms.uTime.value = clock.elapsedTime

    const rawBass = audio.current?.bass ?? 0
    const rawMids = audio.current?.mids ?? 0
    const ud = points.current.userData
    ud.sBass = (ud.sBass ?? 0) + (rawBass - (ud.sBass ?? 0)) * 0.04
    ud.sMids = (ud.sMids ?? 0) + (rawMids - (ud.sMids ?? 0)) * 0.04
    ud.iBass = (ud.iBass ?? 0) + (ud.sBass - (ud.iBass ?? 0)) * 0.02

    // Bass builds distortion over time → particles scatter when drop hits
    ud.energy = Math.min(1, (ud.energy ?? 0) + ud.sBass * 0.004 - 0.001)
    mat.uniforms.uDistortion.value = THREE.MathUtils.lerp(
      mat.uniforms.uDistortion.value, ud.energy, 0.03
    )

    points.current.rotation.y += ud.sMids * 0.012
    points.current.scale.setScalar(
      THREE.MathUtils.lerp(points.current.scale.x, 1 + ud.iBass * 0.18, 0.06)
    )
  })

  return <points ref={points} geometry={geo} material={mat} position={[-0.2, 0, 0]} />
}

// ── Ambient light ─────────────────────────────────────────────────────────────
function PerfLight({ audio }: { audio: RefObject<AudioBands> }) {
  const light = useRef<THREE.AmbientLight>(null)
  useFrame(() => {
    if (!light.current) return
    const ud = light.current.userData
    ud.sHighs = (ud.sHighs ?? 0) + ((audio.current?.highs ?? 0) - (ud.sHighs ?? 0)) * 0.06
    light.current.intensity = 0.9 + ud.sHighs * 0.4
  })
  return <ambientLight ref={light} intensity={0.9} />
}

// ── Exported overlay ──────────────────────────────────────────────────────────
interface PerformanceModeProps {
  onExit: () => void
}

export default function PerformanceMode({ onExit }: PerformanceModeProps) {
  const audio = useAudioAnalyser()
  const [exiting,     setExiting]     = useState(false)
  const [titleOut,    setTitleOut]    = useState(false)
  const [titleGone,   setTitleGone]   = useState(false)

  // Title card: fade in → hold 1.4s → fade out → gone
  useEffect(() => {
    const fade = setTimeout(() => setTitleOut(true),  1400)
    const gone = setTimeout(() => setTitleGone(true), 1900)
    return () => { clearTimeout(fade); clearTimeout(gone) }
  }, [])

  function triggerExit() {
    if (exiting) return
    setExiting(true)
    setTimeout(onExit, 300)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') triggerExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exiting])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#000',
      cursor: 'none',
      animation: exiting
        ? 'perfFadeOut 0.3s ease forwards'
        : 'perfFadeIn 0.4s ease forwards',
    }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 0, 5], fov: 35 }}
        dpr={[1, 2]}
      >
        <PerfLight audio={audio} />
        <PerfFace  audio={audio} />
        <PerfParticles audio={audio} />
      </Canvas>

      {/* ── Title card ── */}
      {!titleGone && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          animation: titleOut ? 'perfFadeOut 0.5s ease forwards' : 'perfFadeIn 0.3s ease forwards',
        }}>
          <div style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(3.5rem, 8vw, 7rem)',
            fontWeight: 500,
            letterSpacing: '-0.035em',
            color: '#fff',
            lineHeight: 1,
          }}>
            London
            <span style={{
              background: 'linear-gradient(135deg, #E4C05A 0%, #C9A227 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block',
              animation: 'perfXPulse 0.6s 0.3s ease-out both',
            }}>X</span>
          </div>
        </div>
      )}

      {/* ESC hint — appears after title card is gone */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', right: '2rem',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '0.55rem',
        fontWeight: 400,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.2)',
        pointerEvents: 'none',
        animation: 'perfFadeIn 0.5s 1.9s ease forwards',
        opacity: 0,
      }}>
        ESC to exit
      </div>
    </div>
  )
}
