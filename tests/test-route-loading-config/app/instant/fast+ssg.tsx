import { Link, useLoader, createRouteConfig } from 'one'
import { Text, YStack, H1, Paragraph, Spinner } from 'tamagui'

export const config = createRouteConfig({
  loading: 'instant',
})

export function Loading() {
  return (
    <YStack padding="$4" gap="$4" id="loading-state">
      <Spinner size="large" color="$green10" />
      <Text id="loading-text">Loading instant fast page...</Text>
    </YStack>
  )
}

export function loader() {
  return {
    title: 'Instant Fast Page',
    loadTime: 0,
    timestamp: Date.now(),
  }
}

export default function InstantFastPage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>

      <Text>
        This page uses <Text fontWeight="bold">loading: 'instant'</Text> with a fast loader. The
        loading state should barely be visible.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/instant/slow" id="nav-to-instant-slow">
          <Text color="$green10">Instant Slow</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
