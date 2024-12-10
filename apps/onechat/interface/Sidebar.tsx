import { Plus } from '@tamagui/lucide-icons'
import { Menu } from '@tauri-apps/api/menu'
import { forwardRef, memo, useState } from 'react'
import {
  Circle,
  H3,
  ScrollView,
  SizableText,
  Spacer,
  styled,
  XStack,
  XStackProps,
  YStack,
} from 'tamagui'
import { Channel } from '~/config/zero/schema'
import { useAuth } from '~/features/auth/useAuth'
import { updateUserState, useUserState } from '~/features/auth/useUserState'
import { OneBall } from '~/features/brand/Logo'
import { randomID } from '~/features/zero/randomID'
import { useCurrentServer, useServerChannels } from '~/features/zero/useServer'
import { mutate, useQuery } from '~/features/zero/zero'
import { ListItem } from './ListItem'

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

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

const SidebarServerRoomsList = () => {
  const server = useCurrentServer()
  const channels = useServerChannels() || []
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event) {
    setDragging(null)

    const { active, over } = event

    if (active.id !== over.id) {
      // setItems((items) => {
      //   const oldIndex = items.indexOf(active.id);
      //   const newIndex = items.indexOf(over.id);
      //   return arrayMove(items, oldIndex, newIndex);
      // });
    }
  }

  const [dragging, setDragging] = useState(null)

  function handleDragStart(event) {
    const { active } = event
    setDragging(active)
  }

  return (
    <YStack>
      <YStack pos="relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={channels} strategy={verticalListSortingStrategy}>
            {channels.map((channel) => {
              return <ChannelListItemSortable key={channel.id} channel={channel} />
            })}
            <DragOverlay>{dragging ? <DraggedChannel channel={dragging} /> : null}</DragOverlay>
          </SortableContext>
        </DndContext>
      </YStack>

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

const DraggedChannel = ({ channel }: { channel: Channel }) => {
  return <ChannelListItem channel={channel} />
}

const ChannelListItemSortable = ({ channel }: { channel: Channel }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: channel.id,
  })

  return (
    <ChannelListItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      {...transform}
      channel={channel}
      transition={transition}
      // @ts-expect-error
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
      {channel.name}
    </ChannelListItem>
  )
}

const ChannelListItem = forwardRef(
  ({ channel, ...rest }: XStackProps & { channel: Channel }, ref: any) => {
    const [editing, setEditing] = useState(false)
    const userState = useUserState()

    return (
      <ListItem
        ref={ref}
        editing={editing}
        active={userState?.activeChannel === channel.id}
        onPress={() => {
          updateUserState({
            activeChannel: channel.id,
          })
        }}
        onEditCancel={() => {
          setEditing(false)
        }}
        onEditComplete={(next) => {
          setEditing(false)
          mutate.channel.update({
            ...channel,
            name: next,
          })
        }}
        // @ts-expect-error
        onDoubleClick={() => {
          setEditing(!editing)
        }}
        {...rest}
      >
        {channel.name}
      </ListItem>
    )
  }
)

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
