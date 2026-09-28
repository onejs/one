import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type MotionSensor = Parameters<typeof One.iOS.Motion.addListener>[0]
const sensors: MotionSensor[] = ['accelerometer', 'gyroscope', 'magnetometer', 'deviceMotion']

export default function OneNativeMotion() {
  const [availability, setAvailability] = useState('pending')
  const [errors, setErrors] = useState<string[]>([])
  const [readings, setReadings] = useState<string[]>([])
  const [invalid, setInvalid] = useState('none')
  const removers = useRef<(() => void)[]>([])

  useEffect(() => () => {
    removers.current.forEach((remove) => remove())
    removers.current = []
  }, [])

  const read = () => {
    const value = One.iOS.Motion.getAvailability()
    setAvailability(`A=${value.accelerometer} G=${value.gyroscope} M=${value.magnetometer} D=${value.deviceMotion}`)
  }

  const start = () => {
    removers.current.forEach((remove) => remove())
    removers.current = sensors.map((sensor) => One.iOS.Motion.addListener(
      sensor, 100,
      (reading) => setReadings((current) => [...current, `${reading.sensor}:${reading.timestampMs > 1_000_000_000_000}`]),
      (code) => setErrors((current) => [...current, `${sensor}:${code}`])
    ))
  }

  const checkInvalid = () => {
    try {
      One.iOS.Motion.addListener('accelerometer', 0, () => {}, () => {})
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
      <Pressable testID="one-native-motion-read" onPress={read}><Text>Read sensors</Text></Pressable>
      <Pressable testID="one-native-motion-start" onPress={start}><Text>Start sensors</Text></Pressable>
      <Pressable testID="one-native-motion-invalid" onPress={checkInvalid}><Text>Invalid interval</Text></Pressable>
      <Pressable testID="one-native-motion-stop" onPress={() => {
        removers.current.forEach((remove) => remove())
        removers.current = []
      }}><Text>Stop sensors</Text></Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' },
})
