import { useState, useRef, useEffect } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 2200)
    return () => clearTimeout(t)
  }, [])

  function finish() {
    if (fading) return
    setFading(true)
    setTimeout(onDone, 700)
  }

  function handleSkip() {
    if (videoRef.current) videoRef.current.pause()
    finish()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <video
        ref={videoRef}
        src="/hero-reel.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {showSkip && !fading && (
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            bottom: '2rem',
            right: '2rem',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.28)',
            color: 'rgba(255,255,255,0.4)',
            padding: '0.38rem 1rem',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.55rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '100px',
            animation: 'perfFadeIn 0.4s ease both',
          }}
        >
          skip
        </button>
      )}
    </div>
  )
}
