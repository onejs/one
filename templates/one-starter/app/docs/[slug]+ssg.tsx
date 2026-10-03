import { MDX } from 'starter-mdx'
import { compileMDX } from 'starter-mdx/build'
import { createRoute, useLoader } from 'one'
import { Paragraph, YStack } from 'tamagui'
import { DocsLayout } from '~/features/docs/DocsLayout'
import { docsRoutes } from '~/features/docs/docsRoutes'
import { components } from '~/features/docs/MDXComponents'
import { SiteShell } from '~/interface/site/SiteShell'
import gettingStartedSource from '../../docs/getting-started.mdx?raw'
import introSource from '../../docs/intro.mdx?raw'

const route = createRoute<'/docs/[slug]'>()
const docs: Record<string, string> = {
  intro: introSource,
  'getting-started': gettingStartedSource,
}

export async function generateStaticParams() {
  return docsRoutes.map((entry) => ({ slug: entry.slug }))
}

export const loader = route.createLoader(async ({ params }) => {
  const slug = params.slug ?? 'intro'
  const source = docs[slug]
  return {
    slug,
    mdx: source ? await compileMDX(source) : null,
  }
})

export default function DocsSlugPage() {
  const data = useLoader(loader)
  const slug = data?.slug ?? 'intro'
  const title = docsRoutes.find((entry) => entry.slug === slug)?.title ?? slug

  return (
    <SiteShell>
      <DocsLayout slug={slug} title={title}>
        {data?.mdx ? (
          <MDX hast={data.mdx.hast} components={components} />
        ) : (
          <YStack py="8">
            <Paragraph color={`${data ? 'red-900' : 'color-9'}`}>
              {data ? `Document not found: ${slug}` : 'Loading…'}
            </Paragraph>
          </YStack>
        )}
      </DocsLayout>
    </SiteShell>
  )
}
