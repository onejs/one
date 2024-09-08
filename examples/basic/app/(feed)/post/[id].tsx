import { Button, TextArea, YStack } from 'tamagui'
import { useParams } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import { useSetNavigationOptions } from '~/features/routing/useSetNavigationOptions'
import { PageContainer } from '~/features/ui/PageContainer'
import { zero } from '~/features/zero/client'
import { useQuery } from '~/features/zero/query'

export function PostPage() {
  const params = useParams()

  const post = useQuery(
    zero.query.posts
      .where('id', '=', `${params.id}`)
      .limit(1)
      .related('replies', (q) => q.limit(100).related('user', (q) => q.limit(1)))
      .related('user', (q) => q.limit(1))
  )[0]

  useSetNavigationOptions({
    title: post?.content || `Post #${params.id}`,
  })

  if (!post) {
    return null
  }

  return (
    <>
      <PageContainer>
        <FeedCard {...post} disableLink />
        {post.replies && post.replies.length > 0 && (
          <YStack
            marginLeft="$7"
            borderLeftWidth={1}
            borderRightWidth={1}
            borderColor="$borderColor"
          >
            {post.replies.map((reply) => (
              <FeedCard key={reply.id} {...reply} disableLink isReply />
            ))}
          </YStack>
        )}

        <YStack gap="$4" mt={20} mx={20}>
          <TextArea />
          <Button als="flex-end" onPress={() => {}}>
            Reply
          </Button>
        </YStack>
      </PageContainer>
    </>
  )
}
