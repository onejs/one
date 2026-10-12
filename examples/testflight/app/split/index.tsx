import { Text, YStack } from 'tamagui'

export default function SplitViewWebFallback() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="6">
      <Text>SplitView is available in the native TestFlight build.</Text>
    </YStack>
  )
}
