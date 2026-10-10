import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { One } from 'one'

type ScreenOrientationValue = Awaited<
  ReturnType<typeof One.ScreenOrientation.getOrientation>
>

export default function OneNativeScreenOrientation() {
  const { width, height } = useWindowDimensions()
  const [orientation, setOrientation] = useState<ScreenOrientationValue | 'pending'>(
    'pending'
  )
  const [events, setEvents] = useState<ScreenOrientationValue[]>([])
  const [status, setStatus] = useState('idle')

  useEffect(
    () =>
      One.ScreenOrientation.addChangeListener((value) => {
        setEvents((previous) => [...previous, value])
      }),
    []
  )

  const read = async () => {
    try {
      setOrientation(await One.ScreenOrientation.getOrientation())
      setStatus('read')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  const lock = async (value: 'landscapeLeft' | 'portrait') => {
    try {
      setStatus(`locking-${value}`)
      setOrientation(await One.ScreenOrientation.lock(value))
      setStatus(`locked-${value}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  const unlock = async () => {
    try {
      setOrientation(await One.ScreenOrientation.unlock())
      setStatus('unlocked')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Orientation: ${orientation}`}</Text>
      <Text>{`Dimensions: ${Math.round(width)}x${Math.round(height)}`}</Text>
      <Text>{`Events: ${events.join(',') || 'none'}`}</Text>
      <Text>{`Status: ${status}`}</Text>
      <Pressable
        testID="one-native-orientation-read"
        style={styles.button}
        onPress={read}
      >
        <Text>Read orientation</Text>
      </Pressable>
      <Pressable
        testID="one-native-orientation-landscape"
        style={styles.button}
        onPress={() => lock('landscapeLeft')}
      >
        <Text>Lock landscape left</Text>
      </Pressable>
      <Pressable
        testID="one-native-orientation-portrait"
        style={styles.button}
        onPress={() => lock('portrait')}
      >
        <Text>Lock portrait</Text>
      </Pressable>
      <Pressable
        testID="one-native-orientation-unlock"
        style={styles.button}
        onPress={unlock}
      >
        <Text>Unlock orientation</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
