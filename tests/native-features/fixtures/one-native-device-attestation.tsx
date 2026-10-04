import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

async function codeOf(work: Promise<unknown>): Promise<string> {
  try {
    await work
    return 'resolved'
  } catch (error) {
    return error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code : String(error)
  }
}

export default function OneNativeDeviceAttestation() {
  const [availability, setAvailability] = useState('pending')
  const [invalid, setInvalid] = useState('pending')
  const [attempts, setAttempts] = useState('pending')

  const read = () => {
    const value = One.DeviceAttestation.getAvailability()
    setAvailability(`AppAttest=${value.appAttest} DeviceCheck=${value.deviceCheck}`)
  }

  const validate = async () => {
    const api = One.DeviceAttestation
    const invalidKey = await codeOf(api.attestKey(' ', 'AAAA'))
    const invalidHash = await codeOf(api.generateAssertion('key', 'AAAA'))
    setInvalid(`key=${invalidKey} hash=${invalidHash}`)
  }

  const probe = async () => {
    const api = One.DeviceAttestation
    const hash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const key = await codeOf(api.generateKey())
    const attest = await codeOf(api.attestKey('key', hash))
    const assertion = await codeOf(api.generateAssertion('key', hash))
    const token = await codeOf(api.generateDeviceToken())
    setAttempts(`key=${key} attest=${attest} assertion=${assertion} token=${token}`)
  }

  return (
    <View style={styles.screen}>
      <Text>Availability: {availability}</Text>
      <Text>Invalid: {invalid}</Text>
      <Text>Attempts: {attempts}</Text>
      <Pressable testID="one-native-device-attestation-read" onPress={read}><Text>Read availability</Text></Pressable>
      <Pressable testID="one-native-device-attestation-validate" onPress={validate}><Text>Validate input</Text></Pressable>
      <Pressable testID="one-native-device-attestation-probe" onPress={probe}><Text>Probe services</Text></Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' },
})
