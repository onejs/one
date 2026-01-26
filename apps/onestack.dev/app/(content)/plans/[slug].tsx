import { getMDXComponent } from 'mdx-bundler/client'
import { useLoader, createRoute } from 'one'
import { useMemo } from 'react'
import { H1 } from 'tamagui'
import { DocsRightSidebar } from '~/features/docs/DocsRightSidebar'
import { components } from '~/features/docs/MDXComponents'
import { HeadInfo } from '~/features/site/HeadInfo'
import { nbspLastWord, SubTitle } from '~/features/site/SubTitle'

const route = createRoute<'/plans/[slug]'>()

export async function generateStaticParams() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/plans')
  const paths = frontmatters.map(({ slug }) => ({
    slug: slug.replace(/.*plans\//, ''),
  }))
  return paths
}

export const loader = route.createLoader(async ({ params }) => {
  const { getMDXBySlug } = await import('@vxrn/mdx')
  const { frontmatter, code } = await getMDXBySlug('data/plans', params.slug)
  return {
    frontmatter,
    code,
  }
})

export default function PlanPage() {
  const { code, frontmatter } = useLoader(loader)
  const Component = useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <HeadInfo
        title={`${frontmatter.title || frontmatter.description}`}
        description={frontmatter.description}
      />

      <>
        <H1
          mb="$4"
          mt="$2"
          size="$10"
          $platform-web={{
            textWrap: 'balance',
          }}
        >
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
