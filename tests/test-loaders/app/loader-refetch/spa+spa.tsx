import { Link, useLoader, useLoaderState } from 'one'
import { Button, Text, YStack } from 'tamagui'

let spaCallCount = 0

export function loader({ path }: { path: string }) {
  spaCallCount++
  const url = new URL(path, 'http://localhost')
  const q = url.searchParams.get('q') || 'spa-default'

  return {
    mode: 'spa',
    query: q,
    callCount: spaCallCount,
    timestamp: Date.now(),
  }
}

export default () => {
  const { data, refetch, state } = useLoaderState(loader)

  return (
    <YStack gap="$4" p="$4">
      <Text id="spa-mode">Mode: {data.mode}</Text>
      <Text id="spa-query">Query: {data.query}</Text>
      <Text id="spa-call-count">Call count: {data.callCount}</Text>

      <Link id="spa-search-test" href="/loader-refetch/spa?q=spa-test">
        Test SPA Search Params
      </Link>

      <Link id="spa-search-new" href="/loader-refetch/spa?q=spa-new">
        New SPA Search Params
      </Link>

      <Button id="spa-refetch" onPress={refetch} disabled={state === 'loading'}>
        {state === 'loading' ? 'Loading...' : 'Refetch SPA'}
      </Button>
    </YStack>
  )
}
