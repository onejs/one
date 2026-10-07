import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeShare() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')
  const [busy, setBusy] = useState('none')

  async function run() {
    setStatus('preparing')
    try {
      const file = One.FileSystem.getDirectories().cache + 'one-native-share-proof.txt'
      await One.FileSystem.writeFile(file, 'One native share proof', 'utf8')
      setStatus('sharing')
      const pending = One.Share.share([
        { type: 'text', value: 'One native share proof' },
        { type: 'url', value: 'https://onestack.dev' },
      ])
      try {
        await One.Share.share([{ type: 'text', value: 'Second share' }])
      } catch (error) {
        setBusy(
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'unknown'
        )
      }
      const shared = await pending
      if (!shared.completed || !shared.activityType) {
        throw new Error(`Copy did not complete the share activity: ${JSON.stringify(shared)}`)
      }
      setStatus('file sharing')
      const fileShared = await One.Share.share([{ type: 'file', value: file }])
      let empty = ''
      try {
        await One.Share.share([])
      } catch (error) {
        empty =
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'unknown'
      }
      let missing = ''
      try {
        await One.Share.share([
          { type: 'file', value: One.FileSystem.getDirectories().cache + 'absent.txt' },
        ])
      } catch (error) {
        missing =
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'unknown'
      }
      let badURL = ''
      try {
        await One.Share.share([{ type: 'url', value: 'onestack.dev' }])
      } catch (error) {
        badURL =
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'unknown'
      }
      let blankText = ''
      try {
        await One.Share.share([{ type: 'text', value: '   ' }])
      } catch (error) {
        blankText =
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'unknown'
      }
      setResult(
        `text=${shared.completed}; activity=${shared.activityType}; file=${fileShared.completed}; ` +
          `empty=${empty}; missing=${missing}; url=${badURL}; blank=${blankText}`
      )
      setStatus('passed')
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      setStatus(
        `error: ${code} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-share-status">Status: {status}</Text>
      <Text testID="one-native-share-result">Result: {result}</Text>
      <Text testID="one-native-share-busy">Busy: {busy}</Text>
      <Pressable testID="one-native-share-run" style={styles.chip} onPress={run}>
        <Text>Share text, link, and file</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
