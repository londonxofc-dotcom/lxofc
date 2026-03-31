import { useState, useCallback, useEffect, useRef } from 'react'
import SideMenu from './SideMenu'

const CHANNELS = [
  { num: '01', label: 'BIO',     tint: 'rgba(245,208,32,0.11)',  osdColor: 'rgba(245,208,32,0.95)',  osdGlow: 'rgba(245,208,32,0.5)',  hue: '12deg',   ledColor: 'rgba(245,208,32,0.9)'   },
  { num: '02', label: 'MUSIC',   tint: 'rgba(125,211,252,0.09)', osdColor: 'rgba(125,211,252,0.95)', osdGlow: 'rgba(125,211,252,0.5)', hue: '-25deg',  ledColor: 'rgba(125,211,252,0.9)'  },
  { num: '03', label: 'BOOKING', tint: 'rgba(255,82,82,0.09)',   osdColor: 'rgba(255,100,100,0.95)', osdGlow: 'rgba(255,82,82,0.5)',   hue: '-55deg',  ledColor: 'rgba(255,100,100,0.9)'  },
  { num: '04', label: 'EPK',     tint: 'rgba(176,176,176,0.07)', osdColor: 'rgba(210,210,210,0.95)', osdGlow: 'rgba(200,200,200,0.4)', hue: '0deg',    ledColor: 'rgba(200,200,200,0.6)'  },
]

