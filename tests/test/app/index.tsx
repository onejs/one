import { Link, useLoader } from 'one'
import { useAnimatedStyle } from 'react-native-reanimated'
import { TestNavigationHelper } from '~/features/test-helpers/TestNavigationHelper'
import { View, Text, Pressable } from 'react-native'

declare global {
  var __setupFileRan: {
    client?: boolean
    server?: boolean
    native?: boolean
  }
}

export async function loader() {
  return {
    test: 'hello',
  }
}

export default () => {
  const data = useLoader(loader)
  const setupStatus = globalThis.__setupFileRan || {}

  // testing babel reanimated
  useAnimatedStyle(() => {
    'worklet'
    return {
      backgroundColor: 'red',
    }
  })

  return (
    <View
      style={{
        height: 600,
        backgroundColor: 'red',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}
    >
      <Text testID="welcome-message" style={{ fontSize: 24, fontWeight: 'bold' }}>
        Welcome to One
      </Text>

      <Text
        testID="native-setup-ran"
        accessibilityLabel={`native-setup: ${setupStatus.native ? 'true' : 'false'}`}
      >
        native-setup: {setupStatus.native ? 'true' : 'false'}
      </Text>

      <Text
        testID="test-loader"
        accessibilityLabel={`test-loader: ${JSON.stringify(data)}`}
      >
        {JSON.stringify(data)}
      </Text>

      <TestNavigationHelper />

      <Link href="/sub-page/sub">
        <Pressable>
          <Text>Go to sub</Text>
        </Pressable>
      </Link>

      <Link href="/sheet">
        <Pressable>
          <Text>Open Sheet</Text>
        </Pressable>
      </Link>

      <Link href="/hooks">
        <Pressable>
          <Text>Go to hooks</Text>
        </Pressable>
      </Link>
    </View>
  )
}
