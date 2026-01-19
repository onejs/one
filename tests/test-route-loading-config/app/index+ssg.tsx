import { Link, useLoader } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

export function loader() {
  return {
    title: 'Route Loading Config Test',
    timestamp: Date.now(),
  }
}

export default function HomePage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>

      <YStack gap="$2">
        <Text fontWeight="bold">Test Pages:</Text>

        <Text marginTop="$2" fontWeight="bold" color="$blue10">
          Blocking Mode (wait for loader):
        </Text>
        <Link href="/blocking/slow" id="nav-to-blocking-slow">
          <Text color="$blue10">Blocking - Slow Loader (500ms)</Text>
        </Link>
        <Link href="/blocking/fast" id="nav-to-blocking-fast">
          <Text color="$blue10">Blocking - Fast Loader</Text>
        </Link>

        <Text marginTop="$2" fontWeight="bold" color="$green10">
          Instant Mode (show Loading component):
        </Text>
        <Link href="/instant/slow" id="nav-to-instant-slow">
          <Text color="$green10">Instant - Slow Loader (500ms)</Text>
        </Link>
        <Link href="/instant/fast" id="nav-to-instant-fast">
          <Text color="$green10">Instant - Fast Loader</Text>
        </Link>

        <Text marginTop="$2" fontWeight="bold" color="$orange10">
          Timed Mode (wait N ms, then show Loading):
        </Text>
        <Link href="/timed/200ms" id="nav-to-timed-200">
          <Text color="$orange10">Timed 200ms - Slow Loader (500ms)</Text>
        </Link>
        <Link href="/timed/600ms" id="nav-to-timed-600">
          <Text color="$orange10">Timed 600ms - Slow Loader (500ms)</Text>
        </Link>

        <Text marginTop="$2" fontWeight="bold" color="$purple10">
          Default Behavior (mode-based):
        </Text>
        <Link href="/default-ssg" id="nav-to-default-ssg">
          <Text color="$purple10">SSG Page (should block)</Text>
        </Link>
        <Link href="/default-spa" id="nav-to-default-spa">
          <Text color="$purple10">SPA Page (should be instant)</Text>
        </Link>

        <Text marginTop="$2" fontWeight="bold" color="$gray10">
          No Loader:
        </Text>
        <Link href="/no-loader" id="nav-to-no-loader">
          <Text color="$gray10">Page without loader</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
