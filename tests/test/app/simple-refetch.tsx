import { Suspense, useState } from 'react'
import { useLoaderState } from 'one'
import { Button, Text, YStack } from 'tamagui'

export function loader() {
  // Use timestamp and random to verify refetch
  const now = Date.now()
  const rand = Math.random()
  console.log('[Simple Loader] Called at:', now, 'Random:', rand)
  return {
    timestamp: now,
    random: rand,
  }
}

function LoaderContent() {
  const { data, refetch, state } = useLoaderState(loader)
  const [initialData] = useState(() => data)

  // Guard against undefined data during initial load
  if (!data) {
    return <Text>Loading initial data...</Text>
  }

  return (
    <YStack gap="$4" p="$4">
      <Text id="timestamp">Timestamp: {data.timestamp}</Text>
      <Text id="random">Random: {data.random}</Text>
      <Text id="state">State: {state}</Text>
      <Text id="changed">
        Changed: {data.timestamp !== initialData?.timestamp ? 'YES' : 'NO'}
      </Text>

      <Button id="refetch-btn" onPress={refetch} disabled={state === 'loading'}>
        {state === 'loading' ? 'Loading...' : 'Refetch'}
      </Button>
    </YStack>
  )
}

export default () => {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <LoaderContent />
    </Suspense>
  )
}