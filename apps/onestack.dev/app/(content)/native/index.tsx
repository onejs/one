import { getMDXComponent } from '@vxrn/mdx-rust/client'
import { useLoader } from 'one'
import { useMemo } from 'react'
import { H1 } from 'tamagui'
import { DocsRightSidebar } from '~/features/docs/DocsRightSidebar'
import { components } from '~/features/docs/MDXComponents'
import { expressiveCodeConfig, fileNameToTitle } from '~/features/docs/mdxPlugins'
import { HeadInfo } from '~/features/site/HeadInfo'
import { nbspLastWord, SubTitle } from '~/features/site/SubTitle'

export const loader = async () => {
  const { getMDXBySlug } = await import('@vxrn/mdx-rust')
  const { frontmatter, code } = await getMDXBySlug('data/native', 'overview', {
    mdastPlugins: [fileNameToTitle],
    expressiveCode: expressiveCodeConfig,
  })
  return {
    frontmatter,
    code,
  }
}

export default function NativeOverviewPage() {
  const { code, frontmatter } = useLoader(loader)
  const Component = useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <HeadInfo
        title={`${frontmatter.title || frontmatter.description}`}
        description={frontmatter.description}
        openGraph={{}}
      />

      <>
        {/* @ts-ignore */}
        {!frontmatter.hideTitle && (
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
          </>
        )}
        <Component components={components as any} />
        <DocsRightSidebar headings={frontmatter.headings} />
      </>
    </>
  )
}
