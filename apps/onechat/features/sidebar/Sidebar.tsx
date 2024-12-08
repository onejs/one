import { Plus } from '@tamagui/lucide-icons'
import { Circle, H3, ScrollView, SizableText, Spacer, styled, XStack, YStack } from 'tamagui'
import { useUserState } from '~/features/auth/useUserState'
import { OneBall } from '~/features/brand/Logo'
import { randomID } from '~/features/zero/randomID'
import { mutate, useQuery } from '~/features/zero/zero'

export const Sidebar = () => {
  const servers = useQuery((q) => q.server.orderBy('createdAt', 'desc'))
  const users = useQuery((q) => q.user.orderBy('createdAt', 'desc'))
  const state = useUserState()

  return (
    <YStack ov="hidden" f={1} maw={250} miw={250} gap="$4">
      <XStack>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SidebarIndent fd="row" gap="$2" py="$3">
            <Circle
              size={42}
              bg="$color9"
              outlineColor="#fff"
              outlineWidth={2}
              outlineStyle="solid"
            >
              <OneBall size={1.5} />
            </Circle>
            {servers.map((server) => {
              return <Circle key={server.id} size={42} bg={server.icon} />
            })}
            <Circle
              onPress={() => {
                mutate.server.insert({
                  id: randomID(),
                  createdAt: new Date().getTime(),
                  description: '',
                  icon: Math.random() > 0.5 ? 'red' : 'pink',
                  name: 'Lorem',
                  ownerId: '',
                })
              }}
              size={42}
              bg="$color9"
            >
              <Plus />
            </Circle>
          </SidebarIndent>
        </ScrollView>
      </XStack>

      <>
        <YStack>
          <RoomItem active name="General" />
          <RoomItem name="Help" />
          <RoomItem name="Proposals" />
        </YStack>
      </>

      <>
        <YStack>
          <SubTitle>Recently</SubTitle>
          <RoomItem active name="🧵 Some Thread" />
        </YStack>
      </>

      <YStack btw={1} bc="$background025" py="$2" pos="absolute" b={0} l={0} r={0}>
        <SubTitle>Recent Chats</SubTitle>
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

const SidebarIndent = styled(YStack, {
  px: '$3',
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
