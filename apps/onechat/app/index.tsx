import { MessageCircle, UserCircle } from '@tamagui/lucide-icons'
import { memo, useRef, useState } from 'react'
import {
  Button,
  Circle,
  Dialog,
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
import type { Message, User } from '~/config/zero/schema'
import { authClient } from '~/features/auth/authClient'
import { githubSignIn } from '~/features/auth/githubSignIn'
import { useAuth } from '~/features/auth/useAuth'
import { useUserState } from '~/features/auth/useUserState'
import { OneBall } from '~/features/brand/Logo'
import { isTauri } from '~/features/tauri/constants'
import { randomID } from '~/features/zero/randomID'
import { useCurrentChannel, useCurrentMessages, useCurrentServer } from '~/features/zero/useServer'
import { mutate } from '~/features/zero/zero'
import { Avatar } from '~/interface/Avatar'
import { ListItem } from '~/interface/ListItem'
import { Sidebar } from '~/interface/Sidebar'
import { ThemeToggleListItem } from '~/interface/ThemeToggleListItem'
import { TopBar } from '~/interface/TopBar'

const hiddenPanelWidth = 300

export default function HomePage() {
  const [userState] = useUserState()

  return (
    <YStack h={0} f={1} x={userState?.showSidePanel ? -hiddenPanelWidth : 0} animation="quicker">
      <TopBar />
      <Dialogs />

      <XStack h={0} ai="stretch" f={1}>
        <Sidebar />
        <Main />
      </XStack>

      <RightSideHiddenPanel />
    </YStack>
  )
}

const RightSideHiddenPanel = () => {
  const [userState] = useUserState()

  if (userState?.showSidePanel === 'settings') {
    return <RightSideSettings />
  }

  return <RightSideAccount />
}

const RightSideSettings = () => {
  return (
    <YStack
      h="100%"
      data-tauri-drag-region
      pos="absolute"
      t={0}
      r={-hiddenPanelWidth}
      w={hiddenPanelWidth}
      p="$4"
      gap="$4"
    >
      <H3>Settings</H3>

      <ThemeToggleListItem />
    </YStack>
  )
}

const RightSideAccount = () => {
  return (
    <YStack
      h="100%"
      data-tauri-drag-region
      pos="absolute"
      t={0}
      r={-hiddenPanelWidth}
      w={hiddenPanelWidth}
      p="$4"
      gap="$4"
    >
      <H3>Account</H3>
      <ListItem
        onPress={() => {
          authClient.signOut()
        }}
      >
        Logout
      </ListItem>
    </YStack>
  )
}

const Dialogs = () => {
  return <>{/* <FinishAuthInAppDialog /> */}</>
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

const Main = memo(() => {
  return (
    <YStack f={1} shadowColor="$shadowColor" shadowRadius={30} btlr="$3" ov="hidden">
      <RecentThreads />
      <YStack f={1} bg="$background05">
        <MainChatList />
        <MessageArea />
      </YStack>
    </YStack>
  )
})

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
      <Circle size={26} bg="$color9">
        <OneBall size={0.8} />
      </Circle>

      <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        Some Thread
      </SizableText>
    </ThreadButtonFrame>
  )
}

const MessageArea = () => {
  const inputRef = useRef<Input>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
  const { user } = useAuth()

  return (
    <YStack btw={1} bc="$color4" p="$2">
      <Input
        ref={inputRef}
        onSubmitEditing={(e) => {
          inputRef.current?.clear()
          mutate.message.insert({
            id: randomID(),
            channelId: channel.id,
            content: e.nativeEvent.text,
            createdAt: new Date().getTime(),
            deleted: false,
            senderId: user!.id,
            serverId: server.id,
          })
        }}
      />
    </YStack>
  )
}

const MainChatList = () => {
  const messages = useCurrentMessages() || []
  const { user } = useAuth()

  return (
    <YStack ov="hidden" f={1}>
      <ScrollView>
        <YStack p="$4" pt="$10">
          {user
            ? messages.map((message) => {
                return <MessageItem key={message.id} message={message} user={user as any} />
              })
            : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

// <ScrollView>
//         <YStack p="$4" pt="$10">
//           <CollapsedChats>
//             <Chat
//               {...{
//                 name: 'test',
//                 contents:
//                   'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
//                 avatar: <Circle size={32} bg="red" mt={4}></Circle>,
//               }}
//             />

//             <Chat
//               {...{
//                 name: 'natew',
//                 contents:
//                   'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
//                 avatar: (
//                   <Circle size={32} bg="$color9" mt={4}>
//                     <OneBall size={1.3} />
//                   </Circle>
//                 ),
//               }}
//             />
//           </CollapsedChats>

//           <ThreadRow title="Android bug" description="JDK version 9.0 bug building app container" />

//           <DateSeparator />

//           <CollapsedChats>
//             <Chat
//               {...{
//                 name: 'test',
//                 contents:
//                   'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
//                 avatar: <Circle size={32} bg="red" mt={4}></Circle>,
//               }}
//             />

//             <Chat
//               {...{
//                 name: 'natew',
//                 contents:
//                   'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
//                 avatar: (
//                   <Circle size={32} bg="$color9" mt={4}>
//                     <OneBall size={1.3} />
//                   </Circle>
//                 ),
//               }}
//             />
//           </CollapsedChats>

//           <ThreadRow
//             title="Supertokens Support"
//             description="Requesting official support for supertokens."
//           />

//           <CollapsedChats>
//             <Chat
//               {...{
//                 name: 'test',
//                 contents:
//                   'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa. Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
//                 avatar: <Circle size={32} bg="red" mt={4}></Circle>,
//               }}
//             />

//             <Chat
//               {...{
//                 name: 'natew',
//                 contents:
//                   'Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.',
//                 avatar: (
//                   <Circle size={32} bg="$color9" mt={4}>
//                     <OneBall size={1.3} />
//                   </Circle>
//                 ),
//               }}
//             />
//           </CollapsedChats>

//           <DateSeparator />

//           <ThreadRow title="Some Thread" />

//           <ThreadRow title="Some Thread" />

//           {/* {chats.map((chat, i) => {
//             return <Chat key={i} {...chat} />
//           })} */}
//         </YStack>
//       </ScrollView>

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

const MessageItem = ({ message, user }: { message: Message; user: User }) => {
  return (
    <XStack f={1} gap="$3" p="$2">
      <Avatar image={user.image} />
      <YStack f={1} gap="$1">
        <SizableText mb={-4} fow="bold">
          {user.username || user.name}
        </SizableText>

        <SizableText f={1} ov="hidden">
          {message.content}
        </SizableText>
      </YStack>
    </XStack>
  )
}
