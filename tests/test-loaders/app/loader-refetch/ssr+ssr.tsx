import { Link, useLoader, useLoaderState } from 'one'
import { Button, Text, YStack } from 'tamagui'

let ssrCallCount = 0

export function loader({ path }: { path: string }) {
  ssrCallCount++
  const url = new URL(path, 'http://localhost')
  const q = url.searchParams.get('q') || 'ssr-default'
  const isServer = typeof window === 'undefined'

  return {
    mode: 'ssr',
    query: q,
    callCount: ssrCallCount,
    timestamp: Date.now(),
    executedOn: isServer ? 'server' : 'client',
  }
}

export default () => {
  const { data, refetch, state } = useLoaderState(loader)

  return (
    <YStack gap="$4" p="$4">
      <Text id="ssr-mode">Mode: {data.mode}</Text>
      <Text id="ssr-query">Query: {data.query}</Text>
      <Text id="ssr-call-count">Call count: {data.callCount}</Text>
      <Text id="ssr-executed-on">Executed on: {data.executedOn}</Text>

      <Link id="ssr-search-test" href="/loader-refetch/ssr?q=ssr-test">
        Test SSR Search Params
      </Link>

      <Link id="ssr-search-new" href="/loader-refetch/ssr?q=ssr-new">
        New SSR Search Params
      </Link>

      <Button id="ssr-refetch" onPress={refetch} disabled={state === 'loading'}>
        {state === 'loading' ? 'Loading...' : 'Refetch SSR'}
      </Button>
    </YStack>
  )
}
