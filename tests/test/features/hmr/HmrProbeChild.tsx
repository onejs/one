import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

export function HmrProbeChild() {
  const [count, setCount] = useState(0)

  return (
    <View>
      <Text testID="component-hmr-version">component-v1</Text>
      <Text testID="component-hmr-count">child-count:{count}</Text>
      <Pressable testID="component-hmr-bump" onPress={() => setCount((c) => c + 1)}>
        <Text>bump child</Text>
      </Pressable>
    </View>
  )
}
