import { memo } from 'react'
import { H3, SizableText, Spacer, XStack, YStack } from 'tamagui'
import { useFriends } from '~/state/useQuery'
import { SidebarServerChannelsList } from './SidebarServerChannelsList'
import { SidebarServersRow } from './SidebarServersRow'
import { ListTitle } from '../lists/ListTitle'
import { ButtonSimple } from '../ButtonSimple'
import { Plus } from '@tamagui/lucide-icons'
import { dialogAddFriend } from '../dialogs/actions'
import { ListItem } from '../lists/ListItem'

export const Sidebar = memo(() => {
  return (
    <YStack ov="hidden" f={10} mih={200} maw={250} miw={250} gap="$2">
      <SidebarServersRow />

      <SidebarServerChannelsList />

      <YStack btw={1} bc="$background025" py="$2" mt="auto" mah={200}>
        <SidebarQuickList />
      </YStack>
    </YStack>
  )
})

const SidebarQuickList = () => {
  const friends = useFriends()

  return (
    <>
      <ListTitle
        icon={
          <ButtonSimple
            tooltip="Add friend"
            onPress={() => {
              dialogAddFriend()
            }}
          >
            <Plus size={16} o={0.5} />
          </ButtonSimple>
        }
        iconAfter
      >
        Friends
      </ListTitle>
      <Spacer size="$2" />

      {friends.map((friend) => {
        return (
          <ListItem key={friend.id} onPress={() => {}}>
            {friend.username || friend.name}
          </ListItem>
        )
      })}
    </>
  )
}
