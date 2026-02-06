import { useLoader, useMatches, usePageMatch } from 'one'
import { View, Text } from 'tamagui'

export async function loader() {
  return {
    pageData: 'page-loader-data',
    timestamp: Date.now(),
  }
}

export default function MatchesTestPage() {
  const data = useLoader(loader)
  const matches = useMatches()
  const pageMatch = usePageMatch()

  return (
    <View flex={1} p="$4" gap="$4">
      <Text testID="page-data" accessibilityLabel={`page-data: ${data.pageData}`}>
        Page: {data.pageData}
      </Text>

      <Text
        testID="matches-count"
        accessibilityLabel={`matches-count: ${matches.length}`}
      >
        Matches count: {matches.length}
      </Text>

      <Text
        testID="page-match-routeid"
        accessibilityLabel={`page-match-routeid: ${pageMatch?.routeId || 'none'}`}
      >
        Page match routeId: {pageMatch?.routeId || 'none'}
      </Text>

      <Text
        testID="all-matches"
        accessibilityLabel={`all-matches: ${JSON.stringify(matches)}`}
      >
        {JSON.stringify(matches, null, 2)}
      </Text>
    </View>
  )
}
