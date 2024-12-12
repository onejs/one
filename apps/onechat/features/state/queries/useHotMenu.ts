// want this to be contextual based on current screen state

import { UserPlus } from '@tamagui/lucide-icons'
import type { IconProps } from '@tamagui/helpers-icon'
import { dialogAddFriend } from '~/interface/dialogs/DialogAddFriend'

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
]
