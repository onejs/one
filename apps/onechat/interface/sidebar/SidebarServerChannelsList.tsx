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
import { Menu } from '@tauri-apps/api/menu'
import { forwardRef, useEffect, useState } from 'react'
import { type XStackProps, YStack } from 'tamagui'
import type { Channel } from '~/config/zero/schema'
import { updateUserState, useUserState } from '~/features/state/queries/useUserState'
import { randomID } from '~/features/state/randomID'
import { useCurrentServer, useServerChannels } from '~/features/state/queries/useServer'
import { mutate } from '~/features/state/zero'
import { ListItem } from '../ListItem'
import { useHotkeys } from 'react-hotkeys-hook'
import { Lock, Plus } from '@tamagui/lucide-icons'

export const SidebarServerChannelsList = () => {
  const server = useCurrentServer()
  const channels = useServerChannels()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        distance: {
          y: 8,
        },
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const [{ activeServer, activeChannels }, { activeChannel }] = useUserState()

  useChannelsHotkeys()

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

  const [showTempChannel, setShowTempChannel] = useState(false)

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

        {showTempChannel && (
          <ChannelListItem
            inserting
            onInsert={(name) => {
              if (!server) {
                alert('no server')
                return
              }
              const id = randomID()
              mutate.channel.insert({
                id,
                createdAt: new Date().getTime(),
                description: '',
                name,
                private: false,
                serverId: server.id,
              })
              updateUserState({
                activeChannels: {
                  ...activeChannels,
                  [activeServer!]: id,
                },
              })
              setShowTempChannel(false)
            }}
            onInsertCancel={() => {
              setShowTempChannel(false)
            }}
          />
        )}
      </YStack>

      <ListItem
        icon={Plus}
        iconAfter
        onPress={() => {
          setShowTempChannel(true)
        }}
      >
        New Channel
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
  (
    {
      channel,
      inserting,
      onInsert,
      onInsertCancel,
      ...rest
    }: XStackProps & {
      channel?: Channel
      inserting?: boolean
      onInsert?: (name: string) => void
      onInsertCancel?: () => void
    },
    ref: any
  ) => {
    const [editing, setEditing] = useState(false)
    const [userState, derivedUserState] = useUserState()

    return (
      <ListItem
        ref={ref}
        editing={editing || inserting}
        active={derivedUserState?.activeChannel === channel?.id}
        onPress={() => {
          if (inserting || !channel) {
            return
          }
          updateUserState({
            activeChannels: {
              ...userState.activeChannels,
              [userState.activeServer!]: channel.id,
            },
          })
        }}
        onEditCancel={() => {
          if (inserting) {
            onInsertCancel?.()
          } else {
            setEditing(false)
          }
        }}
        onEditComplete={(next) => {
          if (inserting || !channel) {
            onInsert?.(next)
          } else {
            setEditing(false)
            mutate.channel.update({
              ...channel,
              name: next,
            })
          }
        }}
        // @ts-expect-error
        onDoubleClick={() => {
          if (inserting || !channel) {
            return
          }
          setEditing(!editing)
        }}
        {...rest}
      >
        {channel?.name}

        {channel?.private && (
          <YStack pos="absolute" t={0} r={0} b={0} ai="center" jc="center" o={0.5} px="$3">
            <Lock size={16} />
          </YStack>
        )}
      </ListItem>
    )
  }
)

const useChannelsHotkeys = () => {
  const channels = useServerChannels()
  const [{ activeServer, activeChannels }, { activeChannel }] = useUserState()

  useHotkeys('meta+]', () => {
    if (!activeServer) return

    const index = channels.findIndex((x) => x.id === activeChannel)
    const next = index + 1

    if (channels.length > next) {
      updateUserState({
        activeChannels: {
          ...activeChannels,
          [activeServer]: channels[index + 1].id,
        },
      })
    }
  })

  useHotkeys('meta+[', () => {
    if (!activeServer) return

    const index = channels.findIndex((x) => x.id === activeChannel)

    if (index > 0) {
      updateUserState({
        activeChannels: {
          ...activeChannels,
          [activeServer]: channels[index - 1].id,
        },
      })
    }
  })
}
