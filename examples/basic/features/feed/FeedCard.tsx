import { Heart, Repeat, Reply } from '@tamagui/lucide-icons'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { Link } from 'vxs'
import { Card } from '../ui/Card'
import { Image } from '../ui/Image'
import type { FeedItem } from './data'

export const FeedCard = (props: FeedItem & { disableLink?: boolean }) => {
  const content = (
    <Card disableLink={props.disableLink} tag="a">
      <Image width={32} height={32} br={100} mt="$2" src={props.user.avatar} />
      <YStack f={1} gap="$2">
        <Paragraph
          size="$5"
          fow="bold"
          textDecorationLine="underline"
          textDecorationStyle="solid"
          textDecorationColor="$color8"
          cur="default"
        >
          {props.user.name}
        </Paragraph>

        <Paragraph
          size="$4"
          whiteSpace="pre-wrap"
          cur="default"
          $gtSm={{
            size: '$5',
          }}
        >
          {props.content}
        </Paragraph>
        <XStack mt="$0" jc="flex-end" px="$5" gap="$5">
          <StatItem Icon={Repeat} count={4} />
          <StatItem Icon={Heart} count={73} />
          <StatItem Icon={Reply} count={4} />
        </XStack>
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
