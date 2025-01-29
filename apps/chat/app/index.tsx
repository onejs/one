import { useEffect, useState } from 'react'
import { Paragraph, View, XStack, YStack } from 'tamagui'
import { AnimationDriver } from '~/interface/animations/AnimationDriver'
import { Main } from '~/interface/main/Main'
import { MainMessageInput } from '~/interface/main/MainMessageInput'
import { AccountSettingsPane } from '~/interface/settings/AccountSettingsPane'
import { ServerSettingsPane } from '~/interface/settings/ServerSettingsPane'
import { Sidebar } from '~/interface/sidebar/Sidebar'
import { TopBar } from '~/interface/TopBar'
import { isTauri } from '../src/tauri/constants'
import { useAuth } from '../src/better-auth/authClient'

export default function HomePage() {
  return (
    <AppFrame>
      <TopBar />

      <XStack position="relative" items="stretch" flex={1} overflow="hidden">
        <Sidebar />
        <Main />
      </XStack>

      <MainMessageInput />

      <ServerSettingsPane />
      <AccountSettingsPane />
    </AppFrame>
  )
}

const AppFrame = ({ children }: { children: any }) => {
  const { loggedIn } = useAuth()
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    if (!loggedIn) {
      setShowIntro(true)
    }
  }, [loggedIn])

  return (
    <>
      <View
        position="absolute"
        inset={0}
        background="url(/bg.webp) top center"
        backgroundSize="contain"
      />

      {/* was css */}
      <AnimationDriver name="spring">
        <XStack
          animation="medium"
          y={showIntro ? 0 : -20}
          opacity={showIntro ? 1 : 0}
          position="absolute"
          t={0}
          l={0}
          r={0}
          height={100}
          items="center"
          justify="center"
          px="$8"
          gap="$6"
        >
          <View asChild maxW={250}>
            <img src="/words.svg" />
          </View>

          <View
            bg="rgba(0,0,0,0.7)"
            p={10}
            position="absolute"
            t={0}
            b={0}
            r={28}
            maxW={400}
            rounded={4}
            self="center"
          >
            <Paragraph
              color="white"
              textShadowColor="#000"
              textShadowOffset={{ height: 1, width: 0 }}
              fontFamily="$mono"
              lineHeight={18}
            >
              Hello. This is start.chat. We're building a new type of chat platform.
            </Paragraph>
          </View>
        </XStack>
        <div style={{ flex: 1, perspective: 1000 }}>
          <YStack
            animation="bouncy"
            rounded={0}
            flex={1}
            overflow="hidden"
            y={0}
            scale={1}
            {...(showIntro && {
              y: 50,
              rotateX: '8deg',
              scale: 0.95,
              shadowRadius: '$6',
              shadowOffset: { width: 0, height: 6 },
              shadowColor: '$shadow6',
              rounded: '$7',
            })}
          >
            <AnimationDriver name="spring">{children}</AnimationDriver>

            <YStack
              fullscreen
              z={-1}
              {...(!isTauri && {
                bg: '$color1',
              })}
            />

            {showIntro && (
              <View
                animation="medium"
                cursor="pointer"
                onPress={() => {
                  setShowIntro(false)
                }}
                z={Number.MAX_SAFE_INTEGER}
                position="absolute"
                inset={0}
                bg="$background0"
                hoverStyle={{
                  bg: '$shadow3',
                }}
              />
            )}
          </YStack>
        </div>
      </AnimationDriver>
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

// const DateSeparator = () => {
//   return (
//     <XStack gap="$6" items="center" justify="center">
//       <Separator borderColor="rgba(0,0,0,0.1)" />
//       <SizableText>Dec 2nd, 2024</SizableText>
//       <Separator borderColor="rgba(0,0,0,0.1)" />
//     </XStack>
//   )
// }

// const ThreadRow = (props: { title: string; description?: string }) => {
//   return (
//     <ThreadButtonFrame size="large">
//       <YStack>
//         <XStack items="center" justify="center" gap="$2">
//           <Circle size={32} bg="$color9">
//             <OneBall size={1} />
//           </Circle>

//           <SizableText size="$5" select="none" cursor="default" flex={1} overflow="hidden">
//             {props.title}
//           </SizableText>
//         </XStack>

//         {!!props.description && <SizableText opacity={0.7}>{props.description}</SizableText>}
//       </YStack>
//     </ThreadButtonFrame>
//   )
// }

// const CollapsedChats = (props) => {
//   const [collapsed, setCollapsed] = useState(true)

//   if (collapsed) {
//     return (
//       <YStack
//         p="$3"
//         rounded="$4"
//         gap="$2"
//         hoverStyle={{
//           bg: '$color3',
//         }}
//         onPress={() => {
//           setCollapsed(!collapsed)
//         }}
//       >
//         <XStack items="center" gap="$6">
//           {/* <Separator borderColor="rgba(0,0,0,0.1)" /> */}
//           <SizableText style={{ fontWeight: '500' }} size="$4">
//             25 messages
//           </SizableText>
//           {/* <Separator borderColor="rgba(0,0,0,0.1)" /> */}
//         </XStack>

//         <XStack>
//           <XStack items="center" gap="$2">
//             <Circle size={16} bg="$color9" mt={4}>
//               <OneBall size={0.7} />
//             </Circle>
//             <SizableText size="$3">natew</SizableText>
//           </XStack>

//           <SizableText size="$3">
//             {' '}
//             and 3 others talked about supertokens, auth, and the next release.
//           </SizableText>
//         </XStack>
//       </YStack>
//     )
//   }

//   return (
//     <YStack
//       onPress={() => {
//         setCollapsed(!collapsed)
//       }}
//     >
//       {props.children}
//     </YStack>
//   )
// }
