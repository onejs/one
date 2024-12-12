import { memo } from 'react'
import { H3, SizableText, Spacer, XStack, YStack } from 'tamagui'
import { SidebarServersRow } from './SidebarServersRow'
import { SidebarServerChannelsList } from './SidebarServerChannelsList'

export const Sidebar = memo(() => {
  return (
    <YStack ov="hidden" f={1} maw={250} miw={250} gap="$4">
      <SidebarServersRow />

      <SidebarServerChannelsList />

      {/* <>
        <YStack>
          <SubTitle>Recently</SubTitle>
          <RoomItem active name="🧵 Some Thread" />
        </YStack>
      </> */}

      <YStack btw={1} bc="$background025" py="$2" pos="absolute" b={0} l={0} r={0}>
        <SubTitle>Friends</SubTitle>
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
})

const SubTitle = (props) => {
  return (
    <H3 cur="default" userSelect="none" px="$2.5" py="$1.5" o={0.4} size="$2">
      {props.children}
    </H3>
  )
}

const RoomItem = (props: { name: any; active?: boolean }) => {
  return (
    <XStack
      px="$2.5"
      py="$1.5"
      userSelect="none"
      cur="default"
      hoverStyle={{
        bg: '$background025',
      }}
      {...(props.active && {
        bg: '$background05',
        hoverStyle: {
          bg: '$background05',
        },
      })}
    >
      <SizableText fow="500" cur="default">
        {props.name}
      </SizableText>
    </XStack>
  )
}
