import { Slot, useMatch, useMatches } from 'one'
import { Text, YStack } from 'tamagui'

export async function loader() {
  return {
    level: 1,
    name: 'Level 1 Layout',
  }
}

export default function Level1Layout() {
  const matches = useMatches()
  // get this layout's loader data from matches
  const myMatch = useMatch('./nested-test/_layout.tsx')
  const data = myMatch?.loaderData as { level: number; name: string } | undefined

  return (
    <YStack>
      <Text testID="level1-layout-data">Level1: {JSON.stringify(data)}</Text>
      <Text testID="level1-matches-count">Level1 sees {matches.length} matches</Text>
      <Slot />
    </YStack>
  )
}
