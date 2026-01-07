import { Link, useLoader } from 'one'
import { Text, YStack, H1, H2, Paragraph } from 'tamagui'

const DOCS_CONTENT: Record<
  string,
  { title: string; content: string; sections: string[] }
> = {
  'getting-started': {
    title: 'Getting Started',
    content:
      'This guide will help you get started with the framework. Follow these steps to set up your first project and start building amazing applications.',
    sections: ['Installation', 'Configuration', 'First Steps', 'Next Steps'],
  },
  'api-reference': {
    title: 'API Reference',
    content:
      'Complete API documentation for all available functions, hooks, and components. Use this as your reference guide when building applications.',
    sections: ['Core APIs', 'Hooks', 'Components', 'Utilities'],
  },
  'advanced-usage': {
    title: 'Advanced Usage',
    content:
      'Learn advanced patterns and techniques for building complex applications. This section covers optimization, best practices, and advanced features.',
    sections: ['Performance', 'Patterns', 'Integration', 'Testing'],
  },
}

export async function generateStaticParams() {
  return Object.keys(DOCS_CONTENT).map((slug) => ({ slug }))
}

export async function loader({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const doc = DOCS_CONTENT[slug] || {
    title: 'Unknown Page',
    content: 'This documentation page was not found.',
    sections: [],
  }

  // simulate realistic loader delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    slug,
    ...doc,
    timestamp: Date.now(),
    allSlugs: Object.keys(DOCS_CONTENT),
  }
}

export default function DocsSlugPage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="doc-title">{data.title}</H1>
      <Paragraph id="doc-content">{data.content}</Paragraph>

      <YStack gap="$2">
        <H2>Sections</H2>
        {data.sections.map((section, i) => (
          <Text key={i} id={`section-${i}`}>
            {i + 1}. {section}
          </Text>
        ))}
      </YStack>

      <YStack gap="$2" marginTop="$4">
        <Text fontWeight="bold">Other Doc Pages (SSG):</Text>
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
        <Text fontWeight="bold">Navigation:</Text>
        <Link href="/docs" id="nav-to-docs-index">
          <Text color="$blue10">Docs Index</Text>
        </Link>
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

      <Text id="doc-slug" fontSize="$2" color="$gray10">
        Slug: {data.slug}
      </Text>
      <Text id="doc-timestamp" fontSize="$2" color="$gray10">
        Loaded at: {data.timestamp}
      </Text>
    </YStack>
  )
}
