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
  const [captureStatus, setCaptureStatus] = useState('idle')
  const [captureUri, setCaptureUri] = useState('')
  const [captureDimensions, setCaptureDimensions] = useState('none')
  const [captureSize, setCaptureSize] = useState(0)
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

  const captureWindow = async () => {
    try {
      const result = await One.iOS.ScreenCapture.captureWindow()
      if (!result.uri.startsWith('file://') || !result.uri.endsWith('.png'))
        throw new Error(`window capture returned a non-PNG file URI: ${result.uri}`)
      setCaptureUri(result.uri)
      setCaptureDimensions(`${result.width}x${result.height}`)
      setCaptureSize(result.size)
      setCaptureStatus('captured')
    } catch (error) {
      setCaptureStatus(`failed ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const deleteCapture = async () => {
    if (!captureUri) return
    await One.iOS.FileSystem.delete(captureUri)
    setCaptureUri('')
    setCaptureStatus('deleted')
  }

  return (
    <View style={styles.screen}>
      <Text>Capture state: {state}</Text>
      <Text>State events: {events.join(',') || 'none'}</Text>
      <Text>Screenshot count: {screenshotCount}</Text>
      <Text>Screenshot timestamp valid: {String(lastTimestamp > 1_000_000_000_000)}</Text>
      <Text>Listening: {String(listening)}</Text>
      <Text>Status: {status}</Text>
      <Text>Window capture: {captureStatus}</Text>
      <Text>Window file: {captureUri ? captureUri.split('/').pop() : 'none'}</Text>
      <Text>Window dimensions: {captureDimensions}</Text>
      <Text>Window bytes: {captureSize}</Text>
      <Pressable testID="one-native-screen-capture-window" onPress={captureWindow}>
        <Text>Capture app window</Text>
      </Pressable>
      <Pressable testID="one-native-screen-capture-delete" onPress={deleteCapture}>
        <Text>Delete captured file</Text>
      </Pressable>
      <Pressable testID="one-native-screen-capture-unsubscribe" onPress={() => {
        removeScreenshotRef.current()
        setListening(false)
      }}>
        <Text>Stop screenshot listener</Text>
      </Pressable>
      <Pressable testID="one-native-screen-capture-refresh" onPress={refresh}>
        <Text>Refresh capture state</Text>
      </Pressable>
      <View testID="one-native-screen-capture-red" style={styles.red} />
      <View testID="one-native-screen-capture-blue" style={styles.blue} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8, backgroundColor: '#ffffff' },
  red: { position: 'absolute', top: 550, left: 40, width: 80, height: 80, backgroundColor: '#ef2b1d' },
  blue: { position: 'absolute', top: 550, left: 160, width: 80, height: 80, backgroundColor: '#1358e8' },
})
