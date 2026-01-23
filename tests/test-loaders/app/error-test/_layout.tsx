import { Slot, useMatch, useMatches } from 'one'
import { Text, YStack } from 'tamagui'

export async function loader() {
  // simulate a loader that throws
  throw new Error('Layout loader error for testing')
}

export default function ErrorTestLayout() {
  const matches = useMatches()
  const myMatch = useMatch('./error-test/_layout.tsx')
  const data = myMatch?.loaderData as Record<string, unknown> | undefined

  return (
    <YStack>
      <Text testID="error-layout-data">ErrorLayout: {JSON.stringify(data)}</Text>
      <Text testID="error-layout-matches">{matches.length} matches</Text>
      <Slot />
    </YStack>
  )
}
