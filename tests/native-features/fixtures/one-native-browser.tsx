import { WebBrowser } from '@vxrn/native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// exercises the browser api against the real safari sheet: a user dismiss
// resolving cancel, a programmatic dismiss resolving dismiss, and an auth
// session whose cancel path resolves cancel. a presented sheet takes the
// whole accessibility tree, so the suite reads safari's own Done button
// while it is up and the result labels once it is gone. the redirect
// success path needs a live identity provider, so the fixture exposes the
// button for manual runs and the suite covers cancel only.
const page = 'https://example.com'
const redirect = 'nativefeatures://auth'

export default function OneNativeBrowser() {
  const [result, setResult] = useState('none')
  const [opened, setOpened] = useState('none')
  const [dismissed, setDismissed] = useState('none')
  const [auth, setAuth] = useState('none')
  return (
    <View style={styles.screen}>
      <Text>{`Result: ${result}`}</Text>
      <Text>{`Opened: ${opened}`}</Text>
      <Text>{`Dismissed: ${dismissed}`}</Text>
      <Text>{`Auth: ${auth}`}</Text>
      <Pressable
        testID="one-native-browser-open"
        style={styles.chip}
        onPress={async () => setResult((await WebBrowser.openBrowserAsync(page)).type)}
      >
        <Text>Open page</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-open-dismiss"
        style={styles.chip}
        onPress={async () => {
          const pending = WebBrowser.openBrowserAsync(page)
          await new Promise((resolve) => setTimeout(resolve, 750))
          setDismissed((await WebBrowser.dismissBrowser()).type)
          setOpened((await pending).type)
        }}
      >
        <Text>Open then dismiss</Text>
      </Pressable>
      <Pressable
        testID="one-native-browser-auth"
        style={styles.chip}
        onPress={async () => {
          const next = await WebBrowser.openAuthSessionAsync(page, redirect)
          setAuth(next.type === 'success' ? `success ${next.url}` : next.type)
        }}
      >
        <Text>Open auth session</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
