import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeScreenCapture() {
  const [state, setState] = useState('pending')
  const [events, setEvents] = useState<string[]>([])
  const [screenshotCount, setScreenshotCount] = useState(0)
  const [lastTimestamp, setLastTimestamp] = useState(0)
  const [listening, setListening] = useState(true)
  const [status, setStatus] = useState('idle')
  const removeScreenshotRef = useRef<() => void>(() => {})

  useEffect(() => {
    const removeState = One.iOS.ScreenCapture.addStateListener((value) => {
      setState(value)
      setEvents((previous) => [...previous, value])
    })
    const removeScreenshot = One.iOS.ScreenCapture.addScreenshotListener((timestampMs) => {
      setScreenshotCount((previous) => previous + 1)
      setLastTimestamp(timestampMs)
    })
    removeScreenshotRef.current = removeScreenshot
    One.iOS.ScreenCapture.getState().then(setState, (error: unknown) => {
      setState(error instanceof Error ? error.message : String(error))
    })
    return () => {
      removeState()
      removeScreenshot()
    }
  }, [])

  const refresh = async () => {
    setState(await One.iOS.ScreenCapture.getState())
    setStatus('refreshed')
  }

  return (
    <View style={styles.screen}>
      <Text>Capture state: {state}</Text>
      <Text>State events: {events.join(',') || 'none'}</Text>
      <Text>Screenshot count: {screenshotCount}</Text>
      <Text>Screenshot timestamp valid: {String(lastTimestamp > 1_000_000_000_000)}</Text>
      <Text>Listening: {String(listening)}</Text>
      <Text>Status: {status}</Text>
      <Pressable testID="one-native-screen-capture-unsubscribe" onPress={() => {
        removeScreenshotRef.current()
        setListening(false)
      }}>
        <Text>Stop screenshot listener</Text>
      </Pressable>
      <Pressable testID="one-native-screen-capture-refresh" onPress={refresh}>
        <Text>Refresh capture state</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
})
