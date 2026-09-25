import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// One.Auth.Apple: availability, a sign in, and the credential state of an
// unknown user, each shown as text the conformance suites read. the button is
// One.iOS.SignInWithAppleButton, which only exists on ios.
export default function OneNativeAppleAuth() {
  const [signInResult, setSignInResult] = useState('none')
  const [credentialState, setCredentialState] = useState('none')

  return (
    <View style={styles.screen}>
      <Text testID="one-native-apple-auth-available">{`Available: ${One.Auth.Apple.isAvailable}`}</Text>
      <Text testID="one-native-apple-auth-signin-result">{`SignIn: ${signInResult}`}</Text>
      <Text testID="one-native-apple-auth-credential-state">{`CredentialState: ${credentialState}`}</Text>

      <Pressable
        testID="one-native-apple-auth-signin"
        style={styles.chip}
        onPress={() =>
          One.Auth.Apple.signIn({ requestedScopes: ['fullName', 'email'] }).then(
            (result) =>
              setSignInResult(
                result.type === 'success' ? `success: ${result.credential.user}` : result.type
              ),
            (error) => setSignInResult(errorText(error))
          )
        }
      >
        <Text>Sign In</Text>
      </Pressable>

      <Pressable
        testID="one-native-apple-auth-credential"
        style={styles.chip}
        onPress={() =>
          One.Auth.Apple.getCredentialState('test.user.123').then(
            (state) => setCredentialState(`state: ${state}`),
            (error) => setCredentialState(errorText(error))
          )
        }
      >
        <Text>Get Credential State</Text>
      </Pressable>

      {One.platform === 'ios' ? (
        <One.iOS.SignInWithAppleButton
          testID="one-native-apple-auth-button"
          requestedScopes={['fullName', 'email']}
          swiftStyle={{ signInWithAppleButtonStyle: 'white' }}
          style={styles.appleButton}
        />
      ) : null}
    </View>
  )
}

// a failure carries a stable code; an unavailable platform rejects without one
const errorText = (error: Error & { code?: string }) =>
  error.code ? `error: ${error.code}: ${error.message}` : `error: ${error.message}`

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  appleButton: { width: '100%', height: 48, marginTop: 8 },
})
