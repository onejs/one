import { Heart } from '@tamagui/lucide-icons'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { Image } from '../ui/Image'
import type { FeedItem } from './data'
import { Link } from 'vxs'
import { Card } from '../ui/Card'

export const FeedCard = (props: FeedItem) => {
  return (
    <Link href={`/post/${props.id}`}>
      <Card tag="a">
        <Image width={50} height={50} br={100} src={props.user.avatar} />
        <YStack f={1}>
          <XStack>
            <Paragraph size="$5" fow="700">
              {props.user.name}
            </Paragraph>
          </XStack>

          <Paragraph size="$5">{props.content}</Paragraph>

          <XStack mt="$3" jc="space-between" px="$5">
            <StatItem Icon={Heart} count={10} />
            <StatItem Icon={Heart} count={10} />
            <StatItem Icon={Heart} count={10} />
            <StatItem Icon={Heart} count={10} />
          </XStack>
        </YStack>
      </Card>
    </Link>
  )
}

const StatItem = ({ Icon, count }: { Icon: any; count: number }) => {
  return (
    <XStack ai="center" jc="center" gap="$2">
      <Icon color="$color8" size={14} />
      <SizableText fow="700" color="$color8" userSelect="none">
        {count}
      </SizableText>
    </XStack>
  )
}
