import { useState } from 'react'
import { One } from 'one'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

type Failure = { code?: string; message: string }

function toFailure(error: unknown): Failure {
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown }
    return {
      code: typeof code === 'string' ? code : undefined,
      message: typeof message === 'string' ? message : String(error),
    }
  }
  return { message: String(error) }
}

export default function OneNativeImagePicker() {
  const [result, setResult] = useState('idle')
  const [assets, setAssets] = useState(0)
  const [uri, setUri] = useState('')
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [mime, setMime] = useState('-')
  const [file, setFile] = useState('-')
  const [size, setSize] = useState(0)
  const [code, setCode] = useState('-')
  const [error, setError] = useState('-')
  const [permStatus, setPermStatus] = useState('-')
  const [permGranted, setPermGranted] = useState('-')
  const [permAsk, setPermAsk] = useState('-')

  const reset = () => {
    setResult('picking')
    setAssets(0)
    setUri('')
    setWidth(0)
    setHeight(0)
    setMime('-')
    setFile('-')
    setSize(0)
    setCode('-')
    setError('-')
  }

  const show = (
    picked:
      | { canceled: true; assets: null }
      | {
          canceled: false
          assets: {
            uri: string
            width: number
            height: number
            mimeType?: string
            fileName?: string
            fileSize?: number
          }[]
        }
  ) => {
    if (picked.canceled) {
      setResult('canceled')
      return
    }
    const [first] = picked.assets
    setResult('ok')
    setAssets(picked.assets.length)
    setUri(first.uri)
    setWidth(first.width)
    setHeight(first.height)
    setMime(first.mimeType ?? '-')
    setFile(first.fileName ?? '-')
    setSize(first.fileSize ?? 0)
  }

  const fail = (unknown: unknown) => {
    const failure = toFailure(unknown)
    setResult('error')
    setCode(failure.code ?? '-')
    setError(failure.message)
  }

  const pick = async () => {
    reset()
    try {
      show(
        await One.ImagePicker.launchLibrary({
          mediaTypes: 'images',
          selectionLimit: 1,
        })
      )
    } catch (unknown) {
      fail(unknown)
    }
  }

  const shoot = async () => {
    reset()
    try {
      show(await One.ImagePicker.launchCamera())
    } catch (unknown) {
      fail(unknown)
    }
  }

  const readPermissions = async () => {
    try {
      const response = await One.ImagePicker.getCameraPermissions()
      setPermStatus(response.status)
      setPermGranted(String(response.granted))
      setPermAsk(String(response.canAskAgain))
    } catch (unknown) {
      fail(unknown)
    }
  }

  const status: [string, string | number][] = [
    ['Result', result],
    ['Assets', assets],
    ['Width', width],
    ['Height', height],
    ['Mime', mime],
    ['File', file],
    ['Size', size],
    ['Code', code],
    ['Error', error],
    ['PermStatus', permStatus],
    ['PermGranted', permGranted],
    ['PermCanAsk', permAsk],
  ]

  return (
    <View style={styles.screen} testID="one-native-image-picker-screen">
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-image-picker-library"
          onPress={pick}
        >
          <Text style={styles.actionText}>Pick from library</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-image-picker-camera"
          onPress={shoot}
        >
          <Text style={styles.actionText}>Take a photo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-image-picker-permissions"
          onPress={readPermissions}
        >
          <Text style={styles.actionText}>Read permissions</Text>
        </Pressable>
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-image-picker-status-${label.toLowerCase()}`}
          >{`${label}: ${value}`}</Text>
        ))}
        {uri ? (
          <Text
            style={styles.statusText}
            testID="one-native-image-picker-status-uri"
          >{`Uri: ${uri}`}</Text>
        ) : null}
      </View>
      {uri ? (
        <Image
          style={styles.preview}
          testID="one-native-image-picker-preview"
          source={{ uri }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  preview: { marginTop: 8, height: 220, borderRadius: 8, backgroundColor: '#E3E3E8' },
})
