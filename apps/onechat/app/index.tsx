import { MessageCircle, Search, Settings2, UserCircle } from '@tamagui/lucide-icons'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect, useState } from 'react'
import {
  Button,
  Circle,
  Dialog,
  H1,
  H3,
  Input,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  styled,
  XStack,
  YStack,
} from 'tamagui'
import { authClient, setAuthToken } from '~/features/auth/authClient'
import { useAuth } from '~/features/auth/useAuth'
import { OneBall } from '~/features/brand/Logo'
import { Sidebar } from '~/features/sidebar/Sidebar'
import { isTauri } from '~/features/tauri/constants'
import { githubSignIn } from '~/features/auth/githubSignIn'

export default function HomePage() {
  useEffect(() => {
    try {
      onOpenUrl(([urlString]) => {
        const url = new URL(urlString)

        switch (url.host) {
          case 'finish-auth': {
            const token = url.searchParams.get('token')

            if (token) {
              setAuthToken(token)
            }

            break
          }
        }
      })
    } catch (err) {
      console.error(err)
    }
  }, [])

  return (
    <YStack h={0} f={1}>
      <Head />
      <Dialogs />

      <XStack h={0} ai="stretch" f={1}>
        <Sidebar />
        <Main />
      </XStack>
    </YStack>
  )
}

const Dialogs = () => {
  return (
    <>
      <FinishAuthInAppDialog />
    </>
  )
}

const FinishAuthInAppDialog = () => {
  const auth = useAuth()
  const token = auth.session?.token

  if (isTauri) {
    return null
  }

  return (
    <>
      <Dialog modal open={!!token}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            bg="$background075"
          />

          <Dialog.Content
            bordered
            elevate
            bg="$color2"
            key="content"
            animation={[
              'medium',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -10, opacity: 0 }}
            exitStyle={{ x: 0, y: 10, opacity: 0 }}
            gap="$4"
          >
            <H3>Finish</H3>
            <Paragraph>To authenticate in the native app:</Paragraph>

            <a href={`one-chat://finish-auth?token=${token}`}>
              <Button>Authenticate in Native App</Button>
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )
}

const Head = () => {
  const { user } = useAuth()

  authClient.$fetch('/jwks').then((x) => console.log(x.data))

  return (
    <XStack
      data-tauri-drag-region
      br="$4"
      mx={2}
      ai="center"
      jc="space-between"
      y={2}
      h={36}
      pl={80}
      pr={4}
      mb={4}
    >
      <H3 pe="none" m={0} o={0.5} size="$2">
        One - #general
      </H3>

      <XStack ai="center" gap="$1">
        <XStack ai="center" gap="$2" mr="$4">
          <Search size={16} o={0.5} />
          <Input w={250} placeholder="" size="$2" bw={0} />
        </XStack>

        <ThreadButtonFrame>
          <Settings2 o={0.5} size={20} />
        </ThreadButtonFrame>

        <UserButton />
      </XStack>
    </XStack>
  )
}

const UserButton = () => {
  return (
    <>
      <a
        target="_blank"
        href={window.location.origin + '/login-github'}
        rel="noreferrer"
        onClick={(e) => {
          if (isTauri) return
          e.preventDefault()
          githubSignIn()
        }}
      >
        <ThreadButtonFrame>
          <UserCircle size={20} o={0.5} />
        </ThreadButtonFrame>
      </a>
    </>
  )
}

// <a target="_blank" href={window.location.origin + '/login-github'} rel="noreferrer">
// <Button size="$2">Github</Button>
// </a>

// {user?.image && <img src={user.image} style={{ width: 32, height: 32 }} />}

// {user && (
// <Button
//   onPress={() => {
//     authClient.signOut()
//   }}
// >
//   Sign out
// </Button>
// )}

const Main = () => {
  return (
    <YStack f={1} shadowColor="$shadowColor" shadowRadius={30} btlr="$3" ov="hidden">
      <RecentThreads />
      <YStack f={1} bg="$background05">
        <MainChatList />
        <MessageArea />
      </YStack>
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
        {/* <ThreadButtonFrame active>
          <Book size={18} />
        </ThreadButtonFrame> */}
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
    <ThreadButtonFrame active>
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
