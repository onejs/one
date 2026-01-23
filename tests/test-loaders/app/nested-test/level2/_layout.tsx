import { Slot, useMatch, useMatches } from 'one'
import { Text, YStack } from 'tamagui'

export async function loader() {
  return {
    level: 2,
    name: 'Level 2 Layout',
  }
}

export default function Level2Layout() {
  const matches = useMatches()
  // get this layout's loader data from matches
  const myMatch = useMatch('./nested-test/level2/_layout.tsx')
  const data = myMatch?.loaderData as { level: number; name: string } | undefined

  return (
    <YStack>
      <Text testID="level2-layout-data">Level2: {JSON.stringify(data)}</Text>
      <Text testID="level2-matches-count">Level2 sees {matches.length} matches</Text>
      <Slot />
    </YStack>
  )
}
