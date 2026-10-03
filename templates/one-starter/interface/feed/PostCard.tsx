import { formatDistanceToNow } from '~/interface/ui/display'
import { Image } from '~/interface/ui/image/Image'
import { memo } from 'react'
import { isWeb, Paragraph, View, XStack, YStack } from 'tamagui'
import { postDetailHref } from '~/features/app/routes'
import { Link } from '~/interface/app/Link'
import { Avatar } from '~/interface/avatars/Avatar'
import type { PostWithLatestComment } from '~/types'

interface PostCardProps {
  post: PostWithLatestComment
  // feed position, drives the entrance stagger (capped at the first screenful)
  index?: number
}

export const PostCard = memo(({ post, index = 0 }: PostCardProps) => {
  const rawAspect = post.imageWidth && post.imageHeight ? post.imageWidth / post.imageHeight : 4 / 3
  const aspect = Math.min(Math.max(rawAspect, 4 / 5), 16 / 9)
  const postHref = postDetailHref(post.id)

  const latestComment = post.comments?.[0]

  return (
    <View
      bg="color-2"
      rounded="4"
      overflow="hidden"
      borderWidth={1}
      borderColor="border-color"
      transition={{ default: 'medium', delay: Math.min(index, 6) * 50 }}
      opacity="1 press:0.92 enter:0"
      y="0 enter:12px"
      data-testid={`post-card-${post.id}`}
      testID={`post-card-${post.id}`}
    >
      <XStack p={13} gap={13} items="center">
        <Avatar name={post.user?.username || post.user?.name || '?'} size={32} />
        <YStack flex={1}>
          <Paragraph fontWeight="600">
            {post.user?.username || post.user?.name || 'Unknown'}
          </Paragraph>
          <Paragraph size="2" color="color-10">
            {formatDistanceToNow(post.createdAt)}
          </Paragraph>
        </YStack>
      </XStack>

      <Link asChild href={postHref}>
        <View
          render="a"
          cursor="pointer"
          data-testid={`post-open-${post.id}`}
          testID={`post-open-${post.id}`}
          data-href={postHref}
          pointerEvents="auto"
          style={isWeb ? { scrollMarginTop: 96 } : undefined}
        >
          <View
            width="100%"
            aspectRatio={aspect}
            bg="color-3"
            pointerEvents="auto"
            style={isWeb ? { scrollMarginTop: 96 } : undefined}
          >
            <Image src={post.image} width="100%" height="100%" objectFit="cover" />
          </View>
        </View>
      </Link>

      <YStack p={13} gap={7}>
        {post.caption ? (
          <Link asChild href={postHref}>
            <View
              render="a"
              cursor="pointer"
              data-testid={`post-caption-link-${post.id}`}
              testID={`post-caption-link-${post.id}`}
              data-href={postHref}
              style={
                isWeb
                  ? { scrollMarginTop: 96, textDecorationLine: 'none', color: 'inherit' }
                  : undefined
              }
            >
              <Paragraph
                numberOfLines={3}
                data-href={postHref}
                data-testid={`post-caption-${post.id}`}
                testID={`post-caption-${post.id}`}
                style={isWeb ? { scrollMarginTop: 96 } : undefined}
              >
                {post.caption}
              </Paragraph>
            </View>
          </Link>
        ) : null}

        {(post.commentCount ?? 0) > 0 ? (
          <Link asChild href={postHref}>
            <View
              render="a"
              cursor="pointer"
              data-testid={`post-comments-link-${post.id}`}
              testID={`post-comments-link-${post.id}`}
              data-href={postHref}
              style={
                isWeb
                  ? { scrollMarginTop: 96, textDecorationLine: 'none', color: 'inherit' }
                  : undefined
              }
            >
              <Paragraph size="2" color="color-10">
                View {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
              </Paragraph>
            </View>
          </Link>
        ) : null}

        {latestComment ? (
          <XStack gap={7}>
            <Paragraph size="3" fontWeight="600">
              {latestComment.user?.username || latestComment.user?.name || 'Unknown'}
            </Paragraph>
            <Paragraph size="3" flex={1} numberOfLines={2}>
              {latestComment.content}
            </Paragraph>
          </XStack>
        ) : null}
      </YStack>
    </View>
  )
})
