import type { IconProps } from '@tamagui/helpers-icon'
import { Server, User, UserPlus } from '@tamagui/lucide-icons'
import FlexSearch from 'flexsearch'
import { useMemo } from 'react'
import { useAuth } from '~/better-auth/authClient'
import { dialogAddFriend, dialogJoinServer, dialogSignup } from '~/interface/dialogs/actions'

type HotMenuItem = {
  name: string
  Icon: React.NamedExoticComponent<IconProps>
  action: () => void
}

export const useHotMenuItems = (search: string) => {
  const { loggedIn } = useAuth()

  const items = useMemo(() => {
    return loggedIn ? globalMenuItems : globalLoggedOutItems
  }, [loggedIn])

  const index = useMemo(() => {
    const _ = new FlexSearch.Index()
    for (const [idx, item] of items.entries()) {
      _.add(idx, item.name)
    }
    return _
  }, [items])

  return useMemo(() => {
    if (!search) {
      return items
    }
    const results = index.search(search)
    return results.map((index) => {
      return items[index as number]
    })
  }, [search, index, items])
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

const globalLoggedOutItems: HotMenuItem[] = [
  {
    name: 'Login',
    Icon: User,
    action() {
      dialogSignup()
    },
  },

  ...globalMenuItems,
]
