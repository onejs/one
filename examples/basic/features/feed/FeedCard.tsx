import { Heart, MessageSquare, Repeat } from '@tamagui/lucide-icons'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { Link } from 'vxs'
import { Card } from '../ui/Card'
import { Image } from '../ui/Image'

type FeedItem = {
  id: string
  content: string
  created_at: number
  user: {
    username: string
    avatar_url?: string
  }[]
  disableLink?: boolean
  isReply?: boolean
  replies?: {
    id: string
    content: string
    created_at: number
    user: {
      username: string
      avatar_url?: string
    }[]
  }[]
}

// export const feedCardQuery = expect(zero.query.posts, (q) => q.related('user', q => q.limit(1)))

export const FeedCard = (props: FeedItem) => {
  const user = props.user[0]

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
          {props.content}
        </Paragraph>

        {!props.isReply && (
          <XStack mt="$0" jc="flex-end" px="$5" gap="$5">
            {props.replies ? (
              <StatItem Icon={MessageSquare} count={props.replies.length} />
            ) : null}
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
