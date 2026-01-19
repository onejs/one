import { Link, useLoader, useLoaderState, createRouteConfig } from 'one'
import { Text, YStack, H1, Paragraph, Spinner } from 'tamagui'

// instant mode: navigate immediately, show Loading while loader runs
export const config = createRouteConfig({
  loading: 'instant',
})

// this is shown while loader is running
export function Loading() {
  return (
    <YStack padding="$4" gap="$4" id="loading-state">
      <Spinner size="large" color="$green10" />
      <Text id="loading-text">Loading instant slow page...</Text>
    </YStack>
  )
}

export async function loader() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    title: 'Instant Slow Page',
    loadTime: 500,
    timestamp: Date.now(),
  }
}

export default function InstantSlowPage() {
  const { data, state } = useLoaderState(loader)

  // with instant mode, data may be undefined while loading
  if (!data) {
    return <Loading />
  }

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>
      <Paragraph id="loader-state">Loader state: {state}</Paragraph>

      <Text>
        This page uses <Text fontWeight="bold">loading: 'instant'</Text>. Navigation happens
        immediately and a loading UI is shown while data loads.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/instant/fast" id="nav-to-instant-fast">
          <Text color="$green10">Instant Fast</Text>
        </Link>
        <Link href="/blocking/slow" id="nav-to-blocking-slow">
          <Text color="$blue10">Blocking Slow</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
