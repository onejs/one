import { useEffect, useRef, useState } from 'react'
import { useLocalSearchParams } from 'one'
import { Platform, Text, View } from 'react-native'
import { BenchList } from '../fixtures/native-screens/bench'

// item 3: a 2,000-row array prop with one row changed, end to end. each cycle
// flips one row, bumps tick, and times setState to the native onApplied
// callback. "same" cycles send the rows unchanged, so tick and the callback
// round trip alone are the baseline; the two kinds alternate so host drift
// cancels. every update re-sends all rows, so ?rows=10 gives the fixed cost of
// the round trip to subtract from the 2,000 row run. encode is JSON.stringify of
// the rows, the lower bound of the js side.
const CYCLES = 30
const makeRows = (count: number) =>
  Array.from({ length: count }, (_, id) => ({ id, title: `Row ${id}`, value: id / 7, flag: false }))

interface Sample {
  kind: 'large' | 'same'
  ms: number
}

export default function NativeScreensBench() {
  const ROWS = Number(useLocalSearchParams<{ rows?: string }>().rows ?? 2000)
  const [state, setState] = useState({ rows: makeRows(ROWS), tick: 0 })
  const [report, setReport] = useState('idle')
  const pending = useRef<{ tick: number; start: number; kind: Sample['kind'] } | null>(null)
  const samples = useRef<Sample[]>([])
  const encode = useRef<number[]>([])
  const rowsRef = useRef(state.rows)

  const step = (tick: number) => {
    const kind: Sample['kind'] = tick % 2 === 0 ? 'large' : 'same'
    if (kind === 'large') {
      const at = (tick * 37) % ROWS
      rowsRef.current = rowsRef.current.map((row, id) => (id === at ? { ...row, flag: !row.flag } : row))
    }
    const rows = rowsRef.current
    const encodeStart = performance.now()
    JSON.stringify(rows)
    encode.current.push(performance.now() - encodeStart)
    const start = performance.now()
    pending.current = { tick, start, kind }
    setState({ rows, tick })
  }

  const onApplied = (tick: number) => {
    const current = pending.current
    if (!current || current.tick !== tick) return
    pending.current = null
    samples.current.push({ kind: current.kind, ms: performance.now() - current.start })
    if (tick < CYCLES * 2) {
      // let the frame settle before the next update
      setTimeout(() => step(tick + 1), 400)
      return
    }
    const stat = (kind: Sample['kind']) => {
      const values = samples.current.filter((s) => s.kind === kind).map((s) => s.ms).slice(2).sort((a, b) => a - b)
      return {
        n: values.length,
        median: +values[Math.floor(values.length / 2)].toFixed(1),
        p90: +values[Math.floor(values.length * 0.9)].toFixed(1),
        max: +values[values.length - 1].toFixed(1),
      }
    }
    const line = JSON.stringify({ platform: Platform.OS, rows: ROWS, encodeMedianMs: +encode.current.slice(2).sort((a, b) => a - b)[Math.floor((encode.current.length - 2) / 2)].toFixed(1), large: stat('large'), same: stat('same') })
    console.log(`NATIVE_SCREENS_BENCH ${line}`)
    setReport(line)
  }

  useEffect(() => {
    const timer = setTimeout(() => step(1), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <Text testID="bench-report">{report}</Text>
      <BenchList style={{ flex: 1 }} rows={state.rows} tick={state.tick} onApplied={onApplied} />
    </View>
  )
}
