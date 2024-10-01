import { Heart, Repeat, Reply } from '@tamagui/lucide-icons'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { Link } from 'one'
import { Card } from '../ui/Card'
import { Image } from '../ui/Image'

type FeedItem = {
  id: number
  content: string
  createdAt: string
  user: {
    name: string
    avatar: string
  }
  likesCount: number
  repliesCount: number
  repostsCount: number
  disableLink?: boolean
  isReply?: boolean
}

export const FeedCard = (props: FeedItem) => {
  if (!props.user) return null

  const content = (
    <Card tag="a">
      <Image width={32} height={32} br={100} mt="$2" src={props.user.avatar} />
      <YStack f={1} gap="$2">
        <Paragraph size="$5" fow="bold">
          {props.user.name}
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
        {!props.isReply ? (
          <XStack mt="$0" jc="flex-end" px="$5" gap="$5">
            <StatItem Icon={Reply} count={props.repliesCount} />
            <StatItem Icon={Repeat} count={props.repostsCount} />
            <StatItem Icon={Heart} count={props.likesCount} />
          </XStack>
        ) : null}
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
