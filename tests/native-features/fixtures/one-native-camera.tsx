import { useState } from 'react'
import { One } from 'one'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function OneNativeCamera() {
  const [active, setActive] = useState(false)
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [state, setState] = useState('waiting')
  const [permission, setPermission] = useState('not-read')
  const [code, setCode] = useState('none')

  const readPermission = async () => {
    try {
      const result = await One.ImagePicker.getCameraPermissions()
      setPermission(result.status)
    } catch (error) {
      setPermission(`error: ${String(error)}`)
    }
  }

  const requestPermission = async () => {
    try {
      const result = await One.ImagePicker.requestCameraPermissions()
      setPermission(result.status)
    } catch (error) {
      setPermission(`error: ${String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>Camera state: {state}</Text>
      <Text>Camera permission: {permission}</Text>
      <Text>Camera active: {String(active)}</Text>
      <Text>Camera facing: {facing}</Text>
      <Text>Camera code: {code}</Text>
      <One.iOS.CameraView
        testID="one-native-camera-preview"
        accessibilityLabel="Camera preview"
        style={styles.preview}
        active={active}
        facing={facing}
        codeTypes={['qr', 'ean13', 'code128']}
        onStateChange={setState}
        onCodeScanned={(event) => setCode(`${event.type}:${event.data}`)}
      />
      <Pressable testID="one-native-camera-read-permission" onPress={readPermission}>
        <Text>Read camera permission</Text>
      </Pressable>
      <Pressable testID="one-native-camera-request-permission" onPress={requestPermission}>
        <Text>Request camera permission</Text>
      </Pressable>
      <Pressable testID="one-native-camera-toggle" onPress={() => setActive((value) => !value)}>
        <Text>Toggle camera</Text>
      </Pressable>
      <Pressable
        testID="one-native-camera-facing"
        onPress={() => setFacing((value) => value === 'back' ? 'front' : 'back')}
      >
        <Text>Switch camera</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, gap: 12 },
  preview: { height: 220, backgroundColor: '#202020' },
})
