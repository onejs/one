import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import { updatesBoot } from './updates-boot'

// exercises One.Updates against the suite's static server: the running
// update's reads, check and fetch with their outcomes, the staged update
// plus its listener, and reload. results travel as labels because RN Text
// testIDs vanish from the accessibility snapshot while Pressable IDs
// survive. reload never settles on success (its context is replaced), so
// the button reports sent and the runner asserts the rebooted labels.
// check and fetch report their pending state on press, so a stuck label
// tells a tap that never landed (idle) from a call that never settled.
function codeOf(error: unknown): string {
  if (error instanceof Error) {
    const code = Reflect.get(error, 'code')
    if (typeof code === 'string') return code
  }
  return 'unknown'
}

export default function OneNativeUpdates() {
  const [check, setCheck] = useState('idle')
  const [fetch, setFetch] = useState('idle')
  const [staged, setStaged] = useState(() => One.Updates.getStaged()?.id ?? 'none')
  const [stagedEvents, setStagedEvents] = useState('0')
  const [reload, setReload] = useState('idle')
  const [image, setImage] = useState('none')
  useEffect(() => {
    let count = 0
    const subscription = One.Updates.addStagedListener((next) => {
      count += 1
      setStagedEvents(`${count}:${next?.id ?? 'none'}`)
      setStaged(next?.id ?? 'none')
    })
    return () => subscription.remove()
  }, [])
  const created = One.Updates.createdAt
  const severity = One.Updates.manifest?.metadata.updateSeverity
  return (
    <View style={styles.screen}>
      <Text>{`Marker: ${updatesBoot.marker}`}</Text>
      <Text>{`Enabled: ${One.Updates.isEnabled}`}</Text>
      <Text>{`Embedded: ${One.Updates.isEmbeddedLaunch}`}</Text>
      <Text>{`Runtime: ${One.Updates.runtimeVersion ?? 'none'}`}</Text>
      <Text>{`UpdateId: ${One.Updates.updateId ?? 'none'}`}</Text>
      <Text>{`Created: ${created ? created.toISOString() : 'none'}`}</Text>
      <Text>{`Meta: ${typeof severity === 'string' ? severity : 'none'}`}</Text>
      <Text>{`Check: ${check}`}</Text>
      <Text>{`Fetch: ${fetch}`}</Text>
      <Text>{`Staged: ${staged}`}</Text>
      <Text>{`StagedEvents: ${stagedEvents}`}</Text>
      <Text>{`Reload: ${reload}`}</Text>
      <Text>{`Image: ${image}`}</Text>
      <Image
        source={require('../assets/updates-v2.png')}
        style={{ width: 48, height: 32 }}
        onLoad={(event) => {
          const source = event.nativeEvent.source
          if (source?.width && source?.height) setImage(`${source.width}x${source.height}`)
        }}
      />
      <Pressable
        testID="one-native-updates-check"
        style={styles.chip}
        onPress={() => {
          setCheck('checking')
          One.Updates.check().then(
            (result) => {
              setCheck(result.type === 'available' ? `available:${result.manifest.id}` : 'none')
            },
            (error: unknown) => setCheck(`error:${codeOf(error)}`)
          )
        }}
      >
        <Text>Check for update</Text>
      </Pressable>
      <Pressable
        testID="one-native-updates-fetch"
        style={styles.chip}
        onPress={() => {
          setFetch('fetching')
          One.Updates.fetch().then(
            (result) => {
              setFetch(result.type === 'fetched' ? `fetched:${result.manifest.id}` : 'none')
            },
            (error: unknown) => setFetch(`error:${codeOf(error)}`)
          )
        }}
      >
        <Text>Fetch update</Text>
      </Pressable>
      <Pressable
        testID="one-native-updates-refresh"
        style={styles.chip}
        onPress={() => setStaged(One.Updates.getStaged()?.id ?? 'none')}
      >
        <Text>Refresh staged</Text>
      </Pressable>
      <Pressable
        testID="one-native-updates-reload"
        style={styles.chip}
        onPress={() => {
          setReload('sent')
          One.Updates.reload().then(
            () => setReload('resolved'),
            (error: unknown) => setReload(`error:${codeOf(error)}`)
          )
        }}
      >
        <Text>Reload</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
