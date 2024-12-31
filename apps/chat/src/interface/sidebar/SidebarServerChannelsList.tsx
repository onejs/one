import { useSortable } from '@dnd-kit/sortable'
import { Lock, Plus } from '@tamagui/lucide-icons'
import { Menu } from '@tauri-apps/api/menu'
import { forwardRef, useEffect, useState } from 'react'
import { SizableText, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { randomId } from '~/helpers/randomId'
import { useServerChannels } from '~/state/useQuery'
import { useCurrentServer } from '~/state/server/useCurrentServer'
import { updateUserState, useUserState } from '~/state/user'
import type { Channel } from '~/zero'
import { zero } from '~/zero'
import { ButtonSimple } from '../ButtonSimple'
import { EditableListItem, type EditableListItemProps } from '../lists/EditableListItem'
import { ListTitle } from '../lists/ListTitle'
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
        {server && user && (
          <ListTitle
            icon={
              <ButtonSimple
                onPress={() => {
                  setShowTempChannel(true)
                }}
              >
                <Plus size={16} o={0.5} />
              </ButtonSimple>
            }
            iconAfter
          >
            Channels
          </ListTitle>
        )}

        <SortableList
          items={channelsSorted}
          renderItem={(channel) => <ChannelListItemSortable key={channel.id} channel={channel} />}
          renderDraggingItem={(channel) => <DraggedChannel channel={channel} />}
          onSort={(sorted) => {
            console.warn(
              'sort',
              server,
              sorted.map((i) => i.id),
              performance.now()
            )
            if (!server) return
            zero.mutate.server.update({
              id: server.id,
              channelSort: sorted.map((i) => i.id),
            })
          }}
        />

        {showTempChannel && (
          <ChannelListItem
            defaultEditing
            onEditComplete={(name) => {
              if (!server) {
                alert('no server')
                return
              }
              const id = randomId()
              zero.mutate.channel.insert({
                id,
                description: '',
                name,
                private: false,
                serverId: server.id,
              })

              zero.mutate.server.update({
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
            onEditCancel={() => {
              setShowTempChannel(false)
            }}
          />
        )}
      </YStack>
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
                zero.mutate.channel.delete({
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
      onEditComplete,
      ...rest
    }: EditableListItemProps & {
      channel?: Channel
    },
    ref: any
  ) => {
    const [userState, derivedUserState] = useUserState()

    return (
      <EditableListItem
        ref={ref}
        icon={channel?.private ? <Lock mx="$2.5" o={0.5} size={12} /> : null}
        iconAfter
        before={
          <SizableText size="$2" mr={-5} o={0.3}>
            #
          </SizableText>
        }
        editingValue={channel?.name ?? ''}
        active={derivedUserState?.activeChannel === channel?.id}
        onPress={() => {
          if (!channel) return
          updateUserState({
            activeChannels: {
              ...userState.activeChannels,
              [userState.activeServer!]: channel.id,
            },
          })
        }}
        onEditComplete={(next) => {
          if (!channel || onEditComplete) {
            onEditComplete?.(next)
          } else {
            zero.mutate.channel.update({
              ...channel,
              name: next,
            })
          }
        }}
        {...rest}
      >
        {`${channel?.name || ''}`}
      </EditableListItem>
    )
  }
)
