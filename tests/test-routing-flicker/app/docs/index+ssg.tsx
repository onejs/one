import { Link, useLoader } from "one";
import { Text, YStack, H1, Paragraph } from "tamagui";

export function loader() {
  return {
    title: "Documentation",
    description: "Browse all documentation pages",
    pages: [
      { slug: "getting-started", title: "Getting Started" },
      { slug: "api-reference", title: "API Reference" },
      { slug: "advanced-usage", title: "Advanced Usage" },
    ],
    timestamp: Date.now(),
  };
}

export default function DocsIndexPage() {
  const data = useLoader(loader);

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="docs-title">{data.title}</H1>
      <Paragraph id="docs-description">{data.description}</Paragraph>

      <YStack gap="$2">
        <Text fontWeight="bold">Documentation Pages:</Text>
        <Link href="/docs/getting-started" id="nav-to-docs-getting-started">
          <Text color="$blue10">Getting Started</Text>
        </Link>
        <Link href="/docs/api-reference" id="nav-to-docs-api-reference">
          <Text color="$blue10">API Reference</Text>
        </Link>
        <Link href="/docs/advanced-usage" id="nav-to-docs-advanced-usage">
          <Text color="$blue10">Advanced Usage</Text>
        </Link>
      </YStack>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">Other Pages:</Text>
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Home</Text>
        </Link>
        <Link href="/no-loader" id="nav-to-no-loader">
          <Text color="$blue10">No Loader Page</Text>
        </Link>
        <Link href="/default-mode" id="nav-to-default-index">
          <Text color="$blue10">Default Mode Index</Text>
        </Link>
        <Link href="/default-mode/page-one" id="nav-to-default-page-one">
          <Text color="$blue10">Default Mode: Page One</Text>
        </Link>
      </YStack>

      <Text id="docs-timestamp" fontSize="$2" color="$gray10">
        Loaded at: {data.timestamp}
      </Text>
    </YStack>
  );
}
