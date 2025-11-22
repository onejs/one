import { Link, useLoader, useLoaderState } from 'one'
import { Button, Text, YStack } from 'tamagui'

// Use global to persist across module reloads
if (typeof window !== 'undefined') {
  (window as any).__page1CallCount = (window as any).__page1CallCount || 0
}

export function loader() {
  if (typeof window !== 'undefined') {
    (window as any).__page1CallCount++
    const count = (window as any).__page1CallCount
    console.log('PAGE1 LOADER CALLED:', count)
    return {
      page: 'page1',
      callCount: count,
      timestamp: Date.now(),
    }
  }

  // Server-side fallback
  return {
    page: 'page1',
    callCount: 1,
    timestamp: Date.now(),
  }
}

function RefetchButton() {
  const { refetch, state } = useLoaderState()

  return (
    <Button id="refetch-btn" onPress={refetch} disabled={state === 'loading'}>
      {state === 'loading' ? 'Loading...' : 'Refetch'}
    </Button>
  )
}

export default () => {
  const data = useLoader(loader)

  return (
    <YStack gap="$4" p="$4">
      <Text id="page-name">Page: {data.page}</Text>
      <Text id="call-count">Count: {data.callCount}</Text>

      <Link href="/loader-state/page2">
        <Text id="go-to-page2">Go to Page 2</Text>
      </Link>

      <RefetchButton />
    </YStack>
  )
}