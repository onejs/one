import { Image as Image2 } from '@tamagui/image-next'
import { Heart } from '@tamagui/lucide-icons'
import { Image, Paragraph, SizableText, styled, View, XStack, YStack } from 'tamagui'
import { Stack, useLoader } from 'vxs'

export function loader() {
  return {
    feed,
  }
}

export default function FeedPage() {
  const { feed } = useLoader(loader)

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <YStack maw={600} mx="auto">
        {feed.map((item, i) => {
          return <FeedCard key={i} {...item} />
        })}
      </YStack>
    </>
  )
}

const FeedCard = (props: (typeof feed)[0]) => {
  return (
    <XStack f={1} ov="hidden" p="$4" gap="$5" bbw={1} bbc="$borderColor">
      <WebImage width={50} height={50} br={100} src={props.user.avatar} />
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
    </XStack>
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

const feed = [
  {
    content: `I work 9-5, have a family, manage to publish videos consistently, work on side projects, run 2-3 miles daily, but you can’t even finish watching one 30 minute coding tutorial.

You don’t need guidance.
you don’t need a mentor.
You need discipline.`,
    user: {
      name: `SomeRandomDevWeb`,
      avatar: `https://placecats.com/millie/300/200`,
    },
  },
  {
    content: `If you are starting a new project, please don't use Jest.
Use Vitest instead.`,
    user: {
      name: `Floren Ryance`,
      avatar: `https://placecats.com/neo/300/200`,
    },
  },
  {
    content: `Cursor is pure hype, Cursor is shiny object syndrome.

Microsoft will answer with a better integration of copilot and everyone will be back to vscode...`,
    user: {
      name: `PrimeRageN`,
      avatar: `https://placecats.com/millie_neo/300/200`,
    },
  },
  {
    content: `Honestly when trying to find outlier founders, a large part of it is finding the autist nerds who will go infinitely deep on a particular topic that happens to be extremely valuable for making something people want`,
    user: {
      name: `bramadov 22`,
      avatar: `https://placecats.com/neo_banana/300/200`,
    },
  },
]

const WebImage = styled(View, {
  name: 'Image',
  tag: 'img',
})
