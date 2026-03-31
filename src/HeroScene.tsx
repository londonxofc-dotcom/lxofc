import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

export default function HeroScene() {
  const ref = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    mass: 0.6,
  })

  // Scene 1 → 2: camera pushes into face
  const scale    = useTransform(smooth, [0, 0.7], [1, 1.55])
  const imageX   = useTransform(smooth, [0, 0.7], ['0%', '-8%'])

  // Text exits early
  const textOpacity = useTransform(smooth, [0, 0.28], [1, 0])
  const textY       = useTransform(smooth, [0, 0.28], ['0%', '-32%'])

  // Scene 3: white dissolve
  const whiteOpacity = useTransform(smooth, [0.55, 0.92], [0, 1])

  // Subtle atmospheric blur during zoom
  const blurVal = useTransform(smooth, [0, 0.7], [0, 6])
  const filter  = useTransform(blurVal, (v) => `blur(${v}px)`)

  return (
    <section ref={ref} style={{ height: '300vh', background: '#fff' }}>
      <div className="hero-sticky">

        {/* ── Image layer ── */}
        <motion.div
          className="hero-img-wrap"
          style={{ scale, x: imageX, filter }}
        >
          <div className="hero-img" />
        </motion.div>

        {/* ── Gradient blend — removes any edge ── */}
        <div className="hero-gradient" />

        {/* ── Text layer ── */}
        <motion.div
          className="hero-text-wrap"
          style={{ opacity: textOpacity, y: textY }}
        >
          <div className="pill">
            <span className="pill-dot" />
            OFC · 2025
          </div>
          <h1>London<span className="gold">X</span></h1>
          <div className="hero-sub">DJ · Producer · Culture</div>
          <div className="hero-handle">@Londonxofc_</div>
        </motion.div>

        {/* ── White dissolve ── */}
        <motion.div
          className="hero-white-out"
          style={{ opacity: whiteOpacity }}
        />

      </div>
    </section>
  )
}
