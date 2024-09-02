import { Paragraph, Text, XStack, YStack } from 'tamagui'
import { Link } from 'vxs'
import { Image } from '../ui/Image'
import type { NotificationItem } from './data'
import { Card } from '../ui/Card'

export const NotificationCard = (props: NotificationItem) => {
  return (
    <Link asChild href={`/post/${props.postId}`}>
      <Card tag="a">
        <Image width={50} height={50} br={100} src={props.user.avatar} />
        <YStack f={1}>
          <Paragraph size="$5">
            <Text fontWeight="bold">{props.user.name}</Text>
            &nbsp;
            {props.action}&nbsp;your post.
          </Paragraph>
        </YStack>
      </Card>
    </Link>
  )
}
