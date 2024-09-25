import { Heart, MessageSquare, Repeat } from '@tamagui/lucide-icons'
import { useQuery } from 'vxs/zero'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { Link } from '../routing/Link'
import { Card, type CardProps } from '../ui/Card'
import { Image } from '../ui/Image'
import { type Param, zero, type ZeroResult } from '../zero/client'

type FeedItemProps = {
  id: Param<string>
  disableLink?: boolean
}

export const feedCardQuery = (id: Param<string>) => {
  return zero.query.posts.where('id', id).related('replies').related('user')
}

export const FeedCard = (props: FeedItemProps) => {
  const [post] = useQuery(feedCardQuery(props.id))

  if (!post) {
    return null
  }

  return (
    <Link asChild passthrough={props.disableLink} href={`/feed/${props.id}`}>
      <FeedCardContent post={post} disableLink={props.disableLink}>
        <XStack mt="$0" jc="flex-end" px="$5" gap="$5">
          {post.replies ? <StatItem Icon={MessageSquare} count={post.replies.length} /> : null}
          <StatItem Icon={Repeat} count={0} />
          <StatItem Icon={Heart} count={0} />
        </XStack>
      </FeedCardContent>
    </Link>
  )
}

export const feedCardReplyQuery = (id: Param<string>) => {
  return zero.query.replies.where('id', id).related('user')
}

export const FeedCardReply = (props: FeedItemProps) => {
  const [post] = useQuery(feedCardReplyQuery(props.id))

  if (!post) {
    return null
  }

  return (
    <Link asChild passthrough={props.disableLink} href={`/feed/${props.id}`}>
      <FeedCardContent post={post} />
    </Link>
  )
}

type FeedCardRow = ZeroResult<typeof feedCardQuery>
type FeedCardReplyRow = ZeroResult<typeof feedCardReplyQuery>

type FeedCardContentProps = {
  post: FeedCardRow | FeedCardReplyRow
  children?: React.ReactNode
}

const FeedCardContent = ({ post, children, ...props }: CardProps & FeedCardContentProps) => {
  const [user] = post.user

  if (!user) {
    return null
  }

  return (
    <Card {...props}>
      {!!user.avatar_url && <Image width={36} height={36} br={100} mt="$2" src={user.avatar_url} />}
      <YStack f={1} gap="$2">
        <Paragraph size="$5" fow="bold">
          {user.username}
        </Paragraph>

        <Paragraph
          cur="inherit"
          size="$4"
          whiteSpace="pre-wrap"
          $gtSm={{
            size: '$5',
          }}
        >
          {post.content}
        </Paragraph>

        {children}
      </YStack>
    </Card>
  )
}

const StatItem = ({ Icon, count }: { Icon: any; count: number }) => {
  return (
    <XStack ai="center" jc="center" gap="$2">
      <Icon color="$color10" size={14} />
      <SizableText fow="700" color="$color10" userSelect="none">
        {count}
      </SizableText>
    </XStack>
  )
}
