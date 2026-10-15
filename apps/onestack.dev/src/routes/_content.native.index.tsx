import { getMDXComponent } from '@vxrn/mdx-rust/client'
import { createFileRoute } from '@tanstack/react-router'
import { loadDocument } from '~/src/content'
import { useMemo } from 'react'
import { H1 } from 'tamagui'
import { DocsRightSidebar } from '~/features/docs/DocsRightSidebar'
import { components } from '~/features/docs/MDXComponents'
import { HeadInfo } from '~/features/site/HeadInfo'
import { nbspLastWord, SubTitle } from '~/features/site/SubTitle'

export const Route = createFileRoute('/_content/native/')({ loader: () => loadDocument({ data: { section: 'native', slug: 'overview' } }), component: NativeOverviewPage })

function NativeOverviewPage() {
  const { code, frontmatter } = Route.useLoaderData()
  const Component = useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <HeadInfo
        title={`${frontmatter.title || frontmatter.description}`}
        description={frontmatter.description}
        openGraph={{
          images: [{ url: '/og/native/overview.png', width: 1200, height: 630 }],
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
