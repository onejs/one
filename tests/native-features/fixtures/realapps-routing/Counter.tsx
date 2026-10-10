import { router } from 'one'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

export default function Counter({ name }: { name: 'stack' | 'tabs' | 'drawer' }) {
  const [count, setCount] = useState(0)
  return (
    <View style={{ flex: 1, padding: 32, gap: 20 }}>
      <Text testID="realapps-count">
        {name} count {count}
      </Text>
      <Pressable
        accessibilityRole="button"
        testID="realapps-increment"
        onPress={() => setCount((value) => value + 1)}
      >
        <Text>Increment</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID="realapps-next"
        onPress={() => router.push(`/realapps-routing/${name}/other` as any)}
      >
        <Text>Go to other</Text>
      </Pressable>
    </View>
  )
}
