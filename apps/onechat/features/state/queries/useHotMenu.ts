// want this to be contextual based on current screen state

import { Server, UserPlus } from '@tamagui/lucide-icons'
import type { IconProps } from '@tamagui/helpers-icon'
import { dialogAddFriend } from '~/interface/dialogs/DialogAddFriend'
import { dialogJoinServer } from '~/interface/dialogs/DialogCreateJoinServer'

type HotMenuItem = {
  name: string
  Icon: React.NamedExoticComponent<IconProps>
  action: () => void
}

export const useHotMenuItems = () => {
  return globalMenuItems
}

const globalMenuItems: HotMenuItem[] = [
  {
    name: 'Add friend',
    Icon: UserPlus,
    action() {
      dialogAddFriend()
    },
  },

  {
    name: 'Join server',
    Icon: Server,
    action() {
      dialogJoinServer()
    },
  },
]
