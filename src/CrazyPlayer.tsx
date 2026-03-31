import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const TRACK = {
  src:   '/track.mp3',
  title: 'AGUACATE',
  feat:  'feat. LONDON X',
  label: 'OFC · 2025',
  bpm:   '125 BPM',
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
}

export default function CrazyPlayer() {
  const audioRef  = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxAudio  = useRef<AudioContext | null>(null)
  const analyser  = useRef<AnalyserNode | null>(null)

  const [playing,  setPlaying]  = useState(false)
  const [current,  setCurrent]  = useState(0)
  const [duration, setDuration] = useState(0)
  const [bars,     setBars]     = useState<number[]>(Array(24).fill(0))
  const [peak,     setPeak]     = useState(false)

  // ── Magnetic cursor ───────────────────────────────────────────────────────
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 80, damping: 20 })
  const sy = useSpring(my, { stiffness: 80, damping: 20 })

  // ── Setup Web Audio (lazy — must be after user gesture) ───────────────────
  function setup() {
    if (ctxAudio.current || !audioRef.current) return
    const ctx  = new AudioContext()
    const an   = ctx.createAnalyser()
    an.fftSize                = 64
    an.smoothingTimeConstant  = 0.8
    ctx.createMediaElementSource(audioRef.current).connect(an)
    an.connect(ctx.destination)
    ctxAudio.current = ctx
    analyser.current = an
  }

  // ── Oscilloscope canvas ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cvs = canvas
    const c = cvs.getContext('2d')!
    let raf: number

    function draw() {
      raf = requestAnimationFrame(draw)
      c.clearRect(0, 0, cvs.width, cvs.height)

      if (!analyser.current || !playing) {
        // idle: flat gold line
        c.strokeStyle = 'rgba(201,162,39,0.3)'
        c.lineWidth   = 1
        c.beginPath()
        c.moveTo(0, cvs.height / 2)
        c.lineTo(cvs.width, cvs.height / 2)
        c.stroke()
        return
      }

      const td = new Uint8Array(analyser.current.fftSize)
      analyser.current.getByteTimeDomainData(td)
      c.strokeStyle = '#C9A227'
      c.lineWidth   = 1.5
      c.shadowColor = '#C9A227'
      c.shadowBlur  = 8
      c.beginPath()
      const slW = cvs.width / td.length
      td.forEach((v, i) => {
        const y = ((v / 128 - 1) * cvs.height * 0.42) + cvs.height / 2
        i === 0 ? c.moveTo(0, y) : c.lineTo(i * slW, y)
      })
      c.stroke()
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // ── Frequency bar loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || !analyser.current) return
    let raf: number

    function tick() {
      raf = requestAnimationFrame(tick)
      const data = new Uint8Array(analyser.current!.frequencyBinCount)
      analyser.current!.getByteFrequencyData(data)
      const out = Array.from(data).slice(0, 24).map(v => v / 255)
      setBars(out)
      setPeak(out.some(v => v > 0.88))
    }

    tick()
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // ── Toggle ────────────────────────────────────────────────────────────────
  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    setup()
    if (ctxAudio.current?.state === 'suspended') await ctxAudio.current.resume()
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      await audio.play()
      setPlaying(true)
    }
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <motion.div
      animate={{ y: [-4, 4, -4] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      style={{ x: sx, y: sy }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left  - r.width  / 2) * 0.06)
        my.set((e.clientY - r.top   - r.height / 2) * 0.06)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      className="cp"
    >
      <audio
        ref={audioRef}
        src={TRACK.src}
        preload="metadata"
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e   => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setPlaying(false)}
      />

      {/* ── grain overlay ── */}
      <div className="cp-grain" />

      {/* ── header row ── */}
      <div className="cp-hdr">
        <span className={`cp-rec ${playing ? 'cp-rec--on' : ''}`}>
          <span className="cp-rec-dot" />
          {playing ? 'ON AIR' : 'STANDBY'}
        </span>
        <span className="cp-label-txt">{TRACK.label}</span>
        <span className="cp-freq">
          {peak ? <span style={{ color: '#ff3322' }}>PEAK</span> : TRACK.bpm}
        </span>
      </div>

      {/* ── track name ── */}
      <div className="cp-title-block">
        <div className="cp-big-title">{TRACK.title}</div>
        <div className="cp-feat">{TRACK.feat}</div>
      </div>

      {/* ── oscilloscope ── */}
      <div className="cp-scope-wrap">
        <canvas ref={canvasRef} width={320} height={44} className="cp-scope" />
        <span className="cp-scope-lbl">WAVEFORM</span>
      </div>

      {/* ── bars ── */}
      <div className="cp-bars">
        {bars.map((v, i) => (
          <div
            key={i}
            className={`cp-bar ${v > 0.88 ? 'cp-bar--peak' : v > 0.5 ? 'cp-bar--mid' : ''}`}
            style={{ height: `${Math.max(4, v * 80)}px` }}
          />
        ))}
      </div>

      {/* ── progress ── */}
      <div className="cp-progress-row">
        <span className="cp-time-txt">{fmt(current)}</span>
        <div className="cp-progress-track">
          <div className="cp-progress-fill" style={{ width: `${pct}%` }} />
          <input
            type="range"
            className="cp-seek"
            min={0}
            max={duration || 1}
            step={0.01}
            value={current}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (audioRef.current) audioRef.current.currentTime = v
              setCurrent(v)
            }}
          />
        </div>
        <span className="cp-time-txt">{fmt(duration)}</span>
      </div>

      {/* ── controls ── */}
      <div className="cp-ctrl-row">
        <button className="cp-btn-sm" onClick={() => {
          if (audioRef.current) audioRef.current.currentTime = Math.max(0, current - 10)
        }}>
          &#8249;&#8249;
        </button>

        <button className="cp-btn-play" onClick={toggle} aria-label={playing ? 'pause' : 'play'}>
          {playing
            ? <span style={{ letterSpacing: '0.1em' }}>&#10074;&#10074;</span>
            : <span style={{ paddingLeft: '3px' }}>&#9654;</span>
          }
        </button>

        <button className="cp-btn-sm" onClick={() => {
          if (audioRef.current) audioRef.current.currentTime = Math.min(duration, current + 10)
        }}>
          &#8250;&#8250;
        </button>
      </div>

      {/* ── vu meters ── */}
      <div className="cp-vu-row">
        {['L', 'R'].map((ch, ci) => {
          const slice = bars.slice(ci * 12, ci * 12 + 12)
          const avg   = playing && slice.length
            ? slice.reduce((a, v) => a + v, 0) / slice.length
            : 0
          return (
            <div key={ch} className="cp-vu">
              <span className="cp-vu-ch">{ch}</span>
              <div className="cp-vu-track">
                <div
                  className="cp-vu-fill"
                  style={{
                    width: `${Math.min(100, avg * 130)}%`,
                    background: avg > 0.7
                      ? 'linear-gradient(to right, #C9A227, #ff3322)'
                      : 'linear-gradient(to right, #C9A227, #E4C05A)',
                  }}
                />
              </div>
              <span className="cp-vu-db">
                {playing ? `${(-20 + avg * 20).toFixed(0)} dB` : '–∞'}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
