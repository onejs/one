import { useState, useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeAppleAuth() {
  const [isAvailableSync, setIsAvailableSync] = useState(() => String(One.AppleAuth.isAvailable))
  const [isAvailableAsyncResult, setIsAvailableAsyncResult] = useState('none')
  const [signInResult, setSignInResult] = useState('none')
  const [credentialState, setCredentialState] = useState('none')
  const [buttonTaps, setButtonTaps] = useState(0)

  useEffect(() => {
    One.AppleAuth.isAvailableAsync()
      .then((res) => setIsAvailableAsyncResult(String(res)))
      .catch((err) => setIsAvailableAsyncResult(`error: ${err.message}`))
  }, [])

  return (
    <View style={styles.screen}>
      <Text testID="one-native-apple-auth-available-sync">{`AvailableSync: ${isAvailableSync}`}</Text>
      <Text testID="one-native-apple-auth-available-async">{`AvailableAsync: ${isAvailableAsyncResult}`}</Text>
      <Text testID="one-native-apple-auth-signin-result">{`SignIn: ${signInResult}`}</Text>
      <Text testID="one-native-apple-auth-credential-state">{`CredentialState: ${credentialState}`}</Text>
      <Text testID="one-native-apple-auth-button-taps">{`ButtonTaps: ${buttonTaps}`}</Text>

      <Pressable
        testID="one-native-apple-auth-check-async"
        style={styles.chip}
        onPress={async () => {
          try {
            const avail = await One.AppleAuth.isAvailableAsync()
            setIsAvailableAsyncResult(String(avail))
          } catch (err: any) {
            setIsAvailableAsyncResult(`error: ${err.code || err.message}`)
          }
        }}
      >
        <Text>Check Available Async</Text>
      </Pressable>

      <Pressable
        testID="one-native-apple-auth-signin"
        style={styles.chip}
        onPress={async () => {
          try {
            const res = await One.AppleAuth.signInAsync({
              requestedScopes: [
                One.AppleAuth.AppleAuthenticationScope.FULL_NAME,
                One.AppleAuth.AppleAuthenticationScope.EMAIL,
              ],
            })
            setSignInResult(`success: ${res.user}`)
          } catch (err: any) {
            setSignInResult(`error: ${err.code || err.message}`)
          }
        }}
      >
        <Text>Sign In Async</Text>
      </Pressable>

      <Pressable
        testID="one-native-apple-auth-credential"
        style={styles.chip}
        onPress={async () => {
          try {
            const state = await One.AppleAuth.getCredentialStateAsync('test.user.123')
            setCredentialState(`state: ${state}`)
          } catch (err: any) {
            setCredentialState(`error: ${err.code || err.message}`)
          }
        }}
      >
        <Text>Get Credential State</Text>
      </Pressable>

      <View style={styles.buttonWrapper}>
        <One.AppleAuth.AppleAuthenticationButton
          buttonType={One.AppleAuth.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={One.AppleAuth.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={() => setButtonTaps((t) => t + 1)}
          testID="one-native-apple-auth-button"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  buttonWrapper: { height: 48, marginTop: 8 },
  appleButton: { width: '100%', height: 48 },
})
