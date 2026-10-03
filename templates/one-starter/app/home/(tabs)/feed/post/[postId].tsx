import { formatDistanceToNow } from '~/interface/ui/display'
import { Image } from '~/interface/ui/image/Image'
import { useMutation } from 'on-zero'
import { useLocalSearchParams, useRouter } from 'one'
import { Button, H4, Paragraph, View, XStack, YStack } from 'tamagui'
import { useSession } from '~/auth/client/authClient'
import { postById } from '~/data/post/queries'
import { useQuery, zero } from '~/data/zero-client'
import { Avatar } from '~/interface/avatars/Avatar'
import { CommentSection } from '~/interface/feed/CommentSection'
import { PageScrollView } from '~/interface/layout/PageScrollView'

export default function PostDetail() {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [deletePost] = useMutation((props: Parameters<typeof zero.mutate.post.delete>[0]) =>
    zero.mutate.post.delete(props),
  )

  const [post] = useQuery(postById, { postId: postId || '' }, { enabled: !!postId })

  if (!post) {
    return (
      <View flex={1} bg="background" justify="center" items="center">
        <Paragraph color="color-10">Loading...</Paragraph>
      </View>
    )
  }

  const isOwn = post.userId === session?.user?.id
  const aspect = post.imageWidth && post.imageHeight ? post.imageWidth / post.imageHeight : 1

  return (
    <PageScrollView contentPaddingTop={12}>
      <YStack
        gap={13}
        mx="auto"
        width="100%"
        maxW={640}
        px="13px web:16px"
        data-testid={`post-detail-${post.id}`}
        testID={`post-detail-${post.id}`}
      >
        <XStack items="center" justify="space-between">
          <Button size="sm" variant="quiet" onPress={() => router.back()}>
            Back
          </Button>
          {isOwn && (
            <Button
              size="sm"
              variant="quiet"
              theme="red"
              testID="delete-post"
              onPress={() => {
                // optimistic: the post disappears immediately, navigate back now.
                deletePost({ id: post.id })
                router.back()
              }}
            >
              Delete
            </Button>
          )}
        </XStack>

        <XStack gap={13} items="center">
          <Avatar name={post.user?.username || post.user?.name || '?'} size={36} />
          <YStack flex={1}>
            <Paragraph fontWeight="600">
              {post.user?.username || post.user?.name || 'Unknown'}
            </Paragraph>
            <Paragraph size="2" color="color-10">
              {formatDistanceToNow(post.createdAt)}
            </Paragraph>
          </YStack>
        </XStack>

        <View width="100%" aspectRatio={aspect} rounded="4" overflow="hidden" bg="color-3">
          <Image src={post.image} width="100%" height="100%" objectFit="cover" />
        </View>

        {post.caption ? (
          <Paragraph
            size="5"
            data-testid={`post-detail-caption-${post.id}`}
            testID={`post-detail-caption-${post.id}`}
          >
            {post.caption}
          </Paragraph>
        ) : null}

        <H4 mt={13}>Comments ({post.comments.length})</H4>
        <CommentSection postId={post.id} comments={post.comments} />
      </YStack>
    </PageScrollView>
  )
}
