import { Link } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

// page without a loader - should always navigate instantly

export default function NoLoaderPage() {
  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">No Loader Page</H1>
      <Paragraph id="page-description">This page has no loader function.</Paragraph>

      <Text>
        Pages without loaders should always navigate instantly since there's nothing to wait for.
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
