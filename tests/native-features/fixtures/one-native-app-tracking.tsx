import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeAppTracking() {
  const [before] = useState(() => One.iOS.AppTracking.getPermissionStatus())
  const [after, setAfter] = useState('pending')
  const [result, setResult] = useState('none')

  const request = async () => {
    setResult('requesting')
    try {
      const [first, second] = await Promise.all([
        One.iOS.AppTracking.requestPermission(),
        One.iOS.AppTracking.requestPermission(),
      ])
      setAfter(One.iOS.AppTracking.getPermissionStatus())
      setResult(`${first}:${second}`)
    } catch (error) {
      setResult(`error: ${error instanceof Error && 'code' in error ? error.code : String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>Before: {before}</Text>
      <Text>After: {after}</Text>
      <Text>Result: {result}</Text>
      <Pressable testID="one-native-app-tracking-request" style={styles.button} onPress={request}>
        <Text>Request tracking permission</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
