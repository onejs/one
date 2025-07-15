import { View, Text } from 'react-native'
import { TestNavigationHelper } from '~/features/test-helpers/TestNavigationHelper'

export default function TestRoute1() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text testID="test-route-2">test-route-2.ios</Text>
      <TestNavigationHelper />
    </View>
  )
}
