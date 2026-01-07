import { Link, useLoader, useLoaderState } from 'one'
import { useEffect, useState } from 'react'
import { Button, Text, YStack } from 'tamagui'

export function loader({ path, search }: { path: string; search?: string }) {
  const searchParams = new URLSearchParams(search || '')
  const q = searchParams.get('q') || 'default'
  const timestamp = Date.now()

  console.log('[loader-refetch] loader called, timestamp:', timestamp)
  return {
    query: q,
    timestamp,
  }
}

function RefetchButton() {
  const { refetch, state } = useLoaderState()

  const handleRefetch = async () => {
    console.log('[RefetchButton] refetch starting')
    try {
      await refetch()
      console.log('[RefetchButton] refetch completed')
    } catch (err) {
      console.error('[RefetchButton] refetch error:', err)
    }
  }

  return (
    <Button id="refetch-button" onPress={handleRefetch} disabled={state === 'loading'}>
      {state === 'loading' ? 'Loading...' : 'Refetch'}
    </Button>
  )
}

export default () => {
  const data = useLoader(loader)
  const [query, setQuery] = useState('')
  const [isClient, setIsClient] = useState(false)

  // Only show timestamp after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <YStack gap="$4">
      <Text id="loader-query">Query: {data.query}</Text>
      <Text id="loader-timestamp">
        Timestamp: {isClient ? data.timestamp : 'loading'}
      </Text>

      <input
        id="query-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter search query"
      />

      <Link id="update-search" href={`/loader-refetch?q=${query}`}>
        Update Search Params
      </Link>

      <RefetchButton />
    </YStack>
  )
}
