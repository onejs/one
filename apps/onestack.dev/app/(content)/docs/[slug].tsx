import { getMDXComponent } from '@vxrn/mdx-rust/client'
import { useLoader, createRoute } from 'one'
import { useMemo } from 'react'
import { H1 } from 'tamagui'
import { DocsRightSidebar } from '~/features/docs/DocsRightSidebar'
import { components } from '~/features/docs/MDXComponents'
import { expressiveCodeConfig, fileNameToTitle } from '~/features/docs/mdxPlugins'
import { HeadInfo } from '~/features/site/HeadInfo'
import { nbspLastWord, SubTitle } from '~/features/site/SubTitle'

const route = createRoute<'/docs/[slug]'>()

export async function generateStaticParams() {
  const { getAllFrontmatter } = await import('@vxrn/mdx-rust')
  const frontmatters = getAllFrontmatter('data/docs')
  const paths = frontmatters.map(({ slug }) => ({
    slug: slug.replace(/.*docs\//, ''),
  }))
  return paths
}

export const loader = route.createLoader(async ({ params }) => {
  const { getMDXBySlug } = await import('@vxrn/mdx-rust')
  const { frontmatter, code } = await getMDXBySlug('data/docs', params.slug, {
    mdastPlugins: [fileNameToTitle],
    expressiveCode: expressiveCodeConfig,
  })
  const { getExcerpt } = await import('~/features/docs/getExcerpt')
  return {
    frontmatter,
    code,
    slug: params.slug,
    excerpt: frontmatter.description ? undefined : getExcerpt('data/docs', params.slug),
  }
})

export function DocCorePage() {
  const { code, frontmatter, slug, excerpt } = useLoader(loader)
  const Component = useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <HeadInfo
        title={`${frontmatter.title || frontmatter.description}`}
        description={frontmatter.description}
        excerpt={excerpt}
        openGraph={{
          images: [{ url: `/og/docs/${slug}.png`, width: 1200, height: 630 }],
        }}
      />

      <>
        {/* @ts-ignore */}
        {!frontmatter.hideTitle && (
          <>
            <H1 marginBottom="4" marginTop="2" size="10" textWrap="web:balance">
              {nbspLastWord(frontmatter.title)}
            </H1>
            {!!frontmatter.description && (
              <SubTitle>{nbspLastWord(frontmatter.description || '')}</SubTitle>
            )}
          </>
        )}
        <Component components={components as any} />
        <DocsRightSidebar headings={frontmatter.headings} />
      </>
    </>
  )
}
