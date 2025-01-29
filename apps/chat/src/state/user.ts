import { merge } from 'ts-deepmerge'
import { useAuth } from '~/better-auth/authClient'
import { ensureSignedUp } from '~/interface/dialogs/actions'
import { useQuery, type User, zero } from '~/zero'
import type { ChannelState, UserState } from '~/zero/types'

// TODO
let currentUser = null as User | null

setInterval(() => {
  console.log('user', currentUser)
}, 1000)

export const getCurrentUser = () => currentUser
export const clearCurrentUser = () => {
  console.log('clesrin')
  currentUser = null
}

const getJustUserState = () => {
  return {
    activeChannels: {},
    ...(currentUser?.state ?? {}),
  }
}

export const getDerivedUserState = () => {
  const state = getJustUserState()
  const activeChannel = state.activeChannels[state.activeServer || '']
  return {
    activeChannel,
    activeChannelState: state.channelState?.[activeChannel],
    activeThread: state.channelState?.[activeChannel],
    user: currentUser,
  }
}

export const getUserState = () => {
  const state = getJustUserState()
  return [state, getDerivedUserState()] as const
}

export const useUserState = () => {
  const { user: authUser, loggedIn } = useAuth()
  const user = useQuery((q) => q.user.where('id', authUser?.id || ''))[0][0]

  if (loggedIn) {
    console.warn('SETTING WTF')
    // TODO
    currentUser = user
  }

  return getUserState()
}

export const updateUserState = async (next: Partial<UserState>) => {
  if (!currentUser) {
    await ensureSignedUp()
    if (!currentUser) {
      console.warn(`No user`)
    }
    return
  }

  const nextUser = {
    ...currentUser,
    state: merge(getJustUserState(), next) as UserState,
  }

  console.warn('mutating', nextUser)

  await zero.mutate.user.update(nextUser)
}

// helpers

export const useUserCurrentChannelState = () => {
  const [_, { activeChannelState }] = useUserState()
  return activeChannelState
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

export const closeCurrentThread = () => {
  updateUserCurrentChannel({
    openedThreadId: undefined,
    maximized: false,
  })
}

export const updateUserOpenThread = async (thread: { id: string }) => {
  updateUserCurrentChannel({
    openedThreadId: thread.id,
  })
}

export const updateUserSetEditingMessage = async (id?: string) => {
  updateUserCurrentChannel({
    editingMessageId: id,
  })
}
