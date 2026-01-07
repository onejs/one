import { Link, useLoader } from "one";
import { Text, YStack, H1, Paragraph } from "tamagui";

export function loader() {
  return {
    title: "Home Page",
    description: "Welcome to the Routing Flicker Test App",
    timestamp: Date.now(),
  };
}

export default function HomePage() {
  const data = useLoader(loader);

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="page-description">{data.description}</Paragraph>
      <Text id="loader-timestamp">Loaded at: {data.timestamp}</Text>

      <YStack gap="$3" marginTop="$4">
        <Text fontWeight="bold">SSG Pages (always +ssg):</Text>
        <YStack gap="$2" paddingLeft="$2">
          <Link href="/docs" id="nav-to-docs-index">
            <Text color="$blue10">Docs Index</Text>
          </Link>
          <Link href="/docs/getting-started" id="nav-to-docs-getting-started">
            <Text color="$blue10">Docs: Getting Started</Text>
          </Link>
          <Link href="/docs/api-reference" id="nav-to-docs-api-reference">
            <Text color="$blue10">Docs: API Reference</Text>
          </Link>
          <Link href="/docs/advanced-usage" id="nav-to-docs-advanced-usage">
            <Text color="$blue10">Docs: Advanced Usage</Text>
          </Link>
          <Link href="/no-loader" id="nav-to-no-loader">
            <Text color="$blue10">No Loader Page</Text>
          </Link>
        </YStack>

        <Text fontWeight="bold">Default Mode Pages (uses defaultRenderMode):</Text>
        <YStack gap="$2" paddingLeft="$2">
          <Link href="/default-mode" id="nav-to-default-index">
            <Text color="$blue10">Default Mode Index</Text>
          </Link>
          <Link href="/default-mode/page-one" id="nav-to-default-page-one">
            <Text color="$blue10">Default Mode: Page One</Text>
          </Link>
          <Link href="/default-mode/page-two" id="nav-to-default-page-two">
            <Text color="$blue10">Default Mode: Page Two</Text>
          </Link>
          <Link href="/default-mode/page-three" id="nav-to-default-page-three">
            <Text color="$blue10">Default Mode: Page Three</Text>
          </Link>
        </YStack>
      </YStack>
    </YStack>
  );
}
