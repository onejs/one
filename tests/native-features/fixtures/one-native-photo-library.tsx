import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import { photoBase64, videoBase64 } from './photo-library-proof-media'

const errorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'

export default function OneNativePhotoLibrary() {
  const [status, setStatus] = useState('idle')
  const [permission, setPermission] = useState(() => One.iOS.PhotoLibrary.getAddPermissionStatus())
  const [result, setResult] = useState('none')

  async function run() {
    setStatus('checking')
    try {
      const cache = One.iOS.FileSystem.getDirectories().cache
      const image = cache + 'one-native-photo-library.heic'
      const video = cache + 'one-native-photo-library.mp4'
      await One.iOS.FileSystem.writeFile(image, photoBase64, 'base64')
      await One.iOS.FileSystem.writeFile(video, videoBase64, 'base64')
      let before = 'alreadyGranted'
      if (permission === 'notDetermined') {
        try {
          await One.iOS.PhotoLibrary.saveImage(image)
        } catch (error) {
          before = errorCode(error)
        }
      }
      setStatus('requesting')
      const granted = await One.iOS.PhotoLibrary.requestAddPermission()
      setPermission(granted)
      if (granted !== 'authorized') throw new Error(`permission: ${granted}`)
      setStatus('saving')
      const imageId = await One.iOS.PhotoLibrary.saveImage(image)
      const videoId = await One.iOS.PhotoLibrary.saveVideo(video)
      let uri = ''
      try {
        await One.iOS.PhotoLibrary.saveImage('https://onestack.dev/photo.heic')
      } catch (error) {
        uri = errorCode(error)
      }
      let file = ''
      try {
        await One.iOS.PhotoLibrary.saveVideo(cache + 'missing.mp4')
      } catch (error) {
        file = errorCode(error)
      }
      setResult(
        `before=${before}; permission=${granted}; image=${imageId.length > 0}; ` +
          `video=${videoId.length > 0}; distinct=${imageId !== videoId}; ` +
          `uri=${uri}; file=${file}`
      )
      setStatus('passed')
    } catch (error) {
      setStatus(`error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-photo-library-permission">Permission: {permission}</Text>
      <Text testID="one-native-photo-library-status">Status: {status}</Text>
      <Text testID="one-native-photo-library-result">Result: {result}</Text>
      <Pressable testID="one-native-photo-library-run" style={styles.chip} onPress={run}>
        <Text>Save image and video to Photos</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
