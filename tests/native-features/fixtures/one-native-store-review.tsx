import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeStoreReview() {
  const [status, setStatus] = useState('idle')
  const [requests, setRequests] = useState(0)

  async function requestReview() {
    try {
      await One.StoreReview.requestReview()
      setRequests((count) => count + 1)
      setStatus('requested')
    } catch (error) {
      setStatus(`failed ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Requests: ${requests}`}</Text>
      <Pressable
        testID="one-native-store-review-request"
        style={styles.chip}
        onPress={requestReview}
      >
        <Text>Request review for proof</Text>
      </Pressable>
      <Pressable
        testID="one-native-store-review-alive"
        style={styles.chip}
        onPress={() => setStatus('alive')}
      >
        <Text>Confirm app usable</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 20, backgroundColor: '#fff' },
  chip: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
})
