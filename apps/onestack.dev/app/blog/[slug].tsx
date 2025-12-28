import { getMDXComponent } from 'mdx-bundler/client'
import { useLoader, createRoute, Link } from 'one'
import { useMemo } from 'react'
import { H1, Paragraph, XStack, YStack, Text, Separator } from 'tamagui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { TopNav } from '~/components/TopNav'
import { Container } from '~/features/site/Containers'
import { components } from '~/features/docs/MDXComponents'
import { HeadInfo } from '~/features/site/HeadInfo'
import { authors } from '~/data/authors'

const route = createRoute<'/blog/[slug]'>()

export async function generateStaticParams() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/blog')
  return frontmatters.map(({ slug }) => ({
    slug: slug.replace('blog/', ''),
  }))
}

export const loader = route.createLoader(async ({ params }) => {
  const { getMDXBySlug } = await import('@vxrn/mdx')
  const { frontmatter, code } = await getMDXBySlug('data/blog', params.slug)
  return {
    frontmatter,
    code,
  }
})

export default function BlogPost() {
  const { code, frontmatter } = useLoader(loader)
  const Component = useMemo(() => getMDXComponent(code), [code])

  const author = frontmatter.by
    ? authors[frontmatter.by as keyof typeof authors]
    : null
  const date = frontmatter.publishedAt
    ? new Date(frontmatter.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <>
      <HeadInfo
        title={frontmatter.title}
        description={frontmatter.description}
      />
      <TopNav />

      <Container>
        <YStack py="$8" gap="$6" maw={720} mx="auto">
          <Link href="/blog">
            <XStack
              gap="$2"
              ai="center"
              color="$color10"
              hoverStyle={{ color: '$color12' }}
            >
              <ChevronLeft size={16} />
              <Text size="$3">Back to Blog</Text>
            </XStack>
          </Link>

          <YStack gap="$4">
            <H1 size="$10">{frontmatter.title}</H1>
            {frontmatter.description && (
              <Paragraph size="$6" color="$color11">
                {frontmatter.description}
              </Paragraph>
            )}
            <XStack gap="$3" ai="center">
              {author && (
                <Text size="$4" fontWeight="500">
                  {author.name}
                </Text>
              )}
              {author && date && (
                <Text color="$color10">·</Text>
              )}
              {date && (
                <Text size="$4" color="$color10">
                  {date}
                </Text>
              )}
              {frontmatter.readingTime && (
                <>
                  <Text color="$color10">·</Text>
                  <Text size="$4" color="$color10">
                    {frontmatter.readingTime.text}
                  </Text>
                </>
              )}
            </XStack>
          </YStack>

          <Separator />

          <YStack className="blog-content">
            <Component components={components as any} />
          </YStack>
        </YStack>
      </Container>
    </>
  )
}
