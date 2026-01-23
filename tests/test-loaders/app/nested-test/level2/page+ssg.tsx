import { useLoader, useMatches } from 'one'
import { Text, YStack } from 'tamagui'

export async function loader() {
  return {
    level: 3,
    name: 'Nested Page',
    timestamp: Date.now(),
  }
}

export default function NestedPage() {
  const data = useLoader<typeof loader>()
  const matches = useMatches()

  // Log matches for debugging
  if (typeof window !== 'undefined') {
    console.log('[NestedPage] matches:', JSON.stringify(matches, null, 2))
  }

  // Find each level's loader data
  const level1Match = matches.find((m) => m.routeId.includes('nested-test/_layout'))
  const level2Match = matches.find((m) => m.routeId.includes('level2/_layout'))
  const pageMatch = matches.find((m) => m.routeId.includes('level2/page'))

  return (
    <YStack padding="$4" gap="$2">
      <Text testID="nested-page-data">Page: {JSON.stringify(data)}</Text>
      <Text testID="nested-total-matches">Total matches: {matches.length}</Text>
      <Text testID="nested-level1-data">Level1 data: {JSON.stringify(level1Match?.loaderData)}</Text>
      <Text testID="nested-level2-data">Level2 data: {JSON.stringify(level2Match?.loaderData)}</Text>
      <Text testID="nested-page-match-data">Page match data: {JSON.stringify(pageMatch?.loaderData)}</Text>
      <Text testID="all-matches">{JSON.stringify(matches)}</Text>
    </YStack>
  )
}
