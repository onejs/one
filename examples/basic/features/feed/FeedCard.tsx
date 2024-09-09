import { Heart, MessageSquare, Repeat } from '@tamagui/lucide-icons'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { Link } from 'vxs'
import { Card } from '../ui/Card'
import { Image } from '../ui/Image'
import { zero } from '../zero/client'
import { useQuery } from '../zero/query'

type FeedItem = {
  id: string
  disableLink?: boolean
  isReply?: boolean
}

export const feedCardQuery = zero.subquery.posts('id', (q) => q.related('replies').related('user'))

export const feedCardReplyQuery = zero.subquery.replies('id', (q) => q.related('user'))

export const FeedCard = (props: FeedItem) => {
  const [post] = useQuery(
    props.isReply ? feedCardReplyQuery({ id: props.id }) : feedCardQuery({ id: props.id })
  )

  console.log('got', post)

  if (!post) {
    return null
  }

  const user = post.user[0]

  const content = (
    <Card tag="a">
      {user?.avatar_url ? (
        <Image width={32} height={32} br={100} mt="$2" src={user.avatar_url} />
      ) : null}
      <YStack f={1} gap="$2">
        <Paragraph size="$5" fow="bold">
          {user?.username || 'No username'}
        </Paragraph>

        <Paragraph
          size="$4"
          whiteSpace="pre-wrap"
          $gtSm={{
            size: '$5',
          }}
        >
          {post.content}
        </Paragraph>

        {!props.isReply && (
          <XStack mt="$0" jc="flex-end" px="$5" gap="$5">
            {post.replies ? <StatItem Icon={MessageSquare} count={post.replies.length} /> : null}
            <StatItem Icon={Repeat} count={0} />
            <StatItem Icon={Heart} count={0} />
          </XStack>
        )}
      </YStack>
    </Card>
  )

  return props.disableLink ? (
    content
  ) : (
    <Link asChild href={`/post/${props.id}`}>
      {content}
    </Link>
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
