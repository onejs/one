import { Search } from '@tamagui/lucide-icons'
import { Circle, H3, Input, SizableText, Spacer, XStack, YStack } from 'tamagui'
import { OneBall, OneLogo } from '~/features/brand/Logo'

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
      <YStack pos="absolute" t={0} l={90} b={0} ai="center" jc="center">
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
    <YStack p="$4">
      <Chat />
      <Chat />
      <Chat />
      <Chat />
      <Chat />
      <Chat />
      <Chat />
    </YStack>
  )
}

const Chat = () => {
  return (
    <XStack gap="$2" p="$2">
      <Circle size={36} bg="$color9">
        <OneBall size={1.3} />
      </Circle>
      <YStack gap="$1">
        <SizableText mb={-4} fow="bold">
          natew
        </SizableText>

        <SizableText>
          Irure sunt eu do quis voluptate do nulla deserunt proident laborum culpa.
        </SizableText>
      </YStack>
    </XStack>
  )
}

const Sidebar = () => {
  return (
    <YStack ov="hidden" f={1} maw="30%" gap="$4" py="$3" px="$3">
      <XStack gap="$2">
        <Circle size={36} bg="$color9" outlineColor="#fff" outlineWidth={2} outlineStyle="solid">
          <OneBall size={1.3} />
        </Circle>
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
        <Circle size={36} bg="$color9" />
      </XStack>

      <YStack gap="$1">
        <RoomItem active name="General" />
        <RoomItem name="Help" />
        <RoomItem name="Proposals" />
      </YStack>

      <YStack btw={1} bc="$color4" p="$3" pos="absolute" b={0} l={0} r={0}>
        <RoomItem name={<SubTitle>Recently</SubTitle>} />
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
