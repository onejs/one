import { Plus } from '@tamagui/lucide-icons'
import { memo, useState } from 'react'
import { Circle, H3, ScrollView, SizableText, Spacer, styled, XStack, YStack } from 'tamagui'
import { useAuth } from '~/features/auth/useAuth'
import { updateUserState, useUserState } from '~/features/auth/useUserState'
import { OneBall } from '~/features/brand/Logo'
import { randomID } from '~/features/zero/randomID'
import { useServer, useServerChannels, useServerQuery } from '~/features/zero/useServer'
import { mutate, useQuery, zero } from '~/features/zero/zero'
import { ListItem } from './ListItem'
import { Menu } from '@tauri-apps/api/menu'
import { Channel } from '~/config/zero/schema'

export const Sidebar = memo(() => {
  return (
    <YStack ov="hidden" f={1} maw={250} miw={250} gap="$4">
      <SidebarServersRow />

      <SidebarServerRoomsList />

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
})

const SidebarServerRoomsList = () => {
  const server = useServer()
  const channels = useServerChannels() || []

  return (
    <YStack>
      {channels.map((channel) => {
        return <ChannelListItem key={channel.id} channel={channel} />
      })}

      <ListItem
        onPress={() => {
          if (!server) {
            alert('no server')
            return
          }

          mutate.channel.insert({
            id: randomID(),
            createdAt: new Date().getTime(),
            description: '',
            name: 'Hello',
            private: false,
            serverId: server.id,
          })
        }}
      >
        Create Channel
      </ListItem>
    </YStack>
  )
}

const ChannelListItem = ({ channel }: { channel: Channel }) => {
  const [editing, setEditing] = useState(false)

  return (
    <div
      key={channel.id}
      onDoubleClick={() => {
        setEditing(!editing)
      }}
      onContextMenu={async (e) => {
        e.preventDefault()
        const menu = Menu.new({
          items: [
            {
              id: 'ctx_option1',
              text: 'Delete',
              action() {
                mutate.channel.delete({
                  id: channel.id,
                })
              },
            },
          ],
        })

        const menuInstance = await menu
        menuInstance.popup()
      }}
    >
      <ListItem
        editing={editing}
        onEditComplete={(next) => {
          setEditing(false)
          mutate.channel.update({
            ...channel,
            name: next,
          })
        }}
      >
        {channel.name}
      </ListItem>
    </div>
  )
}

const SidebarServersRow = () => {
  const servers = useQuery((q) => q.server.orderBy('createdAt', 'desc'))
  const userState = useUserState()
  const { user } = useAuth()

  return (
    <XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <SidebarIndent fd="row" gap="$2" py="$3">
          <CircleIconFrame size={42} bg="$color9">
            <OneBall size={1.5} />
          </CircleIconFrame>

          {servers.map((server) => {
            return (
              <CircleIconFrame
                onPress={() => {
                  updateUserState({
                    activeServer: server.id,
                  })
                }}
                key={server.id}
                size={42}
                bg={server.icon}
                active={userState?.activeServer === server.id}
              />
            )
          })}

          <Circle
            onPress={() => {
              if (!user) {
                alert('not signed in')
                return
              }

              mutate.server.insert({
                id: randomID(),
                createdAt: new Date().getTime(),
                description: '',
                icon: Math.random() > 0.5 ? 'red' : 'pink',
                name: 'Lorem',
                ownerId: user.id,
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
  )
}

const CircleIconFrame = styled(Circle, {
  variants: {
    active: {
      true: {
        outlineColor: '#fff',
        outlineWidth: 2,
        outlineStyle: 'solid',
      },
    },
  } as const,
})

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
