import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, usePreventScreenCapture } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// holds prevention through the hook for exactly as long as it is mounted.
function PreventGuard() {
  usePreventScreenCapture('guard')
  return null
}

async function runPreventChecks(report: (name: string, value: string) => void) {
  const capture = One.ScreenCapture
  const initial = await capture.isPrevented()
  report('Prevent initial', String(initial))
  try {
    await capture.prevent('proof')
    report('Prevent active', String(await capture.isPrevented()))
    await capture.prevent('proof-second')
    await capture.allow()
    report('Prevent kept', String(await capture.isPrevented()))
    await capture.allow('proof')
    await capture.allow('proof-second')
    report('Prevent released', String(await capture.isPrevented()))
    try {
      await capture.prevent(0 as never)
      report('Prevent invalid', 'accepted')
    } catch (error) {
      report('Prevent invalid', message(error))
    }
  } finally {
    await capture.allow('proof')
    await capture.allow('proof-second')
    report('Prevent restored', String(await capture.isPrevented()))
  }
}

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
  const [preventResults, setPreventResults] = useState<[string, string][]>([])
  const [preventStatus, setPreventStatus] = useState('idle')
  const [holdStatus, setHoldStatus] = useState('idle')
  const [guardMounted, setGuardMounted] = useState(false)
  const [guardStatus, setGuardStatus] = useState('idle')
  const removeScreenshotRef = useRef<() => void>(() => {})

  useEffect(() => {
    const removeState = One.ScreenCapture.addStateListener((value) => {
      setState(value)
      setEvents((previous) => [...previous, value])
    })
    const removeScreenshot = One.ScreenCapture.addScreenshotListener((timestampMs) => {
      setScreenshotCount((previous) => previous + 1)
      setLastTimestamp(timestampMs)
    })
    removeScreenshotRef.current = removeScreenshot
    One.ScreenCapture.getState().then(setState, (error: unknown) => {
      setState(error instanceof Error ? error.message : String(error))
    })
    return () => {
      removeState()
      removeScreenshot()
    }
  }, [])

  const refresh = async () => {
    setState(await One.ScreenCapture.getState())
    setStatus('refreshed')
  }

  const captureWindow = async () => {
    try {
      const result = await One.ScreenCapture.captureWindow()
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
    await One.FileSystem.delete(captureUri)
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
      <Pressable
        testID="one-native-screen-capture-unsubscribe"
        onPress={() => {
          removeScreenshotRef.current()
          setListening(false)
        }}
      >
        <Text>Stop screenshot listener</Text>
      </Pressable>
      <Pressable testID="one-native-screen-capture-refresh" onPress={refresh}>
        <Text>Refresh capture state</Text>
      </Pressable>
      <Text>Prevention: {preventStatus}</Text>
      {preventResults.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-screen-capture-prevent-run"
        onPress={() => {
          setPreventResults([])
          setPreventStatus('running')
          runPreventChecks((name, value) =>
            setPreventResults((current) => [...current, [name, value]])
          ).then(
            () => setPreventStatus('done'),
            (error: unknown) => setPreventStatus(`failed ${message(error)}`)
          )
        }}
      >
        <Text>Run prevent checks</Text>
      </Pressable>
      <Text>Prevention hold: {holdStatus}</Text>
      <Pressable
        testID="one-native-screen-capture-prevent-hold"
        onPress={async () => {
          try {
            await One.ScreenCapture.prevent('hold')
            setHoldStatus(`held ${await One.ScreenCapture.isPrevented()}`)
          } catch (error) {
            setHoldStatus(`failed ${message(error)}`)
          }
        }}
      >
        <Text>Hold prevention</Text>
      </Pressable>
      <Pressable
        testID="one-native-screen-capture-prevent-release"
        onPress={async () => {
          await One.ScreenCapture.allow('hold')
          setHoldStatus(`released ${await One.ScreenCapture.isPrevented()}`)
        }}
      >
        <Text>Release prevention</Text>
      </Pressable>
      <Text>Guard check: {guardStatus}</Text>
      {guardMounted ? <PreventGuard /> : null}
      <View style={styles.row}>
        <Pressable
          testID="one-native-screen-capture-guard-toggle"
          onPress={() => {
            setGuardStatus('idle')
            setGuardMounted((mounted) => !mounted)
          }}
        >
          <Text>Toggle prevent guard</Text>
        </Pressable>
        <Pressable
          testID="one-native-screen-capture-guard-check"
          onPress={async () => {
            try {
              const prevented = await One.ScreenCapture.isPrevented()
              setGuardStatus(`${guardMounted ? 'mounted' : 'unmounted'} ${prevented}`)
            } catch (error) {
              setGuardStatus(`failed ${message(error)}`)
            }
          }}
        >
          <Text>Check prevent guard</Text>
        </Pressable>
      </View>
      <View testID="one-native-screen-capture-red" pointerEvents="none" style={styles.red} />
      <View testID="one-native-screen-capture-blue" pointerEvents="none" style={styles.blue} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8, backgroundColor: '#ffffff' },
  row: { flexDirection: 'row', gap: 16 },
  red: {
    position: 'absolute',
    top: 550,
    left: 40,
    width: 80,
    height: 80,
    backgroundColor: '#ef2b1d',
  },
  blue: {
    position: 'absolute',
    top: 550,
    left: 160,
    width: 80,
    height: 80,
    backgroundColor: '#1358e8',
  },
})
