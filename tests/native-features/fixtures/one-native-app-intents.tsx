import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const receiptKey = 'one-app-intents-proof'

export default function OneNativeAppIntents() {
  const [receipt, setReceipt] = useState('unread')
  const [invalid, setInvalid] = useState('unchecked')

  const read = () => setReceipt(One.Storage.getItem(receiptKey) ?? 'missing')
  const reset = () => {
    One.Storage.removeItem(receiptKey)
    read()
  }
  const checkInvalid = () => {
    try {
      One.AppIntents.defineAction('', () => 'bad')
      setInvalid('accepted')
    } catch (error) {
      setInvalid(error instanceof TypeError ? 'TypeError' : String(error))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>Receipt: {receipt}</Text>
      <Text>Invalid: {invalid}</Text>
      <Pressable testID="one-native-app-intents-read" onPress={read}>
        <Text>Read receipt</Text>
      </Pressable>
      <Pressable testID="one-native-app-intents-reset" onPress={reset}>
        <Text>Reset receipt</Text>
      </Pressable>
      <Pressable testID="one-native-app-intents-invalid" onPress={checkInvalid}>
        <Text>Check invalid</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: 20, gap: 12 } })
