import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import { photoBase64, videoBase64 } from './photo-library-proof-media'

const errorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'

export default function OneNativePhotoLibrary() {
  const [status, setStatus] = useState('idle')
  const [permission, setPermission] = useState(() => One.iOS.PhotoLibrary.getAddPermissionStatus())
  const [readPermission, setReadPermission] = useState(() => One.iOS.PhotoLibrary.getReadPermissionStatus())
  const [result, setResult] = useState('none')
  const [readResult, setReadResult] = useState('none')
  const [savedIds, setSavedIds] = useState<string[]>([])

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
      setSavedIds([imageId, videoId])
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

  async function read() {
    setStatus('read-checking')
    try {
      const [imageId, videoId] = savedIds
      if (!imageId || !videoId) throw new Error('save the proof assets first')
      let before = 'alreadyGranted'
      let getBefore = 'alreadyGranted'
      if (readPermission === 'notDetermined') {
        try {
          await One.iOS.PhotoLibrary.listAssets(0, 1)
        } catch (error) {
          before = errorCode(error)
        }
        try {
          await One.iOS.PhotoLibrary.getAsset(imageId)
        } catch (error) {
          getBefore = errorCode(error)
        }
      }
      setStatus('read-requesting')
      const granted = await One.iOS.PhotoLibrary.requestReadPermission()
      const current = One.iOS.PhotoLibrary.getReadPermissionStatus()
      setReadPermission(current)
      if (current !== granted) throw new Error(`read status mismatch: ${current} / ${granted}`)
      if (granted !== 'authorized' && granted !== 'limited') {
        throw new Error(`read permission: ${granted}`)
      }
      setStatus('reading')
      const page = await One.iOS.PhotoLibrary.listAssets(0, 100)
      let listedImage = page.assets.some((asset) => asset.identifier === imageId)
      let listedVideo = page.assets.some((asset) => asset.identifier === videoId)
      for (let offset = 100; offset < page.totalCount && (!listedImage || !listedVideo); offset += 100) {
        const next = await One.iOS.PhotoLibrary.listAssets(offset, 100)
        listedImage ||= next.assets.some((asset) => asset.identifier === imageId)
        listedVideo ||= next.assets.some((asset) => asset.identifier === videoId)
      }
      const image = await One.iOS.PhotoLibrary.getAsset(imageId)
      const video = await One.iOS.PhotoLibrary.getAsset(videoId)
      let invalid = ''
      try {
        await One.iOS.PhotoLibrary.listAssets(0, 101)
      } catch (error) {
        invalid = errorCode(error)
      }
      let missing = ''
      try {
        await One.iOS.PhotoLibrary.getAsset('missing-asset-id')
      } catch (error) {
        missing = errorCode(error)
      }
      setReadResult(
        `before=${before}; getBefore=${getBefore}; permission=${granted}; count=${page.totalCount}; ` +
        `listed=${listedImage && listedVideo}; ` +
        `image=${image.identifier === imageId && image.mediaType === 'image' &&
          image.width > 0 && image.height > 0 && image.durationMs === 0 &&
          typeof image.creationDateMs === 'number' && typeof image.isFavorite === 'boolean'}; ` +
        `video=${video.identifier === videoId && video.mediaType === 'video' &&
          video.width > 0 && video.height > 0 && video.durationMs > 0 &&
          typeof video.creationDateMs === 'number' && typeof video.isFavorite === 'boolean'}; ` +
        `invalid=${invalid}; missing=${missing}`
      )
      setStatus('read-passed')
    } catch (error) {
      setStatus(`read-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-photo-library-permission">Permission: {permission}</Text>
      <Text testID="one-native-photo-library-status">Status: {status}</Text>
      <Text testID="one-native-photo-library-result">Result: {result}</Text>
      <Text testID="one-native-photo-library-read-permission">Read permission: {readPermission}</Text>
      <Text testID="one-native-photo-library-read-result">Read result: {readResult}</Text>
      <Pressable testID="one-native-photo-library-run" style={styles.chip} onPress={run}>
        <Text>Save image and video to Photos</Text>
      </Pressable>
      <Pressable testID="one-native-photo-library-read" style={styles.chip} onPress={read}>
        <Text>Read saved Photos assets</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
