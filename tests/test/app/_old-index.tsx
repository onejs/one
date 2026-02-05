import { Link, useLoader } from 'one'
import { Button, H2, Paragraph, Square, YStack } from 'tamagui'
import { ToggleThemeButton } from '../features/theme/ToggleThemeButton'
import { useAnimatedStyle } from 'react-native-reanimated'
import { TestNavigationHelper } from '~/features/test-helpers/TestNavigationHelper'
import { Text } from 'react-native'

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
    <YStack height={600} bg="red" flex={1} items="center" justify="center" gap="$10">
      <H2 testID="welcome-message">Welcome to One</H2>

      <Text
        testID="native-setup-ran"
        accessibilityLabel={`native-setup: ${setupStatus.native ? 'true' : 'false'}`}
      >
        native-setup: {setupStatus.native ? 'true' : 'false'}
      </Text>

      <Paragraph id="test-loader">{JSON.stringify(data)}</Paragraph>

      <TestNavigationHelper />

      <Link asChild id="go-to-sub" href="/sub-page/sub">
        <Button size="$5" id="go-to-sub">
          Go to sub
        </Button>
      </Link>

      <Square
        transition="bouncy"
        scale={1}
        size={100}
        bg="yellow"
        pressStyle={{
          scale: 2,
        }}
      />

      <Link asChild href="/sheet">
        <Button>Open Sheet</Button>
      </Link>

      <Link asChild href="/hooks">
        <Button>Go to hooks</Button>
      </Link>

      <ToggleThemeButton />
    </YStack>
  )
}
