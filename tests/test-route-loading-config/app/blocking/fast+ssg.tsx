import { Link, useLoader, createRouteConfig } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

export const config = createRouteConfig({
  loading: 'blocking',
})

export function loader() {
  return {
    title: 'Blocking Fast Page',
    loadTime: 0,
    timestamp: Date.now(),
  }
}

export default function BlockingFastPage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>

      <Text>
        This page uses <Text fontWeight="bold">loading: 'blocking'</Text> with a fast loader.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/blocking/slow" id="nav-to-blocking-slow">
          <Text color="$blue10">Blocking Slow</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
