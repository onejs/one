import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// exercises the browser api against the real safari sheet: a user dismiss
// resolving cancel, a programmatic dismiss resolving dismiss, and auth
// sessions ended by dismissAuthSession or by a redirect. a presented sheet
// exposes no accessibility children, so the suite detects the collapsed
// tree and taps the measured close point. the redirect leg points at a
// local 302 the suite serves (127.0.0.1:8123/start), so no live identity
// provider is needed, and ephemeral mode skips the consent alert.
const page = 'https://example.com'
const redirectStart = 'http://127.0.0.1:8123/start'
const redirect = 'nativefeatures://auth'

export default function OneNativeBrowser() {
  const [result, setResult] = useState('none')
  const [opened, setOpened] = useState('none')
  const [dismissed, setDismissed] = useState('none')
  const [auth, setAuth] = useState('none')
  const [warmupResult, setWarmupResult] = useState('none')
  const [mayLaunchResult, setMayLaunchResult] = useState('none')
  return (
    <View style={styles.screen}>
      <Text>{`Result: ${result}`}</Text>
      <Text>{`Opened: ${opened}`}</Text>
      <Text>{`Dismissed: ${dismissed}`}</Text>
      <Text>{`Auth: ${auth}`}</Text>
      <Text>{`Warmup: ${warmupResult}`}</Text>
      <Text>{`MayLaunchUrl: ${mayLaunchResult}`}</Text>
      <Pressable
        testID="one-native-browser-warmup"
        style={styles.chip}
        onPress={async () => {
          const ok = await One.Browser.warmup()
          setWarmupResult(String(ok))
        }}
      >
        <Text>Warmup</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-may-launch"
        style={styles.chip}
        onPress={async () => {
          const ok = await One.Browser.mayLaunchUrl(page)
          setMayLaunchResult(String(ok))
        }}
      >
        <Text>May launch url</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-open"
        style={styles.chip}
        onPress={async () => setResult((await One.Browser.open(page)).type)}
      >
        <Text>Open page</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-open-dismiss"
        style={styles.chip}
        onPress={async () => {
          const pending = One.Browser.open(page)
          await new Promise((resolve) => setTimeout(resolve, 750))
          setDismissed((await One.Browser.dismiss()).type)
          setOpened((await pending).type)
        }}
      >
        <Text>Open then dismiss</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-auth"
        style={styles.chip}
        onPress={async () => {
          const next = await One.Browser.openAuthSession(page, redirect)
          setAuth(next.type === 'success' ? `success ${next.url}` : next.type)
        }}
      >
        <Text>Open auth session</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-auth-dismiss"
        style={styles.chip}
        onPress={async () => {
          // same tick, no sleep: opening backgrounds the app on android,
          // which pauses js timers until the tab closes.
          const pending = One.Browser.openAuthSession(page, redirect)
          One.Browser.dismissAuthSession()
          const next = await pending
          setAuth(next.type === 'success' ? `success ${next.url}` : next.type)
        }}
      >
        <Text>Open auth then dismiss</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-auth-redirect"
        style={styles.chip}
        onPress={async () => {
          const next = await One.Browser.openAuthSession(redirectStart, redirect, {
            preferEphemeralSession: true,
          })
          setAuth(next.type === 'success' ? `success ${next.url}` : next.type)
        }}
      >
        <Text>Open auth with redirect</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
