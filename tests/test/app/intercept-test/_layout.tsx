import type { ReactNode } from 'react'
import { Slot, Link } from 'one'
import { YStack, XStack, Text } from 'tamagui'

/**
 * Layout for intercepting routes test.
 * Receives `modal` slot prop from @modal directory.
 */
export default function InterceptTestLayout({ modal }: { modal?: ReactNode }) {
  return (
    <YStack flex={1} bg="$background" testID="intercept-test-layout">
      <XStack p="$3" bg="$color2" borderBottomWidth={1} borderColor="$borderColor">
        <Link href="/" asChild>
          <Text color="$blue10" testID="back-home">Home</Text>
        </Link>
        <Text ml="$3" fontWeight="bold">Intercept Test</Text>
      </XStack>

      <Slot />

      {/* Modal slot - renders intercepted routes */}
      {modal}
    </YStack>
  )
}
