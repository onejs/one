import { Link, useLoader, useLoaderState, createRouteConfig } from 'one'
import { Text, YStack, H1, Paragraph, Spinner } from 'tamagui'

// timed mode: wait 200ms, then show Loading if still loading
// with a 500ms loader, user will see: old page (200ms) -> loading (300ms) -> new page
export const config = createRouteConfig({
  loading: 200, // wait 200ms before showing Loading
})

export function Loading() {
  return (
    <YStack padding="$4" gap="$4" id="loading-state">
      <Spinner size="large" color="$orange10" />
      <Text id="loading-text">Loading timed 200ms page...</Text>
    </YStack>
  )
}

export async function loader() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    title: 'Timed 200ms Page',
    loadTime: 500,
    waitTime: 200,
    timestamp: Date.now(),
  }
}

export default function Timed200Page() {
  const { data, state } = useLoaderState(loader)

  if (!data) {
    return <Loading />
  }

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="wait-time">Wait time before loading UI: {data.waitTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>
      <Paragraph id="loader-state">Loader state: {state}</Paragraph>

      <Text>
        This page uses <Text fontWeight="bold">loading: 200</Text>. Navigation waits 200ms, then
        shows the Loading component if the loader hasn't finished yet.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/timed/600ms" id="nav-to-timed-600">
          <Text color="$orange10">Timed 600ms</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
