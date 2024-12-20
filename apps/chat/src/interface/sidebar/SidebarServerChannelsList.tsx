import { useSortable } from '@dnd-kit/sortable'
import { Lock, Plus } from '@tamagui/lucide-icons'
import { Menu } from '@tauri-apps/api/menu'
import { forwardRef, useEffect, useState } from 'react'
import { type XStackProps, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { randomID } from '~/helpers/randomID'
import { useCurrentServer, useServerChannels } from '~/state/server'
import { updateUserState, useUserState } from '~/state/user'
import type { Channel } from '~/zero/schema'
import { mutate } from '~/zero/zero'
import { ListItem } from '../lists/ListItem'
import { SortableList } from '../lists/SortableList'
import { useChannelsHotkeys } from './useChannelsHotkeys'

// TODO organize/enforce
// id order
type ServerChannelSort = string[]

export const SidebarServerChannelsList = () => {
  const { user } = useAuth()
  const server = useCurrentServer()
  const channels = useServerChannels()
  const channelSort: ServerChannelSort =
    Array.isArray(server?.channelSort) && server.channelSort.length
      ? server.channelSort
      : channels?.map((x) => x.id)

  const channelsSorted = channelSort.map((id) => channels.find((x) => x.id === id)!).filter(Boolean)
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

  const [showTempChannel, setShowTempChannel] = useState(false)

  return (
    <YStack>
      <YStack pos="relative">
        <SortableList
          items={channelsSorted}
          renderItem={(channel) => <ChannelListItemSortable key={channel.id} channel={channel} />}
          renderDraggingItem={(channel) => <DraggedChannel channel={channel} />}
          onSort={(sorted) => {
            if (!server) return
            mutate.server.update({
              id: server.id,
              channelSort: sorted.map((i) => i.id),
            })
          }}
        />

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

              mutate.server.update({
                id: server.id,
                channelSort: [...channelSort, id],
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

      {user && (
        <ListItem
          icon={Plus}
          iconAfter
          onPress={() => {
            setShowTempChannel(true)
          }}
        >
          New Channel
        </ListItem>
      )}
    </YStack>
  )
}

const DraggedChannel = ({ channel }: { channel: Channel }) => {
  return <ChannelListItem channel={channel} />
}

const ChannelListItemSortable = ({ channel }: { channel: Channel }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.id,
  })

  return (
    <ChannelListItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      {...transform}
      channel={channel}
      opacity={isDragging ? 0 : 1}
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
        editingValue={channel?.name ?? ''}
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
