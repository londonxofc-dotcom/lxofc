import { useRef, useEffect } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
} from 'framer-motion'
import WebGLHero from './WebGLHero'

const SPOTIFY_TRACK_ID = '3Otl26EXlLi5DgzdFGRy9R'
const APPLE_ALBUM_ID   = '1745000425'
const APPLE_TRACK_ID   = '1745000427'

export default function CinematicEPK() {
  const ref      = useRef<HTMLElement>(null)
  const emailRef = useRef<HTMLAnchorElement>(null)

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // Heavier spring = more cinematic inertia
  const smooth = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  })

  // Scroll → WebGL z-push amount (passed to WebGLHero as scrollScale)
  const scale = useTransform(smooth, [0, 0.4], [1, 1.45])

  // Scroll → WebGL dissolution (face starts dissolving after bio scene exits)
  const distortion = useTransform(smooth, [0.70, 0.95], [0, 1])

  // ── Cursor ─────────────────────────────────────────────────────────────────
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const cursorX = useSpring(rawX, { stiffness: 50, damping: 20 })
  const cursorY = useSpring(rawY, { stiffness: 50, damping: 20 })

  // Text moves opposite — depth separation
  const textX = useTransform(cursorX, v => v * -0.5)
  const textY = useTransform(cursorY, v => v * -0.5)

  // Light source follows cursor
  const lightCX = useTransform(cursorX, v => 50 + v * 2.5)
  const lightCY = useTransform(cursorY, v => 50 + v * 2)
  const lightBg = useMotionTemplate`radial-gradient(circle at ${lightCX}% ${lightCY}%, rgba(255,255,255,0.18), transparent 55%)`

  function handleMouseMove(e: React.MouseEvent) {
    rawX.set((e.clientX / window.innerWidth  - 0.5) * 12)
    rawY.set((e.clientY / window.innerHeight - 0.5) *  8)
  }

  // ── Idle drift (starts 3 s after mouse stops moving) ───────────────────────
  useEffect(() => {
    let drift: ReturnType<typeof setInterval>
    let timer: ReturnType<typeof setTimeout>

    function arm() {
      clearInterval(drift)
      clearTimeout(timer)
      timer = setTimeout(() => {
        let t = 0
        drift = setInterval(() => {
          t += 0.016
          rawX.set(Math.sin(t * 0.3) * 3)
          rawY.set(Math.cos(t * 0.2) * 2)
        }, 16)
      }, 3000)
    }

    window.addEventListener('mousemove', arm)
    arm()
    return () => {
      window.removeEventListener('mousemove', arm)
      clearInterval(drift)
      clearTimeout(timer)
    }
  }, [rawX, rawY])

  // ── Magnetic email ─────────────────────────────────────────────────────────
  const emailRawX = useMotionValue(0)
  const emailRawY = useMotionValue(0)
  const emailX = useSpring(emailRawX, { stiffness: 150, damping: 15 })
  const emailY = useSpring(emailRawY, { stiffness: 150, damping: 15 })

  function onEmailMove(e: React.MouseEvent) {
    if (!emailRef.current) return
    const r = emailRef.current.getBoundingClientRect()
    emailRawX.set((e.clientX - r.left  - r.width  / 2) * 0.25)
    emailRawY.set((e.clientY - r.top   - r.height / 2) * 0.25)
  }

  // ── Scene timings — 3 phases + dead zones between ──────────────────────────
  //
  // Scene 1 — Identity        0.00 → 0.11 (out), dead 0.11–0.17
  // Scene 2 — Sound    in 0.17→0.27, hold 0.27→0.38, out 0.38→0.46, dead 0.46–0.50
  // Scene 3 — Meaning  in 0.50→0.60, hold 0.60→0.70, out 0.70→0.78, dead 0.78–0.83
  // Scene 4 — Access   in 0.83→0.92, holds; white 0.90→1.0
  //
  const introOpacity   = useTransform(smooth, [0, 0.11], [1, 0])
  const musicOpacity   = useTransform(smooth, [0.17, 0.27, 0.38, 0.46], [0, 1, 1, 0])
  const bioOpacity     = useTransform(smooth, [0.50, 0.60, 0.70, 0.78], [0, 1, 1, 0])
  const contactOpacity = useTransform(smooth, [0.83, 0.92], [0, 1])
  const whiteOut       = useTransform(smooth, [0.90, 1.0], [0, 1])

  return (
    <section ref={ref} style={{ height: '450vh' }} onMouseMove={handleMouseMove}>
      <div className="cin-sticky">

        {/* ── FACE — WebGL plane (real depth + light + dissolution) ─── */}
        <WebGLHero cursorX={cursorX} cursorY={cursorY} scrollScale={scale} distortion={distortion} scrollProgress={smooth} />

        {/* ── ATMOSPHERE: left shadow for depth ─── */}
        <div className="cin-atm-left" />

        {/* ── DEPTH: subtle left-side falloff ─── */}
        <div className="cin-depth" />

        {/* ── ATMOSPHERE: bottom ground ─── */}
        <div className="cin-atm-bottom" />

        {/* ── DYNAMIC LIGHT: follows cursor ─── */}
        <motion.div className="cin-light" style={{ background: lightBg }} />

        {/* ── VIGNETTE ─── */}
        <div className="cin-vignette" />

        {/* ── SCENE 1 — Identity ─────────────────────────────────────────── */}
        <div className="cin-scene cin-scene--hero">
          <motion.div style={{ opacity: introOpacity, x: textX, y: textY }}>
            <div className="pill">
              <span className="pill-dot" />
              OFC · 2025
            </div>
            <h1>London<span className="gold">X</span></h1>
            <div className="hero-sub">DJ · Producer · Culture</div>
            <div className="hero-handle">@Londonxofc_</div>
          </motion.div>
        </div>

        {/* ── SCENE 2 — Sound ────────────────────────────────────────────── */}
        <div className="cin-scene cin-scene--music">
          <motion.div style={{ opacity: musicOpacity }}>
            <div className="glass-card">
              <iframe
                src={`https://open.spotify.com/embed/track/${SPOTIFY_TRACK_ID}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: '10px', display: 'block' }}
              />
            </div>
            <div className="glass-card" style={{ marginTop: '12px' }}>
              <iframe
                src={`https://embed.music.apple.com/us/album/aguacate-feat-london-x/${APPLE_ALBUM_ID}?i=${APPLE_TRACK_ID}`}
                width="100%"
                height="175"
                frameBorder="0"
                allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                loading="lazy"
                style={{ borderRadius: '10px', display: 'block' }}
              />
            </div>
          </motion.div>
        </div>

        {/* ── SCENE 3 — Meaning ──────────────────────────────────────────── */}
        <div className="cin-scene cin-scene--bio">
          <motion.div style={{ opacity: bioOpacity, x: textX, y: textY }}>
            <h2>Signal<br />in the<br />dark.</h2>
            <p>
              London X is a DJ and music producer operating under the OFC banner —
              his solo vehicle for house music, raw club sounds, and singular vision.
              Every mix is a statement. Every release on his own terms.
            </p>
            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-num">125</span>
                <span className="stat-label">BPM</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">OFC</span>
                <span className="stat-label">Independent</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">Solo</span>
                <span className="stat-label">Producer</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── SCENE 4 — Access ───────────────────────────────────────────── */}
        <div className="cin-scene cin-scene--contact">
          <motion.div style={{ opacity: contactOpacity }}>
            <motion.a
              ref={emailRef}
              href="mailto:londonxofc@gmail.com"
              className="contact-email-link"
              style={{ x: emailX, y: emailY, display: 'inline-block' }}
              onMouseMove={onEmailMove}
              onMouseLeave={() => { emailRawX.set(0); emailRawY.set(0) }}
            >
              londonxofc<br />@gmail.com
            </motion.a>
            <div className="contact-meta">
              <span>@Londonxofc_</span>
              <span>Available Worldwide</span>
              <span>House · Afro House · Deep House</span>
            </div>
            <a href="epk.html" target="_blank" className="epk-btn">
              Download EPK
            </a>
          </motion.div>
        </div>

        {/* ── WHITE CUT ──────────────────────────────────────────────────── */}
        <motion.div className="cin-white" style={{ opacity: whiteOut }} />

      </div>
    </section>
  )
}
