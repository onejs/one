import { useLoader, useMatches, usePageMatch } from 'one'
import { Text, YStack } from 'tamagui'

export async function loader() {
  return {
    pageData: 'This page loader should still run',
    timestamp: Date.now(),
  }
}

export default function ErrorTestPage() {
  const data = useLoader<typeof loader>()
  const matches = useMatches()
  const pageMatch = usePageMatch()

  return (
    <YStack padding="$4">
      <Text testID="error-test-page-data">Page data: {JSON.stringify(data)}</Text>
      <Text testID="error-test-matches-count">Matches: {matches.length}</Text>
      <Text testID="error-test-page-match">Page match: {JSON.stringify(pageMatch?.loaderData)}</Text>
      <Text testID="error-test-all-matches">{JSON.stringify(matches)}</Text>
    </YStack>
  )
}
