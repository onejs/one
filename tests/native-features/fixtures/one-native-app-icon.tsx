import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { One } from 'one'

function code(error: unknown): string {
  return error !== null && typeof error === 'object' && 'code' in error
    ? String(error.code) : String(error)
}

export default function OneNativeAppIcon() {
  const [support, setSupport] = useState('pending')
  const [current, setCurrent] = useState('pending')
  const [result, setResult] = useState('idle')

  useEffect(() => {
    Promise.all([One.iOS.AppIcon.isSupported(), One.iOS.AppIcon.getCurrentName()])
      .then(([supported, name]) => {
        setSupport(String(supported))
        setCurrent(name ?? 'primary')
      })
      .catch((error) => setResult(`error:${code(error)}`))
  }, [])

  async function select(name?: string) {
    setResult(name ? 'changing' : 'restoring')
    try {
      await One.iOS.AppIcon.setIcon(name)
      const selected = await One.iOS.AppIcon.getCurrentName()
      setCurrent(selected ?? 'primary')
      setResult(selected === name ? 'changed' : 'mismatch')
    } catch (error) {
      setResult(`error:${code(error)}`)
    }
  }

  async function invalid() {
    try {
      await One.iOS.AppIcon.setIcon('MissingIcon')
      setResult('invalid-accepted')
    } catch (error) {
      setResult(`invalid:${code(error)}`)
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: 'white', gap: 12 }}>
      <Text style={{ fontSize: 22 }}>Alternate app icon</Text>
      <Text>Supported: {support}</Text>
      <Text>Current icon: {current}</Text>
      <Text>Icon result: {result}</Text>
      <Pressable testID="one-native-app-icon-alternate" accessibilityRole="button"
        onPress={() => select('TestAlternate')} style={{ padding: 16, backgroundColor: '#f2d6c7' }}>
        <Text>Use alternate icon</Text>
      </Pressable>
      <Pressable testID="one-native-app-icon-primary" accessibilityRole="button"
        onPress={() => select()} style={{ padding: 16, backgroundColor: '#d9e5f7' }}>
        <Text>Restore primary icon</Text>
      </Pressable>
      <Pressable testID="one-native-app-icon-invalid" accessibilityRole="button"
        onPress={invalid} style={{ padding: 16, backgroundColor: '#eee' }}>
        <Text>Reject unknown icon</Text>
      </Pressable>
    </View>
  )
}
