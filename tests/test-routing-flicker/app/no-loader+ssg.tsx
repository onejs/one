import { Link } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

// This page has NO loader - tests navigation from loader pages to non-loader pages
export default function NoLoaderPage() {
  return (
    <YStack padding="$4" gap="$4">
      <H1 id="no-loader-title">No Loader Page</H1>
      <Paragraph id="no-loader-description">
        This SSG page has no loader function. It is statically generated with no dynamic data.
      </Paragraph>

      <Text id="no-loader-marker">Static content only - no useLoader</Text>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">SSG Pages (with loaders):</Text>
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Home</Text>
        </Link>
        <Link href="/docs" id="nav-to-docs-index">
          <Text color="$blue10">Docs Index</Text>
        </Link>
        <Link href="/docs/getting-started" id="nav-to-docs-getting-started">
          <Text color="$blue10">Docs: Getting Started</Text>
        </Link>
        <Link href="/docs/api-reference" id="nav-to-docs-api-reference">
          <Text color="$blue10">Docs: API Reference</Text>
        </Link>
      </YStack>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">Default Mode Pages:</Text>
        <Link href="/default-mode" id="nav-to-default-index">
          <Text color="$blue10">Default Mode Index</Text>
        </Link>
        <Link href="/default-mode/page-one" id="nav-to-default-page-one">
          <Text color="$blue10">Default Mode: Page One</Text>
        </Link>
        <Link href="/default-mode/page-two" id="nav-to-default-page-two">
          <Text color="$blue10">Default Mode: Page Two</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