export default function GraffitiHero() {
  const [ch, setCh]               = useState(0)
  const [staticOn, setStatic]     = useState(false)
  const [booted,   setBooted]     = useState(false)
  const [testCard, setTestCard]   = useState(true)
  const [osdLabel, setOsdLabel]   = useState('')
  const [osdOn,    setOsdOn]      = useState(false)
  const [spinDir,  setSpinDir]    = useState<'l' | 'r' | null>(null)
  const osdTimer      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spinTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const testCardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 1200)
    return () => clearTimeout(t)
  }, [])

  // auto-dismiss test card 4 s after boot
  useEffect(() => {
    if (!booted) return
    testCardTimer.current = setTimeout(() => setTestCard(false), 4000)
    return () => { if (testCardTimer.current) clearTimeout(testCardTimer.current) }
  }, [booted])

  const changeChannel = useCallback((dir: 1 | -1) => {
    if (staticOn) return
    setTestCard(false)
    if (testCardTimer.current) clearTimeout(testCardTimer.current)
    setStatic(true)
    setSpinDir(dir === -1 ? 'l' : 'r')
    if (spinTimer.current) clearTimeout(spinTimer.current)
    spinTimer.current = setTimeout(() => setSpinDir(null), 380)
    setTimeout(() => {
      setCh(c => {
        const next = (c + dir + CHANNELS.length) % CHANNELS.length
        setOsdLabel(CHANNELS[next].label)
        setOsdOn(true)
        if (osdTimer.current) clearTimeout(osdTimer.current)
        osdTimer.current = setTimeout(() => setOsdOn(false), 1500)
        return next
      })
      setStatic(false)
    }, 240)
  }, [staticOn])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  changeChannel(-1)
      if (e.key === 'ArrowRight') changeChannel(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [changeChannel])

  return (
    <section className="gh-section">
      <div className="gh-tv">

        {/* ── antenna ── */}
        <div className="gh-antenna" aria-hidden="true">
          <div className="gh-antenna-rod gh-antenna-rod--l" />
          <div className="gh-antenna-rod gh-antenna-rod--r" />
          <div className="gh-antenna-base" />
        </div>

        {/* ── TV body ── */}
        <div className="gh-tv-body">

          {/* screen inset bezel */}
          <div className="gh-screen-bezel">
            <div
              className={`gh-screen${!booted ? ' gh-screen--boot' : ''}${staticOn ? ' gh-screen--static' : ''}`}
              style={{
                '--ch-tint': CHANNELS[ch].tint,
                '--ch-hue':  CHANNELS[ch].hue,
              } as React.CSSProperties}
            >
              {/* background color glow */}
              <div className="gh-screen-glow" aria-hidden="true" />

              {/* animated SVG grain */}
              <svg className="gh-grain" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <filter id="grain">
                  <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch">
                    <animate attributeName="baseFrequency" dur="8s" values="0.72;0.68;0.74;0.70;0.72" repeatCount="indefinite" />
                  </feTurbulence>
                  <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#grain)" opacity="0.07" />
              </svg>

              {/* graffiti cloud */}
              <div className="gh-cloud-wrap">
                <svg className="gh-cloud" viewBox="0 0 720 480" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <filter id="goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
                      <feColorMatrix in="blur" type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
                        result="goo"
                      />
                      <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                    <radialGradient id="blobGrad" cx="40%" cy="35%" r="65%" fx="38%" fy="32%">
                      <stop offset="0%"   stopColor="#2e2e2e" />
                      <stop offset="55%"  stopColor="#1e1e1e" />
                      <stop offset="100%" stopColor="#111111" />
                    </radialGradient>
                  </defs>
                  <g filter="url(#goo)">
                    <ellipse cx="360" cy="220" rx="210" ry="140" fill="url(#blobGrad)" />
                    <ellipse cx="220" cy="200" rx="130" ry="110" fill="url(#blobGrad)" />
                    <ellipse cx="500" cy="200" rx="120" ry="105" fill="url(#blobGrad)" />
                    <ellipse cx="360" cy="140" rx="160" ry="100" fill="url(#blobGrad)" />
                    <ellipse cx="160" cy="230" rx="90"  ry="80"  fill="url(#blobGrad)" />
                    <ellipse cx="560" cy="235" rx="85"  ry="78"  fill="url(#blobGrad)" />
                    <circle  cx="260" cy="115" r="72"            fill="url(#blobGrad)" />
                    <circle  cx="360" cy="90"  r="78"            fill="url(#blobGrad)" />
                    <circle  cx="470" cy="108" r="68"            fill="url(#blobGrad)" />
                    <circle  cx="170" cy="180" r="55"            fill="url(#blobGrad)" />
                    <circle  cx="550" cy="175" r="55"            fill="url(#blobGrad)" />
                    <circle  cx="118" cy="235" r="52"            fill="url(#blobGrad)" />
                    <circle  cx="600" cy="230" r="50"            fill="url(#blobGrad)" />
                    <ellipse cx="360" cy="300" rx="200" ry="70"  fill="url(#blobGrad)" />
                    <ellipse cx="240" cy="290" rx="100" ry="55"  fill="url(#blobGrad)" />
                    <ellipse cx="480" cy="290" rx="95"  ry="52"  fill="url(#blobGrad)" />
                    <ellipse cx="210" cy="355" rx="18"  ry="55"  fill="url(#blobGrad)" />
                    <ellipse cx="210" cy="412" rx="14"  ry="20"  fill="url(#blobGrad)" />
                    <ellipse cx="310" cy="360" rx="16"  ry="70"  fill="url(#blobGrad)" />
                    <ellipse cx="310" cy="432" rx="13"  ry="18"  fill="url(#blobGrad)" />
                    <ellipse cx="390" cy="350" rx="14"  ry="50"  fill="url(#blobGrad)" />
                    <ellipse cx="390" cy="402" rx="12"  ry="16"  fill="url(#blobGrad)" />
                    <ellipse cx="470" cy="365" rx="17"  ry="65"  fill="url(#blobGrad)" />
                    <ellipse cx="470" cy="432" rx="14"  ry="19"  fill="url(#blobGrad)" />
                    <ellipse cx="540" cy="348" rx="13"  ry="42"  fill="url(#blobGrad)" />
                    <ellipse cx="540" cy="392" rx="11"  ry="14"  fill="url(#blobGrad)" />
                  </g>
                  <circle cx="80"  cy="120" r="18" fill="url(#blobGrad)" opacity="0.7"  />
                  <circle cx="55"  cy="150" r="11" fill="url(#blobGrad)" opacity="0.55" />
                  <circle cx="640" cy="115" r="22" fill="url(#blobGrad)" opacity="0.7"  />
                  <circle cx="665" cy="148" r="13" fill="url(#blobGrad)" opacity="0.5"  />
                  <circle cx="100" cy="310" r="14" fill="url(#blobGrad)" opacity="0.55" />
                  <circle cx="620" cy="305" r="16" fill="url(#blobGrad)" opacity="0.55" />
                  <circle cx="340" cy="60"  r="14" fill="url(#blobGrad)" opacity="0.5"  />
                  <circle cx="600" cy="80"  r="10" fill="url(#blobGrad)" opacity="0.4"  />
                  <circle cx="120" cy="85"  r="10" fill="url(#blobGrad)" opacity="0.4"  />
                </svg>
              </div>

              <SideMenu activeChannel={ch} />

              {/* ── test card / station ID ── */}
              <div
                className={`gh-test-card${testCard && booted ? ' gh-test-card--on' : ''}`}
                aria-hidden="true"
              >
                <div className="gh-test-bars" />
                <div className="gh-test-id">
                  <span className="gh-test-station">LONDON X</span>
                  <span className="gh-test-sub">OFFICIAL CHANNEL</span>
                </div>
                <div className="gh-test-corner">● SIGNAL TEST</div>
                <div className="gh-test-hint">◂ ARROW KEYS TO BROWSE ▸</div>
              </div>

              {/* CRT layer stack */}
              <div className="gh-scanlines"  aria-hidden="true" />
              <div className="gh-roll-bar"   aria-hidden="true" />
              <div className="gh-vignette"   aria-hidden="true" />
              <div className="gh-ch-tint"    aria-hidden="true" />

              {/* channel OSD */}
              <div className="gh-ch-display">CH {CHANNELS[ch].num}</div>
              <div
                className={`gh-ch-osd${osdOn ? ' gh-ch-osd--on' : ''}`}
                style={{
                  '--osd-color': CHANNELS[ch].osdColor,
                  '--osd-glow':  CHANNELS[ch].osdGlow,
                } as React.CSSProperties}
                aria-live="polite"
              >
                {osdLabel}
              </div>
            </div>
          </div>

          {/* controls row */}
          <div
            className="gh-controls"
            style={{ '--ch-led': CHANNELS[ch].ledColor } as React.CSSProperties}
          >
            <span className="gh-ch-name">{CHANNELS[ch].label}</span>
            <div className="gh-knobs">
              <button
                className={`gh-knob${spinDir === 'l' ? ' gh-knob--spin-l' : ''}`}
                onClick={() => changeChannel(-1)}
                aria-label="Previous channel"
              >◂</button>
              <div className="gh-speaker-dots" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
              </div>
              <button
                className={`gh-knob${spinDir === 'r' ? ' gh-knob--spin-r' : ''}`}
                onClick={() => changeChannel(1)}
                aria-label="Next channel"
              >▸</button>
            </div>
          </div>
        </div>

        {/* ── stand ── */}
        <div className="gh-tv-stand" aria-hidden="true">
          <div className="gh-tv-leg gh-tv-leg--l" />
          <div className="gh-tv-leg gh-tv-leg--r" />
        </div>

      </div>
    </section>
  )
}
