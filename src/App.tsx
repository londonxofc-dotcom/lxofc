import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import SplashScreen from './SplashScreen'
import GraffitiHero from './GraffitiHero'

const PerformanceMode = lazy(() => import('./PerformanceMode'))

export default function App() {
  const [splash, setSplash] = useState(true)
  const [perf,   setPerf]   = useState(false)
  const savedScroll = useRef(0)
  const perfRef     = useRef(false)

  function enterPerf() {
    if (perfRef.current) return
    perfRef.current = true
    savedScroll.current = window.scrollY
    document.body.style.overflow = 'hidden'
    document.documentElement.requestFullscreen?.().catch(() => {})
    setPerf(true)
  }

  function exitPerf() {
    perfRef.current = false
    setPerf(false)
    document.body.style.overflow = ''
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    requestAnimationFrame(() => window.scrollTo(0, savedScroll.current))
  }

  useEffect(() => {
    function onFSChange() {
      if (!document.fullscreenElement && perfRef.current) exitPerf()
    }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'p' || e.key === 'P') enterPerf()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* ─── SPLASH ─── */}
      {splash && <SplashScreen onDone={() => {
        import('./PerformanceMode')
        setSplash(false)
      }} />}

      {/* ─── GRAFFITI HERO ─── */}
      <GraffitiHero />

{/* ─── PERFORMANCE MODE ─── */}
      <Suspense fallback={null}>
        {perf && <PerformanceMode onExit={exitPerf} />}
      </Suspense>
    </>
  )
}
