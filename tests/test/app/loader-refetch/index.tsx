import { Link, useLoader, useLoaderState } from 'one'
import { useState } from 'react'
import { Button, Text, YStack } from 'tamagui'

let callCount = 0

export function loader({ path, search }: { path: string; search?: string }) {
  callCount++
  const searchParams = new URLSearchParams(search || '')
  const q = searchParams.get('q') || 'default'

  return {
    query: q,
    callCount,
  }
}

function RefetchButton() {
  const { refetch, state } = useLoaderState()

  return (
    <Button id="refetch-button" onPress={refetch} disabled={state === 'loading'}>
      {state === 'loading' ? 'Loading...' : 'Refetch'}
    </Button>
  )
}

export default () => {
  const data = useLoader(loader)
  const [query, setQuery] = useState('')

  return (
    <YStack gap="$4">
      <Text id="loader-query">Query: {data.query}</Text>
      <Text id="loader-call-count">Call count: {data.callCount}</Text>

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
