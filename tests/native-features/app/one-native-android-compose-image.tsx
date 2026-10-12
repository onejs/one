import { useEffect, useState } from 'react'
import { One } from 'one'

// a verified 1x1 red PNG: signature, 1x1 RGBA, inflatable IDAT.
const redPixelBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export default function OneNativeAndroidComposeImage() {
  const [fileUri, setFileUri] = useState('')
  const [loads, setLoads] = useState(0)
  const [fileError, setFileError] = useState('')
  const [brokenError, setBrokenError] = useState('')

  useEffect(() => {
    let cancelled = false
    const seed = async () => {
      const uri = `${One.FileSystem.getDirectories().cache}one-native-compose-image-red.png`
      await One.FileSystem.writeFile(uri, redPixelBase64, 'base64')
      if (!cancelled) setFileUri(uri)
    }
    seed().catch(() => setFileError('seed failed'))
    return () => {
      cancelled = true
    }
  }, [])

  const fileStatus = fileError
    ? `File: error ${fileError} · Loads: ${loads}`
    : `File: ${loads > 0 ? 'loaded' : 'pending'} · Loads: ${loads}`

  return (
    <One.Android.Column
      testID="one-native-android-compose-image-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-compose-image-file-status"
        text={fileStatus}
      />
      <One.Android.Text
        testID="one-native-android-compose-image-broken-status"
        text={brokenError ? `Broken: error ${brokenError}` : 'Broken: pending'}
      />
      {fileUri ? (
        <One.Android.Image
          testID="one-native-android-compose-image-file"
          source={{ uri: fileUri }}
          contentDescription="Red square"
          composeStyle={{ width: 120, height: 120 }}
          onLoad={() => setLoads((count) => count + 1)}
          onError={(error) => setFileError(error)}
        />
      ) : null}
      <One.Android.Image
        testID="one-native-android-compose-image-broken"
        source={{ uri: 'file:///nonexistent-one-image/broken.png' }}
        contentDescription="Broken image"
        composeStyle={{ width: 120, height: 120 }}
        onError={(error) => setBrokenError(error)}
      />
    </One.Android.Column>
  )
}
