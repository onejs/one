import { Link, useLoader, createRouteConfig } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

// blocking mode: wait for loader to complete before navigation
export const config = createRouteConfig({
  loading: 'blocking',
})

export async function loader() {
  // simulate slow data fetch
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    title: 'Blocking Slow Page',
    loadTime: 500,
    timestamp: Date.now(),
  }
}

export default function BlockingSlowPage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>

      <Text>
        This page uses <Text fontWeight="bold">loading: 'blocking'</Text>. Navigation should wait
        for the loader to complete before showing this page.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/blocking/fast" id="nav-to-blocking-fast">
          <Text color="$blue10">Blocking Fast</Text>
        </Link>
        <Link href="/instant/slow" id="nav-to-instant-slow">
          <Text color="$green10">Instant Slow</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
