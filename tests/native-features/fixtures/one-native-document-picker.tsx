import { useState } from 'react'
import { One } from 'one'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function OneNativeDocumentPicker() {
  const [result, setResult] = useState('idle')
  const [assets, setAssets] = useState(0)
  const [name, setName] = useState('-')
  const [mime, setMime] = useState('-')
  const [size, setSize] = useState(0)
  const [fetched, setFetched] = useState(0)
  const [uri, setUri] = useState('')
  const [code, setCode] = useState('-')
  const [error, setError] = useState('-')

  const pick = async (multiple: boolean) => {
    setResult('picking')
    setAssets(0)
    setName('-')
    setMime('-')
    setSize(0)
    setFetched(0)
    setUri('')
    setCode('-')
    setError('-')
    try {
      const picked = await One.DocumentPicker.getDocument({ multiple })
      if (picked.canceled) {
        setResult('canceled')
        return
      }
      const [first] = picked.assets
      setAssets(picked.assets.length)
      setName(first.name)
      setMime(first.mimeType ?? '-')
      setSize(first.size ?? 0)
      setUri(first.uri)
      // reading needs no file system module: fetch reads file uris.
      const bytes = await (await fetch(first.uri)).arrayBuffer()
      setFetched(bytes.byteLength)
      setResult('ok')
    } catch (unknown) {
      const failure = unknown as { code?: string; message?: string }
      setResult('error')
      setCode(failure.code ?? '-')
      setError(failure.message ?? String(unknown))
    }
  }

  const status: [string, string | number][] = [
    ['Result', result],
    ['Assets', assets],
    ['Name', name],
    ['Mime', mime],
    ['Size', size],
    ['Fetched', fetched],
    ['Code', code],
    ['Error', error],
  ]

  return (
    <View style={styles.screen} testID="one-native-document-picker-screen">
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-document-picker-single"
          onPress={() => pick(false)}
        >
          <Text style={styles.actionText}>Pick a file</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-document-picker-multiple"
          onPress={() => pick(true)}
        >
          <Text style={styles.actionText}>Pick files</Text>
        </Pressable>
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-document-picker-status-${label.toLowerCase()}`}
          >{`${label}: ${value}`}</Text>
        ))}
        {uri ? (
          <Text
            style={styles.statusText}
            testID="one-native-document-picker-status-uri"
          >{`Uri: ${uri}`}</Text>
        ) : null}
      </View>
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
})
