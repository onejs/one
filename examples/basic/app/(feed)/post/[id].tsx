import { useEffect } from 'react'
import { YStack } from 'tamagui'
import { useNavigation, useParams } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'
import { zero } from '~/features/zero/client'
import { useQuery } from '~/features/zero/query'

export default () => <PostPage />

export function PostPage() {
  const params = useParams()

  const post = useQuery(
    zero.query.posts
      .where('id', '=', `${params.id}`)
      .limit(1)
      .related('replies', (q) => q.limit(100).related('user', (q) => q.limit(1)))
      .related('user', (q) => q.limit(1))
  )[0]

  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({ title: post?.content || `Post #${params.id}` })
  }, [navigation, post?.content, params.id])

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
      </PageContainer>
    </>
  )
}
