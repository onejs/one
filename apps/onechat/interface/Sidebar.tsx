import { Menu } from '@tauri-apps/api/menu'
import { forwardRef, memo, useEffect, useState } from 'react'
import { H3, SizableText, Spacer, XStack, type XStackProps, YStack } from 'tamagui'
import type { Channel } from '~/config/zero/schema'
import { updateUserState, useUserState } from '~/features/auth/useUserState'
import { randomID } from '~/features/zero/randomID'
import { useCurrentServer, useServerChannels, useServersQuery } from '~/features/zero/useServer'
import { mutate } from '~/features/zero/zero'
import { ListItem } from './ListItem'

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
import { SidebarServersRow } from './SidebarServersRow'

const SidebarServerChannelsList = () => {
  const server = useCurrentServer()
  const channels = useServerChannels() || []
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        distance: {
          y: 8,
        },
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const [{ activeServer, activeChannels }] = useUserState()

  // ensure theres always a selected channel
  useEffect(() => {
    if (!server) return
    if (!activeServer) return
    if (!channels[0]) return
    if (activeChannels[server.id]) return
    updateUserState({
      activeChannels: {
        ...activeChannels,
        [server.id]: channels[0].id,
      },
    })
  }, [channels, server, activeServer])

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
            <DragOverlay
              style={{
                zIndex: 1000,
              }}
            >
              {dragging ? <DraggedChannel channel={dragging} /> : null}
            </DragOverlay>
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
    const [userState, derivedUserState] = useUserState()

    return (
      <ListItem
        ref={ref}
        editing={editing}
        active={derivedUserState?.activeChannel === channel.id}
        onPress={() => {
          updateUserState({
            activeChannels: {
              ...userState.activeChannels,
              [userState.activeServer!]: channel.id,
            },
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
