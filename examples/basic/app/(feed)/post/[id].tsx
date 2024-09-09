import { useState } from 'react'
import { Button, ScrollView, SizableText, TextArea, XStack, YStack } from 'tamagui'
import { route } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import type { ExpectedResult } from '~/features/helpers/param'
import { uuid } from '~/features/helpers/uuid'
import { useSetNavigationOptions } from '~/features/routing/useSetNavigationOptions'
import { Image } from '~/features/ui/Image'
import { PageContainer } from '~/features/ui/PageContainer'
import { useUser } from '~/features/user/useUser'
import { zero } from '~/features/zero/client'
import { useQuery } from '~/features/zero/query'

const { createLoader, useParams } = route.post.id

export const loader = createLoader(({ params }) => postQuery(params))

const postQuery = zero.subquery.posts('id', (q) =>
  q
    .limit(1)
    .related('replies', (q) =>
      q
        .orderBy('created_at', 'asc')
        .limit(100)
        .related('user', (q) => q.limit(1))
    )
    .related('user', (q) => q.limit(1))
)

export function PostPage() {
  const params = useParams()
  const post = useQuery(postQuery(params))[0]

  useSetNavigationOptions({
    title: post?.content || `Post #${params.id}`,
  })

  if (!post) {
    return null
  }

  return (
    <ScrollView>
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
              <FeedCard key={reply.id} id={reply.id} disableLink isReply />
            ))}
          </YStack>
        )}

        <YStack gap="$4" mt={20} mx={20}>
          <ReplyBox post={[post]} />
        </YStack>
      </PageContainer>
    </ScrollView>
  )
}

function ReplyBox({ post }: { post: ExpectedResult<typeof postQuery> }) {
  const user = useUser()
  const [content, setContent] = useState('')
  const charLimit = 160
  const isOverLimit = content.length > charLimit

  return (
    <XStack gap="$3" theme={isOverLimit ? 'red_active' : undefined}>
      {user && <Image width={32} height={32} br={100} mt="$2" src={user.avatar_url} />}
      <YStack gap="$3" flexGrow={1}>
        <TextArea
          onChangeText={(text) => {
            setContent(text)
          }}
          placeholder={`What ya thinkin'?`}
          borderColor="none"
          borderWidth={0}
          value={content}
          multiline={true}
          rows={3}
        />
        <XStack justifyContent="space-between">
          <SizableText color={isOverLimit ? '$red10' : undefined} size="$1">
            {content.length} / {charLimit}
          </SizableText>
          <Button
            disabled={isOverLimit}
            als="flex-end"
            onPress={() => {
              if (user) {
                zero.mutate.replies.create({
                  id: uuid(),
                  content,
                  created_at: Date.now(),
                  post_id: post[0].id,
                  user_id: user.id,
                })
                setContent('')
              }
            }}
          >
            Reply
          </Button>
        </XStack>
      </YStack>
    </XStack>
  )
}
