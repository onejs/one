import { Link, useLoader, useLoaderState } from 'one'
import { Text, YStack, H1, Paragraph, Spinner } from 'tamagui'

// no config export - uses default behavior based on render mode
// SPA pages default to instant

export function Loading() {
  return (
    <YStack padding="$4" gap="$4" id="loading-state">
      <Spinner size="large" color="$purple10" />
      <Text id="loading-text">Loading default SPA page...</Text>
    </YStack>
  )
}

export async function loader() {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    title: 'Default SPA Page',
    mode: 'spa',
    defaultBehavior: 'instant',
    loadTime: 300,
    timestamp: Date.now(),
  }
}

export default function DefaultSPAPage() {
  const { data, state } = useLoaderState(loader)

  if (!data) {
    return <Loading />
  }

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="render-mode">Render mode: {data.mode}</Paragraph>
      <Paragraph id="default-behavior">Default behavior: {data.defaultBehavior}</Paragraph>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>
      <Paragraph id="loader-state">Loader state: {state}</Paragraph>

      <Text>
        This SPA page has no config export, so it uses the default behavior. SPA pages default to{' '}
        <Text fontWeight="bold">instant</Text> navigation with a Loading component.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/default-ssg" id="nav-to-default-ssg">
          <Text color="$purple10">Default SSG</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
