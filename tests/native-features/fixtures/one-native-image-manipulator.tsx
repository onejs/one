import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import { photoBase64 } from './photo-library-proof-media'

const errorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  )
}

export default function OneNativeImageManipulator() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')
  const [preview, setPreview] = useState('')

  async function run() {
    setStatus('running')
    try {
      const source = One.FileSystem.getDirectories().cache + 'one-native-image-source.heic'
      await One.FileSystem.writeFile(source, photoBase64, 'base64')
      const upright = await One.ImageManipulator.transform(source, { format: 'png' })
      const jpeg = await One.ImageManipulator.transform(source, {
        crop: { x: 40, y: 0, width: 40, height: 30 },
        resize: { width: 20 },
        rotate: 90,
        quality: 0.6,
      })
      const png = await One.ImageManipulator.transform(source, {
        crop: { x: 5, y: 5, width: 20, height: 10 },
        format: 'png',
      })
      const uprightSize = await imageSize(upright.uri)
      const jpegSize = await imageSize(jpeg.uri)
      const pngSize = await imageSize(png.uri)
      const jpegInfo = await One.FileSystem.getInfo(jpeg.uri)
      const pngInfo = await One.FileSystem.getInfo(png.uri)
      const jpegBytes = new Uint8Array(await (await fetch(jpeg.uri)).arrayBuffer())
      const pngBytes = new Uint8Array(await (await fetch(png.uri)).arrayBuffer())
      let uriError = ''
      let cropError = ''
      let qualityError = ''
      let decodeError = ''
      try {
        await One.ImageManipulator.transform('https://onestack.dev/image.png')
      } catch (error) {
        uriError = errorCode(error)
      }
      try {
        await One.ImageManipulator.transform(source, {
          crop: { x: 1000, y: 0, width: 20, height: 20 },
        })
      } catch (error) {
        cropError = errorCode(error)
      }
      try {
        await One.ImageManipulator.transform(source, { quality: 2 })
      } catch (error) {
        qualityError = errorCode(error)
      }
      const invalid = One.FileSystem.getDirectories().cache + 'one-native-image-invalid.txt'
      await One.FileSystem.writeFile(invalid, 'not an image')
      try {
        await One.ImageManipulator.transform(invalid)
      } catch (error) {
        decodeError = errorCode(error)
      }
      const passed =
        upright.width === 80 && upright.height === 120 &&
        uprightSize.width === 80 && uprightSize.height === 120 &&
        jpeg.width === 15 && jpeg.height === 20 &&
        jpegSize.width === 15 && jpegSize.height === 20 &&
        png.width === 20 && png.height === 10 &&
        pngSize.width === 20 && pngSize.height === 10 &&
        jpegInfo.exists && jpegInfo.size === jpeg.size && jpeg.size > 0 &&
        pngInfo.exists && pngInfo.size === png.size && png.size > 0 &&
        jpegBytes[0] === 0xff && jpegBytes[1] === 0xd8 &&
        pngBytes[0] === 0x89 && pngBytes[1] === 0x50 &&
        pngBytes[2] === 0x4e && pngBytes[3] === 0x47
      setPreview(jpeg.uri)
      setResult(
        `decoded=${passed}; upright=${upright.width}x${upright.height}; ` +
        `jpeg=${jpeg.width}x${jpeg.height}; png=${png.width}x${png.height}; ` +
        `uri=${uriError}; crop=${cropError}; quality=${qualityError}; decode=${decodeError}`
      )
      setStatus(passed ? 'passed' : 'failed')
    } catch (error) {
      setStatus(`error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-image-manipulator-status">Status: {status}</Text>
      <Text testID="one-native-image-manipulator-result">Result: {result}</Text>
      <Pressable testID="one-native-image-manipulator-run" style={styles.chip} onPress={run}>
        <Text>Crop, resize, rotate, and encode</Text>
      </Pressable>
      {preview ? <Image testID="one-native-image-manipulator-preview" source={{ uri: preview }} style={styles.preview} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  preview: { width: 150, height: 200, backgroundColor: '#ddd' },
})
