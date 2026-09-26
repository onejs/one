import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const statusText = () => {
  const status = One.iOS.LocalAuthentication.canEvaluatePolicy()
  return `${status.available}:${status.biometryType}:${status.errorCode ?? 'none'}`
}

export default function OneNativeLocalAuthentication() {
  const [status, setStatus] = useState(statusText)
  const [result, setResult] = useState('none')

  return (
    <View style={styles.screen}>
      <Text testID="one-native-local-auth-status">Status: {status}</Text>
      <Text testID="one-native-local-auth-result">Result: {result}</Text>
      <Pressable
        testID="one-native-local-auth-refresh"
        style={styles.chip}
        onPress={() => setStatus(statusText())}
      >
        <Text>Refresh biometric status</Text>
      </Pressable>
      <Pressable
        testID="one-native-local-auth-evaluate"
        style={styles.chip}
        onPress={() =>
          One.iOS.LocalAuthentication.evaluatePolicy('Unlock the native fixture').then(
            (ok) => setResult(ok ? 'success' : 'cancel'),
            (error) => setResult(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Evaluate biometrics</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
