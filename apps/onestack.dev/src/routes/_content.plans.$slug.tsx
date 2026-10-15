import { getMDXComponent } from '@vxrn/mdx-rust/client'
import { createFileRoute } from '@tanstack/react-router'
import { loadDocument } from '~/src/content'
import { useMemo } from 'react'
import { H1 } from 'tamagui'
import { DocsRightSidebar } from '~/features/docs/DocsRightSidebar'
import { components } from '~/features/docs/MDXComponents'
import { HeadInfo } from '~/features/site/HeadInfo'
import { nbspLastWord, SubTitle } from '~/features/site/SubTitle'

export const Route = createFileRoute('/_content/plans/$slug')({
  loader: ({ params }) => loadDocument({ data: { section: 'plans', slug: params.slug } }),
  component: PlanPage,
})

function PlanPage() {
  const { code, frontmatter, slug, excerpt } = Route.useLoaderData()
  const Component = useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <HeadInfo
        title={`${frontmatter.title || frontmatter.description}`}
        description={frontmatter.description}
        excerpt={excerpt}
        openGraph={{
          images: [{ url: `/og/plans/${slug}.png`, width: 1200, height: 630 }],
        }}
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
