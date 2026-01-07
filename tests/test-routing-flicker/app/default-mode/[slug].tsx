import { Link, useLoader } from "one";
import { Text, YStack, H1, Paragraph } from "tamagui";

// Dynamic route WITHOUT +ssg suffix - uses defaultRenderMode from config
const PAGES: Record<string, { title: string; content: string }> = {
  "page-one": {
    title: "Page One",
    content:
      "This is the first page using default render mode. It has dynamic content loaded via useLoader.",
  },
  "page-two": {
    title: "Page Two",
    content:
      "This is the second page using default render mode. Navigate between pages to test for flicker.",
  },
  "page-three": {
    title: "Page Three",
    content:
      "This is the third page using default render mode. All pages share the same dynamic route.",
  },
};

export async function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function loader({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const page = PAGES[slug] || {
    title: "Unknown Page",
    content: "This page was not found.",
  };

  // simulate realistic loader delay
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    slug,
    ...page,
    allSlugs: Object.keys(PAGES),
  };
}

export default function DefaultModeSlugPage() {
  const data = useLoader(loader);

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="default-slug-title">{data.title}</H1>
      <Paragraph id="default-slug-content">{data.content}</Paragraph>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">Other Default Mode Pages:</Text>
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
        <Text fontWeight="bold">Navigation:</Text>
        <Link href="/default-mode" id="nav-to-default-index">
          <Text color="$blue10">Default Mode Index</Text>
        </Link>
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Home (SSG)</Text>
        </Link>
        <Link href="/docs" id="nav-to-docs-index">
          <Text color="$blue10">Docs Index (SSG)</Text>
        </Link>
        <Link href="/docs/getting-started" id="nav-to-docs-getting-started">
          <Text color="$blue10">Docs: Getting Started (SSG)</Text>
        </Link>
        <Link href="/docs/api-reference" id="nav-to-docs-api-reference">
          <Text color="$blue10">Docs: API Reference (SSG)</Text>
        </Link>
        <Link href="/no-loader" id="nav-to-no-loader">
          <Text color="$blue10">No Loader Page (SSG)</Text>
        </Link>
      </YStack>

      <Text id="default-slug" fontSize="$2" color="$gray10">
        Slug: {data.slug}
      </Text>
    </YStack>
  );
}
