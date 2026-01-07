import { Link, useLoader, useLoaderState } from 'one'
import { Button, Text, YStack } from 'tamagui'

// Use global to persist across module reloads
if (typeof window !== 'undefined') {
  ;(window as any).__page2CallCount = (window as any).__page2CallCount || 0
}

export function loader() {
  if (typeof window !== 'undefined') {
    ;(window as any).__page2CallCount++
    const count = (window as any).__page2CallCount
    console.log('PAGE2 LOADER CALLED:', count)
    return {
      page: 'page2',
      callCount: count,
      timestamp: Date.now(),
    }
  }

  // Server-side fallback
  return {
    page: 'page2',
    callCount: 1,
    timestamp: Date.now(),
  }
}

export default () => {
  const { data, refetch, state } = useLoaderState(loader)

  return (
    <YStack gap="$4" p="$4">
      <Text id="page-name">Page: {data.page}</Text>
      <Text id="call-count">Count: {data.callCount}</Text>

      <Link href="/loader-state/page1">
        <Text id="go-to-page1">Go to Page 1</Text>
      </Link>

      <Button id="refetch-btn" onPress={refetch} disabled={state === 'loading'}>
        {state === 'loading' ? 'Loading...' : 'Refetch'}
      </Button>

      <Text id="load-state">State: {state}</Text>
    </YStack>
  )
}
