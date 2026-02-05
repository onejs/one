import { useLoader } from 'one'
import { useAnimatedStyle } from 'react-native-reanimated'
import { H2, Paragraph, Square, YStack } from 'tamagui'

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
    <YStack height={600} bg="red" flex={1} items="center" justify="center" gap="$10">
      <H2 testID="welcome-message">Welcome to One</H2>

      <Paragraph id="test-loader">{JSON.stringify(data)}</Paragraph>

      <Square
        transition="bouncy"
        scale={1}
        size={100}
        bg="yellow"
        pressStyle={{
          scale: 2,
        }}
      />
    </YStack>
  )
}
