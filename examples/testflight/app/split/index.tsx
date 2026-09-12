import { Text, YStack } from 'tamagui'

export default function SplitViewWebFallback() {
  return (
    <YStack f={1} ai="center" jc="center" p="$6">
      <Text>SplitView is available in the native TestFlight build.</Text>
    </YStack>
  )
}
