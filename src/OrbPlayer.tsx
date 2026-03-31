import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

function fmt(s: number) {
  const m  = Math.floor(s / 60)
  const ss = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
}

// ── Tape reel SVG ──────────────────────────────────────────────────────────────

interface ReelProps {
  angle: number
  size: number
}

function TapeReel({ angle, size }: ReelProps) {
  const r     = size
  const hub   = size * 0.32
  const spokes = 6
  const spokeAngles = Array.from({ length: spokes }, (_, i) => i * (360 / spokes))
  const vb = r * 2

  return (
    <svg
      width={vb}
      height={vb}
      viewBox={`${-r} ${-r} ${vb} ${vb}`}
      style={{ overflow: 'visible' }}
    >
      {/* outer ring */}
      <circle r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      {/* inner structure — rotates */}
      <g transform={`rotate(${angle})`}>
        {spokeAngles.map((deg, i) => (
          <g key={i} transform={`rotate(${deg})`}>
            <line
              x1={0} y1={-hub - 1}
              x2={0} y2={-r + 3}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* hub ring */}
        <circle r={hub} fill="#161616" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        {/* center dot */}
        <circle r={3.5} fill="#C9A227" />
      </g>
    </svg>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function OrbPlayer() {
  const audioRef    = useRef<HTMLAudioElement>(null)
  const ctxRef      = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef      = useRef<number>(0)

  const [playing,    setPlaying]    = useState(false)
  const [current,    setCurrent]    = useState(0)
  const [duration,   setDuration]   = useState(0)
  const [reelAngle,  setReelAngle]  = useState(0)
  const [bars,       setBars]       = useState<number[]>(Array(12).fill(0))

  // ── Reel spin ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    let last = reelAngle

    function spin() {
      last = (last + 0.7) % 360
      setReelAngle(last)
      rafRef.current = requestAnimationFrame(spin)
    }

    rafRef.current = requestAnimationFrame(spin)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  // ── Frequency bars ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || !analyserRef.current) return
    let raf: number

    function tick() {
      raf = requestAnimationFrame(tick)
      const data = new Uint8Array(analyserRef.current!.frequencyBinCount)
      analyserRef.current!.getByteFrequencyData(data)
      setBars(Array.from(data).slice(0, 12).map(v => v / 255))
    }

    tick()
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // ── Audio setup ──────────────────────────────────────────────────────────────
  function setup() {
    if (ctxRef.current || !audioRef.current) return
    const ctx = new AudioContext()
    const an  = ctx.createAnalyser()
    an.fftSize               = 64
    an.smoothingTimeConstant = 0.8
    ctx.createMediaElementSource(audioRef.current).connect(an)
    an.connect(ctx.destination)
    ctxRef.current      = ctx
    analyserRef.current = an
  }

  async function toggle() {
    if (!audioRef.current) return
    setup()
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume()
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      await audioRef.current.play()
      setPlaying(true)
    }
  }

  const pct = duration ? (current / duration) * 100 : 0

  // Tape reel sizes shift as track plays — left depletes, right fills
  const leftSize  = 30 - (pct / 100) * 10   // 30 → 20
  const rightSize = 20 + (pct / 100) * 10   // 20 → 30

  return (
    <motion.div
      className="dp-wrap"
      animate={{ y: [-6, 6, -6] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    >
      <audio
        ref={audioRef}
        src="/track.mp3"
        preload="metadata"
        onEnded={() => { setPlaying(false); setCurrent(0) }}
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e  => setCurrent((e.target as HTMLAudioElement).currentTime)}
      />

      {/* ── Hardware device body ── */}
      <div className="dp-device">

        {/* Screen */}
        <div className="dp-screen">
          <div className="dp-screen-hdr">
            <span className="dp-model">LDN-01</span>
            <span className="dp-track-label">AGUACATE</span>
            <div className="dp-indicators">
              <span className={`dp-ind${playing ? ' dp-ind--live' : ''}`}>
                {playing ? 'REC' : 'SBY'}
              </span>
              <span className="dp-ind dp-ind--dim">MX</span>
            </div>
          </div>

          {/* Tape reels */}
          <div className="dp-reels-row">
            <TapeReel angle={-reelAngle} size={leftSize} />

            {/* Belt */}
            <svg className="dp-belt" viewBox="0 0 120 30" preserveAspectRatio="none">
              <path
                d={`M 0 15 C 40 ${playing ? 8 : 15}, 80 ${playing ? 8 : 15}, 120 15`}
                fill="none"
                stroke="#C9A227"
                strokeWidth="0.8"
                opacity="0.5"
              />
            </svg>

            <TapeReel angle={reelAngle} size={rightSize} />
          </div>

          {/* Progress bar */}
          <div className="dp-progress-row">
            <div className="dp-progress-track">
              <div className="dp-progress-fill" style={{ width: `${pct}%` }} />
              <div className="dp-playhead" style={{ left: `clamp(0px, ${pct}%, calc(100% - 1px))` }} />
              <input
                type="range"
                className="dp-seek"
                min={0} max={duration || 1} step={0.01} value={current}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (audioRef.current) audioRef.current.currentTime = v
                  setCurrent(v)
                }}
              />
            </div>
            <span className="dp-time-code">{fmt(current)}</span>
          </div>
        </div>

        {/* Bottom panel */}
        <div className="dp-bottom">

          {/* Knobs */}
          <div className="dp-knobs">
            <div className="dp-knob dp-knob--gold">
              <div className="dp-knob-tick" style={{ transform: 'rotate(-40deg)' }} />
            </div>
            <div className="dp-knob dp-knob--dark">
              <div className="dp-knob-tick" style={{ transform: 'rotate(20deg)' }} />
            </div>
          </div>

          {/* Mini frequency bars */}
          <div className="dp-mini-bars">
            {bars.map((v, i) => (
              <div
                key={i}
                className="dp-mini-bar"
                style={{ height: `${Math.max(3, v * 26)}px` }}
              />
            ))}
          </div>

          {/* Button grid */}
          <div className="dp-btn-grid">
            {['△', '○', '□', '◇'].map(s => (
              <button key={s} className="dp-hw-btn">{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Play row ── */}
      <div className="dp-play-row">
        <button className="dp-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing
            ? <span style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>&#10074;&#10074;</span>
            : <span style={{ paddingLeft: '2px' }}>&#9654;</span>
          }
        </button>

        <div className="dp-track-info">
          <span className="dp-track-title">AGUACATE</span>
          <span className="dp-track-feat">feat. London X · OFC 2025</span>
        </div>

        <span className="dp-total-time">{duration > 0 ? fmt(duration) : '--:--'}</span>
      </div>
    </motion.div>
  )
}
