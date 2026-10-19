import { Profiler, useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

// what the javascript side costs while a list scrolls: react commit time from the
// profiler, and gaps between animation frames, which a busy js thread stretches.
// UIKit's own frame pacing needs Instruments or the driver's capture, not this.
export interface PerfSample {
  commits: number
  commitTotal: number
  commitMax: number
  frames: number
  // frames that took longer than two vsyncs
  longFrames: number
  worstFrame: number
}

const empty = (): PerfSample => ({
  commits: 0,
  commitTotal: 0,
  commitMax: 0,
  frames: 0,
  longFrames: 0,
  worstFrame: 0,
})

export function usePerf() {
  const sample = useRef(empty())
  useEffect(() => {
    let last = 0
    let handle = 0
    const tick = (now: number) => {
      if (last) {
        const gap = now - last
        sample.current.frames++
        if (gap > 34) sample.current.longFrames++
        sample.current.worstFrame = Math.max(sample.current.worstFrame, gap)
      }
      last = now
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [])
  const onRender = (_id: string, _phase: string, duration: number) => {
    sample.current.commits++
    sample.current.commitTotal += duration
    sample.current.commitMax = Math.max(sample.current.commitMax, duration)
  }
  const reset = () => {
    sample.current = empty()
  }
  return { sample, onRender, reset }
}

export function Measured({
  id,
  onRender,
  children,
}: {
  id: string
  onRender: (id: string, phase: string, duration: number) => void
  children: ReactNode
}) {
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  )
}

// refreshes twice a second from the refs, so showing numbers never adds commits to the list
export function PerfStrip({ testID, read }: { testID: string; read: () => string }) {
  const [text, setText] = useState(read)
  useEffect(() => {
    const timer = setInterval(() => setText(read()), 500)
    return () => clearInterval(timer)
  }, [read])
  return (
    <View style={styles.strip}>
      <Text testID={testID} style={styles.text}>
        {text}
      </Text>
    </View>
  )
}

export function describe(sample: PerfSample) {
  const average = sample.commits ? sample.commitTotal / sample.commits : 0
  return `commits ${sample.commits} avg ${average.toFixed(1)}ms max ${sample.commitMax.toFixed(1)}ms; js frames ${sample.frames} long ${sample.longFrames} worst ${sample.worstFrame.toFixed(0)}ms`
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#111827' },
  text: { color: '#f9fafb', fontSize: 11, fontVariant: ['tabular-nums'] },
})
