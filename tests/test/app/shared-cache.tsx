import { Suspense, useState } from 'react'
import { useLoader, useLoaderState } from 'one'
import { Button, Text, YStack } from 'tamagui'

export function loader() {
  const timestamp = Date.now()
  const random = Math.random()
  console.log('[Shared Cache Loader] Called at:', timestamp, 'Random:', random)
  return {
    timestamp,
    random,
  }
}

function UseLoaderComponent() {
  const data = useLoader(loader)
  return (
    <YStack>
      <Text id="useloader-timestamp">useLoader: {data?.timestamp}</Text>
      <Text id="useloader-random">useLoader: {data?.random}</Text>
    </YStack>
  )
}

function UseLoaderStateComponent() {
  const { data, refetch, state } = useLoaderState(loader)
  const [refetchCount, setRefetchCount] = useState(0)

  const handleRefetch = async () => {
    setRefetchCount(c => c + 1)
    await refetch()
  }

  return (
    <YStack>
      <Text id="useloaderstate-timestamp">useLoaderState: {data?.timestamp}</Text>
      <Text id="useloaderstate-random">useLoaderState: {data?.random}</Text>
      <Text id="refetch-count">Refetch count: {refetchCount}</Text>
      <Text id="state">State: {state}</Text>

      <Button id="refetch-btn" onPress={handleRefetch} disabled={state === 'loading'}>
        {state === 'loading' ? 'Loading...' : 'Refetch'}
      </Button>
    </YStack>
  )
}

function SharedCacheContent() {
  return (
    <YStack gap="$4" p="$4">
      <Text id="title">Shared Cache Test</Text>
      <UseLoaderComponent />
      <UseLoaderStateComponent />
    </YStack>
  )
}

export default () => {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <SharedCacheContent />
    </Suspense>
  )
}