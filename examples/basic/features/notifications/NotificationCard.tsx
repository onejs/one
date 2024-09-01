import { Paragraph, Text, XStack, YStack } from 'tamagui'
import { Link } from 'vxs'
import { Image } from '../ui/Image'
import type { NotificationItem } from './data'

export const NotificationCard = (props: NotificationItem) => {
  return (
    <Link href={`/post/${props.postId}`}>
      <XStack f={1} ov="hidden" p="$4" gap="$5" bbw={1} bbc="$borderColor">
        <Image width={50} height={50} br={100} src={props.user.avatar} />
        <YStack f={1}>
          <Paragraph size="$5">
            <Text fontWeight="bold">{props.user.name}</Text>
            {props.action} your post.
          </Paragraph>
        </YStack>
      </XStack>
    </Link>
  )
}
