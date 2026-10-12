import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeOpen() {
  const [url, setURL] = useState('idle')
  const [share, setShare] = useState('idle')
  const [emptyShare, setEmptyShare] = useState('idle')
  const [settings, setSettings] = useState('idle')

  const runURL = async () => {
    setURL('opening')
    try {
      await One.openURL('https://example.com/one-native-open-proof')
      setURL('opened')
    } catch (error) {
      setURL(`rejected: ${message(error)}`)
    }
  }

  const runShare = async () => {
    setShare('opening')
    try {
      await One.openShare({
        title: 'One openShare proof',
        message: 'One openShare message',
        url: 'https://example.com/one-native-share-proof',
      })
      setShare('completed')
    } catch (error) {
      setShare(`rejected: ${message(error)}`)
    }
  }

  const runEmptyShare = async () => {
    setEmptyShare('running')
    try {
      await One.openShare({})
      setEmptyShare('unexpectedly resolved')
    } catch (error) {
      setEmptyShare(`rejected: ${message(error)}`)
    }
  }

  const runSettings = async () => {
    setSettings('opening')
    try {
      await One.openSettings()
      setSettings('opened')
    } catch (error) {
      setSettings(`rejected: ${message(error)}`)
    }
  }

  return (
    <View style={styles.screen} testID="one-native-open-screen">
      <Text>{`URL: ${url}`}</Text>
      <Text>{`Share: ${share}`}</Text>
      <Text>{`Empty share: ${emptyShare}`}</Text>
      <Text>{`Settings: ${settings}`}</Text>
      <Action id="one-native-open-url" label="Open URL" onPress={runURL} />
      <Action id="one-native-open-share" label="Open share sheet" onPress={runShare} />
      <Action id="one-native-open-share-empty" label="Reject empty share" onPress={runEmptyShare} />
      <Action id="one-native-open-settings" label="Open app settings" onPress={runSettings} />
    </View>
  )
}

function Action({ id, label, onPress }: { id: string; label: string; onPress: () => void }) {
  return (
    <Pressable testID={id} accessibilityRole="button" style={styles.button} onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  )
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8, alignSelf: 'flex-start' },
})
