import { Home, MessageCircle, Scroll, Search } from '@tamagui/lucide-icons'
import { useState } from 'react'
import {
  Circle,
  H3,
  Input,
  ScrollView,
  Separator,
  SizableText,
  Spacer,
  styled,
  XStack,
  YStack,
} from 'tamagui'
import { OneBall } from '~/features/brand/Logo'

export default function HomePage() {
  return (
    <YStack h={0} f={1}>
      <Head />

      <XStack h={0} ai="stretch" f={1}>
        <Sidebar />
        <Main />
      </XStack>
    </YStack>
  )
}

const Head = () => {
  return (
    <XStack
      data-tauri-drag-region
      bg="rgba(0,0,0,0.1)"
      br="$4"
      mx={2}
      ai="center"
      jc="center"
      y={2}
      h={36}
      mb={4}
    >
      <YStack pos="absolute" t={0} r={4} b={0} ai="center" jc="center">
        <XStack ai="center" gap="$2">
          <Search size={16} o={0.5} />
          <Input w={250} placeholder="" size="$2" bw={0} />
        </XStack>
      </YStack>

      <H3 m={0} o={0.5} size="$2">
        One
      </H3>
    </XStack>
  )
}

const Main = () => {
  return (
    <YStack f={1}>
      <RecentThreads />
      <MainChatList />
      <MessageArea />
    </YStack>
  )
}

const ThreadButtonFrame = styled(XStack, {
  ai: 'center',
  gap: '$2',
  py: '$1.5',
  px: '$2.5',
  br: '$4',
  hoverStyle: {
    bg: '$color3',
  },

  variants: {
    active: {
      true: {
        bg: '$color3',
      },
    },

    size: {
      large: {
        py: '$3',
        px: '$4',
      },
    },
  } as const,
})

const RecentThreads = () => {
  return (
    <XStack pos="absolute" t={0} l={0} r={0} bg="$color1" elevation={4} zi={100}>
      <XStack p="$2" px="$3" ai="center" gap="$1">
        <ThreadButtonFrame active>
          <Home />
        </ThreadButtonFrame>
        <ChatThreadButton />
      </XStack>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} ml={-20}>
        <XStack p="$2" px="$3" ai="center" gap="$1">
          <ThreadButton />
          <ThreadButton />
          <ThreadButton />
          <ThreadButton />
        </XStack>
      </ScrollView>
    </XStack>
  )
}

const ChatThreadButton = () => {
  return (
    <ThreadButtonFrame>
      <MessageCircle size={20} />

      <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        Chat
      </SizableText>
    </ThreadButtonFrame>
  )
}

const ThreadButton = () => {
  return (
    <ThreadButtonFrame>
      <Circle size={32} bg="$color9">
        <OneBall size={1} />
      </Circle>

      <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        Some Thread
      </SizableText>
    </ThreadButtonFrame>
  )
}

const MessageArea = () => {
  return (
    <YStack btw={1} bc="$color4" p="$2">
      <Input />
    </YStack>
  )
}

