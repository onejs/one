import { useRef, useState } from 'react'
import { One, type CameraViewRef } from 'one'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

const AnyCameraView = Platform.OS === 'android' ? One.Android.CameraView : One.iOS.CameraView

export default function OneNativeCamera() {
  const [active, setActive] = useState(false)
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [state, setState] = useState('waiting')
  const [permission, setPermission] = useState('not-read')
  const [code, setCode] = useState('none')
  const [zoom, setZoom] = useState(0)
  const [torch, setTorch] = useState(false)
  const [picture, setPicture] = useState('none')
  const camera = useRef<CameraViewRef>(null)
  const taken = useRef(0)

  const takePicture = async () => {
    setPicture('taking')
    try {
      const result = await camera.current!.takePicture({ quality: 0.7, base64: true })
      const scheme = result.uri.split(':')[0]
      taken.current += 1
      setPicture(
        `#${taken.current} ${result.width}x${result.height} ${result.format} ${scheme} base64:${result.base64?.slice(0, 4)}`
      )
    } catch (error) {
      setPicture(`error:${error instanceof Error && 'code' in error ? error.code : String(error)}`)
    }
  }

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
      <Text testID="one-native-camera-state">Camera state: {state}</Text>
      <Text>Camera permission: {permission}</Text>
      <Text>Camera active: {String(active)}</Text>
      <Text>Camera facing: {facing}</Text>
      <Text>Camera code: {code}</Text>
      <Text testID="one-native-camera-zoom">Camera zoom: {zoom} torch: {String(torch)}</Text>
      <Text testID="one-native-camera-picture">Camera picture: {picture}</Text>
      <AnyCameraView
        ref={camera}
        testID="one-native-camera-preview"
        accessibilityLabel="Camera preview"
        style={styles.preview}
        active={active}
        facing={facing}
        codeTypes={['qr', 'ean13', 'code128']}
        zoom={zoom}
        enableTorch={torch}
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
      <Pressable testID="one-native-camera-take-picture" onPress={takePicture}>
        <Text>Take picture</Text>
      </Pressable>
      <Pressable
        testID="one-native-camera-zoom-torch"
        onPress={() => {
          setZoom((value) => (value === 0 ? 0.5 : 0))
          setTorch((value) => !value)
        }}
      >
        <Text>Zoom and torch</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, gap: 12 },
  preview: { height: 220, backgroundColor: '#202020' },
})
