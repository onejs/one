import { Link, useLoader } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

// This page has NO render mode suffix - uses defaultRenderMode from config
export function loader() {
  return {
    title: 'Default Mode Index',
    description: 'This page uses the defaultRenderMode from vite config',
  }
}

export default function DefaultModeIndexPage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="default-title">{data.title}</H1>
      <Paragraph id="default-description">{data.description}</Paragraph>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">Default Mode Pages (dynamic routes):</Text>
        <Link href="/default-mode/page-one" id="nav-to-default-page-one">
          <Text color="$blue10">Page One</Text>
        </Link>
        <Link href="/default-mode/page-two" id="nav-to-default-page-two">
          <Text color="$blue10">Page Two</Text>
        </Link>
        <Link href="/default-mode/page-three" id="nav-to-default-page-three">
          <Text color="$blue10">Page Three</Text>
        </Link>
      </YStack>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">SSG Pages:</Text>
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
        <Link href="/no-loader" id="nav-to-no-loader">
          <Text color="$blue10">No Loader Page</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
