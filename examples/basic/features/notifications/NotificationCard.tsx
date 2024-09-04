import { Paragraph, Text, XStack, YStack } from 'tamagui'
import { Link } from 'vxs'
import { Image } from '../ui/Image'
import { Card } from '../ui/Card'

type NotificationItem = {
  action: 'like' | 'repost' | 'follow'
  fromUser: {
    username: string
    userLink: string
    avatar: string
  }
  post: {
    postLink: string
    content: string
  } | null
  createdAt: string
}

const actionVerbs: { [key in NotificationItem['action']]: string } = {
  like: 'liked',
  repost: 'reposted',
  follow: 'followed',
}

export const NotificationCard = (props: NotificationItem) => {
  return (
    <Link asChild href={props.post ? props.post.postLink : props.fromUser.userLink}>
      <Card tag="a">
        <Image width={32} height={32} br={100} src={props.fromUser.avatar} />
        <YStack f={1}>
          <Paragraph size="$5">
            <Text fontWeight="bold">{props.fromUser.username}</Text>
            &nbsp;
            {actionVerbs[props.action]}&nbsp;
            {props.post ? 'your post.' : 'you.'}
          </Paragraph>
        </YStack>
      </Card>
    </Link>
  )
}
