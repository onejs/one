import { getMDXComponent } from '@vxrn/mdx-rust/client'
import { useLoader, createRoute } from 'one'
import { useMemo } from 'react'
import { H1 } from 'tamagui'
import { DocsRightSidebar } from '~/features/docs/DocsRightSidebar'
import { components } from '~/features/docs/MDXComponents'
import { expressiveCodeConfig, fileNameToTitle } from '~/features/docs/mdxPlugins'
import { HeadInfo } from '~/features/site/HeadInfo'
import { nbspLastWord, SubTitle } from '~/features/site/SubTitle'

const route = createRoute<'/plans/[slug]'>()

export async function generateStaticParams() {
  const { getAllFrontmatter } = await import('@vxrn/mdx-rust')
  const frontmatters = getAllFrontmatter('data/plans')
  const paths = frontmatters.map(({ slug }) => ({
    slug: slug.replace(/.*plans\//, ''),
  }))
  return paths
}

export const loader = route.createLoader(async ({ params }) => {
  const { getMDXBySlug } = await import('@vxrn/mdx-rust')
  const { frontmatter, code } = await getMDXBySlug('data/plans', params.slug, {
    mdastPlugins: [fileNameToTitle],
    expressiveCode: expressiveCodeConfig,
  })
  const { getExcerpt } = await import('~/features/docs/getExcerpt')
  return {
    frontmatter,
    code,
    excerpt: frontmatter.description ? undefined : getExcerpt('data/plans', params.slug),
  }
})

export default function PlanPage() {
  const { code, frontmatter, excerpt } = useLoader(loader)
  const Component = useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <HeadInfo
        title={`${frontmatter.title || frontmatter.description}`}
        description={frontmatter.description}
        excerpt={excerpt}
      />

      <>
        <H1 marginBottom="4" marginTop="2" size="10" textWrap="web:balance">
          {nbspLastWord(frontmatter.title)}
        </H1>
        {!!frontmatter.description && (
          <SubTitle>{nbspLastWord(frontmatter.description || '')}</SubTitle>
        )}
        <Component components={components as any} />
        <DocsRightSidebar headings={frontmatter.headings} />
      </>
    </>
  )
}