const chats = [
  ...new Array(50).fill({
    name: 'natew',
    contents: 'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
    avatar: (
      <Circle size={32} bg="$color9" mt={4}>
        <OneBall size={1.3} />
      </Circle>
    ),
  }),

  {
    name: 'test',
    contents:
      'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
    avatar: <Circle size={32} bg="red" mt={4}></Circle>,
  },
]
const MainChatList = () => {
  return (
    <YStack ov="hidden" f={1}>
      <ScrollView>
        <YStack p="$4" pt="$10">
          <CollapsedChats>
            <Chat
              {...{
                name: 'test',
                contents:
                  'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
                avatar: <Circle size={32} bg="red" mt={4}></Circle>,
              }}
            />

            <Chat
              {...{
                name: 'natew',
                contents:
                  'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
                avatar: (
                  <Circle size={32} bg="$color9" mt={4}>
                    <OneBall size={1.3} />
                  </Circle>
                ),
              }}
            />
          </CollapsedChats>

          <ThreadRow title="Android bug" description="JDK version 9.0 bug building app container" />

          <DateSeparator />

          <CollapsedChats>
            <Chat
              {...{
                name: 'test',
                contents:
                  'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
                avatar: <Circle size={32} bg="red" mt={4}></Circle>,
              }}
            />

            <Chat
              {...{
                name: 'natew',
                contents:
                  'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
                avatar: (
                  <Circle size={32} bg="$color9" mt={4}>
                    <OneBall size={1.3} />
                  </Circle>
                ),
              }}
            />
          </CollapsedChats>

          <ThreadRow
            title="Supertokens Support"
            description="Requesting official support for supertokens."
          />

          <CollapsedChats>
            <Chat
              {...{
                name: 'test',
                contents:
                  'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
                avatar: <Circle size={32} bg="red" mt={4}></Circle>,
              }}
            />

            <Chat
              {...{
                name: 'natew',
                contents:
                  'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
                avatar: (
                  <Circle size={32} bg="$color9" mt={4}>
                    <OneBall size={1.3} />
                  </Circle>
                ),
              }}
            />
          </CollapsedChats>

          <DateSeparator />

          <ThreadRow title="Some Thread" />

          <ThreadRow title="Some Thread" />

          {/* {chats.map((chat, i) => {
            return <Chat key={i} {...chat} />
          })} */}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const DateSeparator = () => {
  return (
    <XStack gap="$6" ai="center" jc="center">
      <Separator bc="rgba(0,0,0,0.1)" />
      <SizableText>Dec 2nd, 2024</SizableText>
      <Separator bc="rgba(0,0,0,0.1)" />
    </XStack>
  )
}

const ThreadRow = (props: { title: string; description?: string }) => {
  return (
    <ThreadButtonFrame size="large">
      <YStack>
        <XStack ai="center" jc="center" gap="$2">
          <Circle size={32} bg="$color9">
            <OneBall size={1} />
          </Circle>

          <SizableText size="$5" userSelect="none" cur="default" f={1} ov="hidden">
            {props.title}
          </SizableText>
        </XStack>

        {!!props.description && <SizableText o={0.7}>{props.description}</SizableText>}
      </YStack>
    </ThreadButtonFrame>
  )
}

const CollapsedChats = (props) => {
  const [collapsed, setCollapsed] = useState(true)

  if (collapsed) {
    return (
      <YStack
        p="$3"
        br="$4"
        gap="$2"
        hoverStyle={{
          bg: '$color3',
        }}
        onPress={() => {
          setCollapsed(!collapsed)
        }}
      >
        <XStack ai="center" gap="$6">
          {/* <Separator bc="rgba(0,0,0,0.1)" /> */}
          <SizableText style={{ fontWeight: '500' }} size="$4">
            25 messages
          </SizableText>
          {/* <Separator bc="rgba(0,0,0,0.1)" /> */}
        </XStack>

        <XStack>
          <XStack ai="center" gap="$2">
            <Circle size={16} bg="$color9" mt={4}>
              <OneBall size={0.7} />
            </Circle>
            <SizableText size="$3">natew</SizableText>
          </XStack>

          <SizableText size="$3">
            {' '}
            and 3 others talked about supertokens, auth, and the next release.
          </SizableText>
        </XStack>
      </YStack>
    )
  }

  return (
    <YStack
      onPress={() => {
        setCollapsed(!collapsed)
      }}
    >
      {props.children}
    </YStack>
  )
}

const Chat = ({ name, avatar, contents }: { name: string; avatar: any; contents: string }) => {
  return (
    <XStack f={1} gap="$3" p="$2">
      {avatar}
      <YStack f={1} gap="$1">
        <SizableText mb={-4} fow="bold">
          {name}
        </SizableText>

        <SizableText f={1} ov="hidden">
          {contents}
        </SizableText>
      </YStack>
    </XStack>
  )
}

const Sidebar = () => {
  return (
    <YStack brw={1} bc="$color4" ov="hidden" f={1} maw={250} miw={250} gap="$4" py="$3" px="$3">
      <XStack gap="$2">
        <Circle size={42} bg="$color9" outlineColor="#fff" outlineWidth={2} outlineStyle="solid">
          <OneBall size={1.5} />
        </Circle>
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
        <Circle size={42} bg="$color9" />
      </XStack>

      <YStack gap="$1">
        <RoomItem active name="General" />
        <RoomItem name="Help" />
        <RoomItem name="Proposals" />
      </YStack>

      <YStack gap="$1">
        <RoomItem name={<SubTitle>Recently</SubTitle>} />
        <RoomItem active name="🧵 Some Thread" />
      </YStack>

      <YStack btw={1} bc="$color4" p="$3" pos="absolute" b={0} l={0} r={0}>
        <RoomItem name={<SubTitle>Recent Chats</SubTitle>} />
        <Spacer size="$2" />

        <RoomItem name="Nate Wienert" />
        <RoomItem name="Lorem ipsum" />
        <RoomItem name="Huynh Nhi Cam" />
        <RoomItem name="Someone Else" />
        <RoomItem name="Joey" />
        <RoomItem name="Mia" />
      </YStack>
    </YStack>
  )
}

const SubTitle = (props) => {
  return (
    <H3 o={0.2} size="$2">
      {props.children}
    </H3>
  )
}

const RoomItem = (props: { name: any; active?: boolean }) => {
  return (
    <XStack
      px="$2"
      br="$4"
      py="$1"
      userSelect="none"
      cur="default"
      hoverStyle={{
        bg: '$color2',
      }}
      {...(props.active && {
        bg: '$color3',
      })}
    >
      <SizableText cur="default">{props.name}</SizableText>
    </XStack>
  )
}
