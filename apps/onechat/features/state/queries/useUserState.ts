import type { User } from '~/config/zero/schema'
import { mutate, useQuery } from '~/features/state/zero'

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
export let currentUser = null as User | null

const getUserState = () => {
  return {
    activeChannels: {},
    ...(currentUser?.state ?? {}),
  } as UserState
}

export const useUserState = () => {
  const user = useQuery((q) => q.user)[0][0]
  currentUser = user
  const state = getUserState()

  return [state, { activeChannel: state.activeChannels[state.activeServer || ''], user }] as const
}

export const updateUserState = async (next: Partial<UserState>) => {
  if (!currentUser) {
    console.error(`No user`)
    return
  }

  const nextUser = {
    ...currentUser,
    state: {
      ...getUserState(),
      ...next,
    },
  }

  console.warn('mutating', nextUser)

  await mutate.user.update(nextUser)
}
