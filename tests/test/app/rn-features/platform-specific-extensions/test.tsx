import { View } from 'react-native'
import { TestComponent1 } from '~/features/rn-features/platform-specific-extensions/TestComponent1'
import { TestNavigationHelper } from '~/features/test-helpers/TestNavigationHelper'

export default function PlatformSpecificExtensionsTestPage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TestComponent1 />
      <TestNavigationHelper />
    </View>
  )
}
