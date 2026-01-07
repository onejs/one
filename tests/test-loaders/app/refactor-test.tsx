import { useLoader, useLoaderState } from 'one'
import { YStack, Text, Button } from 'tamagui'

export async function loader() {
  return {
    timestamp: Date.now(),
    message: 'Loader refactor test',
  }
}

export default function RefactorTest() {
  // Test useLoader (thin wrapper)
  const loaderData = useLoader(loader)

  // Test useLoaderState (full functionality)
  const { data, refetch, state } = useLoaderState(loader)

  return (
    <YStack gap="$4" p="$4">
      <Text>Refactor Test Page</Text>

      <Text>useLoader data: {JSON.stringify(loaderData)}</Text>

      <Text>useLoaderState data: {JSON.stringify(data)}</Text>

      <Text>State: {state}</Text>

      <Text>
        Both should have same data:{' '}
        {JSON.stringify(loaderData) === JSON.stringify(data) ? 'YES ✓' : 'NO ✗'}
      </Text>

      <Button onPress={() => refetch()}>
        {state === 'loading' ? 'Loading...' : 'Refetch'}
      </Button>
    </YStack>
  )
}
