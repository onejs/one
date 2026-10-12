import { router } from 'one'
import { Pressable, Text, View } from 'react-native'

export default function Other() {
  return (
    <View style={{ flex: 1, padding: 32, gap: 20 }}>
      <Text testID="realapps-other">Other screen</Text>
      <Pressable
        accessibilityRole="button"
        testID="realapps-back"
        onPress={() => router.back()}
      >
        <Text>Return</Text>
      </Pressable>
    </View>
  )
}
