import { View, Text } from 'react-native'

// This is a fallback for native platforms where node:fs is not available
// The actual implementation with loader is in loader-test.web.tsx

export default function LoaderTestPage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text testID="loader-title">Loader test not available on native</Text>
    </View>
  )
}
