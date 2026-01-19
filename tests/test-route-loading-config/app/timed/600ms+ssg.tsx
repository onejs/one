import { Link, useLoader, createRouteConfig } from 'one'
import { Text, YStack, H1, Paragraph, Spinner } from 'tamagui'

// timed mode: wait 600ms, then show Loading if still loading
// with a 500ms loader, the loader finishes before 600ms so Loading is never shown
export const config = createRouteConfig({
  loading: 600, // wait 600ms before showing Loading
})

export function Loading() {
  return (
    <YStack padding="$4" gap="$4" id="loading-state">
      <Spinner size="large" color="$orange10" />
      <Text id="loading-text">Loading timed 600ms page...</Text>
    </YStack>
  )
}

export async function loader() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    title: 'Timed 600ms Page',
    loadTime: 500,
    waitTime: 600,
    timestamp: Date.now(),
  }
}

export default function Timed600Page() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="wait-time">Wait time before loading UI: {data.waitTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>

      <Text>
        This page uses <Text fontWeight="bold">loading: 600</Text>. Navigation waits 600ms before
        showing Loading. Since the loader takes only 500ms, the Loading component is never shown -
        it behaves like blocking mode.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/timed/200ms" id="nav-to-timed-200">
          <Text color="$orange10">Timed 200ms</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
