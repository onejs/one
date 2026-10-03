import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type MotionSensor = Parameters<typeof One.iOS.Motion.addListener>[0]
const sensors: MotionSensor[] = [
  'accelerometer',
  'gyroscope',
  'magnetometer',
  'deviceMotion',
]

export default function OneNativeMotion() {
  const [availability, setAvailability] = useState('pending')
  const [errors, setErrors] = useState<string[]>([])
  const [readings, setReadings] = useState<string[]>([])
  const [invalid, setInvalid] = useState('none')
  const removers = useRef<(() => void)[]>([])

  useEffect(
    () => () => {
      removers.current.forEach((remove) => remove())
      removers.current = []
    },
    []
  )

  const read = () => {
    const value = One.iOS.Motion.getAvailability()
    setAvailability(
      `A=${value.accelerometer} G=${value.gyroscope} M=${value.magnetometer} D=${value.deviceMotion}`
    )
  }

  const start = () => {
    removers.current.forEach((remove) => remove())
    removers.current = sensors.map((sensor) =>
      One.iOS.Motion.addListener(
        sensor,
        100,
        (reading) =>
          setReadings((current) => [
            ...current,
            `${reading.sensor}:${reading.timestampMs > 1_000_000_000_000}`,
          ]),
        (code) => setErrors((current) => [...current, `${sensor}:${code}`])
      )
    )
  }

  const checkInvalid = () => {
    try {
      One.iOS.Motion.addListener(
        'accelerometer',
        -1,
        () => {},
        () => {}
      )
      setInvalid('accepted')
    } catch (error) {
      setInvalid(error instanceof RangeError ? 'RangeError' : String(error))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>Availability: {availability}</Text>
      <Text>Errors: {errors.join(',') || 'none'}</Text>
      <Text>Readings: {readings.join(',') || 'none'}</Text>
      <Text>Invalid interval: {invalid}</Text>
      <Pressable testID="one-native-motion-read" onPress={read}>
        <Text>Read sensors</Text>
      </Pressable>
      <Pressable testID="one-native-motion-start" onPress={start}>
        <Text>Start sensors</Text>
      </Pressable>
      <Pressable testID="one-native-motion-invalid" onPress={checkInvalid}>
        <Text>Invalid interval</Text>
      </Pressable>
      <Pressable
        testID="one-native-motion-stop"
        onPress={() => {
          removers.current.forEach((remove) => remove())
          removers.current = []
        }}
      >
        <Text>Stop sensors</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' },
})

export interface MotionBenchmarkAdapter {
  available(): Promise<boolean>
  subscribe(
    intervalMs: number,
    onReading: (reading: {
      x: number
      y: number
      z: number
      timestampMs: number
    }) => void,
    onError: (message: string) => void
  ): () => void
}

export async function benchmarkMotion(
  adapter: MotionBenchmarkAdapter,
  intervalMs: number
) {
  if (!(await adapter.available())) return { unavailable: true, intervalMs }
  const { distribution } = await import('./native-speed')
  return new Promise((resolve, reject) => {
    const arrivalsMs: number[] = []
    const nativeTimestampsMs: number[] = []
    const handlerUs: number[] = []
    let timer: ReturnType<typeof setTimeout>
    let remove = () => {}
    timer = setTimeout(() => {
      remove()
      reject(new Error('available motion sensor delivered no samples'))
    }, 10000)
    remove = adapter.subscribe(
      intervalMs,
      (reading) => {
        const started = performance.now()
        if (
          ![reading.x, reading.y, reading.z, reading.timestampMs].every(Number.isFinite)
        ) {
          clearTimeout(timer)
          remove()
          reject(new Error('motion reading was not finite'))
          return
        }
        if (!arrivalsMs.length) {
          clearTimeout(timer)
          timer = setTimeout(() => {
            remove()
            const duration = arrivalsMs.at(-1)! - arrivalsMs[0]!
            if (arrivalsMs.length < 2 || duration <= 0) {
              reject(new Error('insufficient motion samples'))
              return
            }
            resolve({
              intervalMs,
              arrivalsMs,
              nativeTimestampsMs,
              handlerUs,
              eventsPerSecond: ((arrivalsMs.length - 1) * 1000) / duration,
              nativeEventsPerSecond:
                ((nativeTimestampsMs.length - 1) * 1000) /
                (nativeTimestampsMs.at(-1)! - nativeTimestampsMs[0]!),
              handler: distribution(handlerUs),
            })
          }, 3000)
        }
        arrivalsMs.push(started)
        nativeTimestampsMs.push(reading.timestampMs)
        handlerUs.push((performance.now() - started) * 1000)
      },
      (message) => {
        clearTimeout(timer)
        remove()
        reject(new Error(message))
      }
    )
  })
}
