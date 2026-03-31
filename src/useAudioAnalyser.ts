import { useRef, useEffect, RefObject } from 'react'

export interface AudioBands {
  bass:  number  // 0..1, kick/sub
  mids:  number  // 0..1, groove
  highs: number  // 0..1, hats/air
}

// Smoothed audio analyser from mic/line-in.
// Returns a ref that holds the latest AudioBands.
// Call hook once at top level; share the ref downward.
export function useAudioAnalyser(): RefObject<AudioBands> {
  const bands = useRef<AudioBands>({ bass: 0, mids: 0, highs: 0 })

  useEffect(() => {
    let animId: number
    let ctx: AudioContext
    let source: MediaStreamAudioSourceNode
    let analyser: AnalyserNode
    let stream: MediaStream

    // Smoothed values — persist across animation frames
    let sBass = 0, sMids = 0, sHighs = 0

    async function init() {
      try {
        stream  = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        ctx     = new AudioContext()
        source  = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = 128
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          analyser.getByteFrequencyData(data)

          // Bin layout at fftSize=128: 64 bins, each ~344 Hz wide at 44.1 kHz
          // bin 0-1   ≈ 0-688 Hz    → bass/kick
          // bin 4-8   ≈ 1.4-2.8 kHz → mids
          // bin 14-20 ≈ 4.8-6.9 kHz → highs/hats
          const rawBass  = (data[1] + data[2]) / 2 / 255
          const rawMids  = (data[5] + data[6] + data[7]) / 3 / 255
          const rawHighs = (data[15] + data[16] + data[17]) / 3 / 255

          // Lerp for smoothing — low factor = buttery, no twitch
          const L = 0.04
          sBass  = sBass  + (rawBass  - sBass)  * L
          sMids  = sMids  + (rawMids  - sMids)  * L
          sHighs = sHighs + (rawHighs - sHighs) * L

          bands.current = {
            bass:  Math.min(sBass,  1),
            mids:  Math.min(sMids,  1),
            highs: Math.min(sHighs, 1),
          }

          animId = requestAnimationFrame(tick)
        }

        tick()
      } catch {
        // Mic denied or unavailable — bands stay at 0, no crash
      }
    }

    init()

    return () => {
      cancelAnimationFrame(animId)
      analyser?.disconnect()
      source?.disconnect()
      stream?.getTracks().forEach(t => t.stop())
      ctx?.close()
    }
  }, [])

  return bands
}
