import { merge } from 'ts-deepmerge'
import type { User } from '~/config/zero/schema'
import { mutate, useQuery } from '~/features/state/zero'

type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  showHotMenu?: boolean
  channelState?: ChannelsState
}

type ChannelsState = {
  [server_and_channel_id: string]: ChannelState
}

type ChannelState = {
  focusedMessageId?: string
  openedThreadId?: string
}

// TODO
export let currentUser = null as User | null

const getUserState = () => {
  return {
    activeChannels: {},
    ...(currentUser?.state ?? {}),
  } as UserState
}

const getDerivedUserState = () => {
  const state = getUserState()
  return { activeChannel: state.activeChannels[state.activeServer || ''], user: currentUser }
}

export const useUserState = () => {
  const user = useQuery((q) => q.user)[0][0]
  currentUser = user
  const state = getUserState()

  return [state, getDerivedUserState()] as const
}

export const useUserCurrentChannelState = (): ChannelState => {
  const [{ channelState }, { activeChannel }] = useUserState()
  return channelState?.[activeChannel] || {}
}

export const updateUserState = async (next: Partial<UserState>) => {
  if (!currentUser) {
    console.error(`No user`)
    return
  }

  const nextUser = {
    ...currentUser,
    state: merge(getUserState(), next),
  }

  console.warn('mutating', nextUser)

  await mutate.user.update(nextUser)
}

export const updateUserCurrentChannel = async (next: Partial<ChannelState>) => {
  if (!currentUser) {
    console.error(`No user`)
    return
  }

  const currentChannelId = getDerivedUserState().activeChannel

  return await updateUserState({
    channelState: {
      [currentChannelId]: next,
    },
  })
}
