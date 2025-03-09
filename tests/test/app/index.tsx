import { Link, useLoader } from 'one'
import { Button, H2, Paragraph, Square, YStack } from 'tamagui'
import { ToggleThemeButton } from '../features/theme/ToggleThemeButton'
import { useAnimatedStyle } from 'react-native-reanimated'

export async function loader() {
  return {
    test: 'hello',
  }
}

export default () => {
  const data = useLoader(loader)

  // testing babel reanimated
  useAnimatedStyle(() => {
    'worklet'
    return {
      backgroundColor: 'red',
    }
  })

  return (
    <YStack h={600} bg="red" f={1} ai="center" jc="center" gap="$10">
      <H2>Welcome to One</H2>

      <Paragraph id="test-loader">{JSON.stringify(data)}</Paragraph>

      <Link asChild id="go-to-sub" href="/sub-page/sub">
        <Button size="$5" id="go-to-sub">
          Go to sub
        </Button>
      </Link>

      <Square
        animation="bouncy"
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
