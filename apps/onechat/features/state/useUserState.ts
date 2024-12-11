import type { User } from '~/config/zero/schema'
import { mutate, useQuery } from '~/features/state/zero'

// were using JSONB for UserState
type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  showHotMenu?: boolean
  channelState?: ChannelState
}

type ChannelState = {
  [server_and_channel_id: string]: {
    focusedMessage: string
  }
}

// TODO
let currentUser = null as User | null

const getUserState = () => {
  const stateString = (currentUser?.state ?? '{}') as string
  return JSON.parse(stateString) as UserState
}

export const useUserState = () => {
  const user = useQuery((q) => q.user)[0][0]
  currentUser = user
  const state = getUserState()
  const activeChannels = state.activeChannels || {}

  return [
    {
      ...state,
      activeChannels,
    },
    { activeChannel: activeChannels[state.activeServer || ''], user },
  ] as const
}

export const updateUserState = async (next: Partial<UserState>) => {
  if (!currentUser) {
    console.error(`No user`)
    return
  }

  const state = {
    ...getUserState(),
    ...next,
  }

  const nextUser = {
    ...currentUser,
    state: JSON.stringify(state),
  }

  console.warn('mutating', nextUser)

  await mutate.user.update(nextUser)
}
