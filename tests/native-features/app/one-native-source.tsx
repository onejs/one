import { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { runNativeSource } from '../fixtures/one-native-source'

export default function NativeSourceFixture() {
  const [result, setResult] = useState('ready')
  return <View>
    <TouchableOpacity testID="native-source-run" onPress={() => {
      runNativeSource().then(setResult, (error: unknown) => setResult(String(error)))
    }}>
      <Text>Run native source</Text>
    </TouchableOpacity>
    <Text testID="native-source-result">{result}</Text>
  </View>
}
