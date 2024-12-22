// want this to be contextual based on current screen state

import type { IconProps } from '@tamagui/helpers-icon'
import { Server, UserPlus } from '@tamagui/lucide-icons'
import FlexSearch from 'flexsearch'
import { dialogAddFriend, dialogJoinServer } from '~/interface/dialogs/actions'

type HotMenuItem = {
  id: number
  name: string
  Icon: React.NamedExoticComponent<IconProps>
  action: () => void
}

const index = new FlexSearch.Index()

export const useHotMenuItems = (search: string) => {
  if (!search) {
    return globalMenuItems
  }
  const results = index.search(search)
  return results.map((id) => {
    return globalMenuItems[id as number]
  })
}

const globalMenuItems: HotMenuItem[] = [
  {
    id: 0,
    name: 'Add friend',
    Icon: UserPlus,
    action() {
      dialogAddFriend()
    },
  },

  {
    id: 1,
    name: 'Join server',
    Icon: Server,
    action() {
      dialogJoinServer()
    },
  },
]

for (const item of globalMenuItems) {
  index.add(item.id, item.name)
}
