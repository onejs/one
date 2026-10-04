import { useRef, useState, type ComponentRef } from 'react'
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function errorCode(error: unknown): string {
  if (error instanceof TypeError) return `TypeError:${error.message}`
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code : error instanceof Error ? error.message : String(error)
}

export default function OneNativeViewSnapshot() {
  const targetRef = useRef<ComponentRef<typeof View>>(null)
  const [showTarget, setShowTarget] = useState(true)
  const [viewTag, setViewTag] = useState<number | null>(null)
  const [uri, setUri] = useState('')
  const [dimensions, setDimensions] = useState('none')
  const [size, setSize] = useState(0)
  const [status, setStatus] = useState('idle')
  const [invalid, setInvalid] = useState('none')
  const [stale, setStale] = useState('none')

  const capture = async () => {
    try {
      const tag = findNodeHandle(targetRef.current)
      if (tag == null) throw new Error('target has no native handle')
      const image = await One.ScreenCapture.captureView(tag)
      setViewTag(tag)
      setUri(image.uri)
      setDimensions(`${image.width}x${image.height}`)
      setSize(image.size)
      setStatus('captured')
    } catch (error) {
      setStatus(`failed ${errorCode(error)}`)
    }
  }

  const checkInvalid = async () => {
    let zero = 'accepted'
    let fraction = 'accepted'
    try { await One.ScreenCapture.captureView(0) } catch (error) { zero = errorCode(error) }
    try { await One.ScreenCapture.captureView(1.5) } catch (error) { fraction = errorCode(error) }
    setInvalid(`${zero}|${fraction}`)
  }

  const checkStale = async () => {
    if (viewTag === null) return
    try {
      await One.ScreenCapture.captureView(viewTag)
      setStale('accepted')
    } catch (error) {
      setStale(errorCode(error))
    }
  }

  const deleteFile = async () => {
    if (!uri) return
    await One.FileSystem.delete(uri)
    setUri('')
    setStatus('deleted')
  }

  return (
    <View style={styles.screen}>
      <Text>View snapshot: {status}</Text>
      <Text>View file: {uri ? uri.split('/').pop() : 'none'}</Text>
      <Text>View dimensions: {dimensions}</Text>
      <Text>View bytes: {size}</Text>
      <Text>Invalid tags: {invalid}</Text>
      <Text>Stale tag: {stale}</Text>
      <Pressable testID="one-native-view-snapshot-capture" onPress={capture}><Text>Capture native view</Text></Pressable>
      <Pressable testID="one-native-view-snapshot-invalid" onPress={checkInvalid}><Text>Check invalid tags</Text></Pressable>
      <Pressable testID="one-native-view-snapshot-delete" onPress={deleteFile}><Text>Delete view PNG</Text></Pressable>
      <Pressable testID="one-native-view-snapshot-unmount" onPress={() => setShowTarget(false)}><Text>Unmount target</Text></Pressable>
      <Pressable testID="one-native-view-snapshot-stale" onPress={checkStale}><Text>Capture stale tag</Text></Pressable>
      {showTarget && (
        <View ref={targetRef} collapsable={false} testID="one-native-view-snapshot-target" style={styles.target}>
          <View testID="one-native-view-snapshot-blue" style={styles.blue} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8, backgroundColor: '#ffffff' },
  target: { width: 160, height: 160, backgroundColor: '#ef2b1d' },
  blue: { position: 'absolute', top: 40, left: 40, width: 80, height: 80, backgroundColor: '#1358e8' },
})
