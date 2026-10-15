import { createFileRoute } from '@tanstack/react-router'
import { RouteLink as Link } from '~/components/RouteLink'
import { loadPosts } from '~/src/content'
import { H1, H2, Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { TopNav } from '~/components/TopNav'
import { authors } from '~/data/authors'
import { Container } from '~/features/site/Containers'
import { HeadInfo } from '~/features/site/HeadInfo'

export const Route = createFileRoute('/_content/blog/')({ loader: () => loadPosts(), component: BlogIndex })

function BlogIndex() {
  const { frontmatters } = Route.useLoaderData()

  return (
    <>
      <HeadInfo title="Blog" description="Latest news and updates from One" />
      <TopNav />

      <Container>
        <YStack paddingTop="12" paddingBottom="8" gap="6">
          <YStack gap="2">
            <H1 size="10">Blog</H1>
            <Paragraph size="6" color="color11">
              News, updates, and insights from the One team.
            </Paragraph>
          </YStack>

          <YStack gap="4">
            {frontmatters.map((post) => {
              const author = post.by ? authors[post.by as keyof typeof authors] : null
              const date = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    timeZone: 'UTC',
                    month: 'long',
                    day: 'numeric',
                  })
                : null

              return (
                <Link key={post.slug} to="/blog/$slug" params={{ slug: post.slug.replace('blog/', '') }}>
                  <YStack
                    padding="5"
                    borderColor="hover:color8 press:color8"
                    backgroundColor="hover:background0025 press:background005"
                    transition="100ms"
                  >
                    <YStack gap="2">
                      <H2 size="7" fontWeight="600">
                        {post.title}
                      </H2>
                      {post.description && (
                        <Paragraph size="5" color="color11">
                          {post.description}
                        </Paragraph>
                      )}
                      <XStack gap="3" marginTop="2">
                        {author && (
                          <SizableText size="3" color="color10">
                            {author.name}
                          </SizableText>
                        )}
                        {date && (
                          <SizableText size="3" color="color10">
                            {date}
                          </SizableText>
                        )}
                        {post.readingTime && (
                          <SizableText size="3" color="color10">
                            {post.readingTime.text}
                          </SizableText>
                        )}
                      </XStack>
                    </YStack>
                  </YStack>
                </Link>
              )
            })}
          </YStack>
        </YStack>
      </Container>
    </>
  )
}
