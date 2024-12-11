import { mutate, useQuery } from '~/features/zero/zero'

// were using JSONB for UserState
type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  showHotMenu?: boolean
}

// TODO
let currentUser = null as any

export const useUserState = () => {
  const user = useQuery((q) => q.user)[0][0]
  const state = (user?.state ?? {}) as UserState
  currentUser = user
  state.activeChannels ||= {}
  return [
    state,
    state ? { activeChannel: state.activeChannels[state.activeServer || ''], user } : null,
  ] as const
}

export const updateUserState = async (next: Partial<UserState>) => {
  const state = {
    ...currentUser.state,
    ...next,
  }

  console.warn('mutating', state)

  await mutate.user.update({
    ...currentUser,
    // TODO deep merge
    state,
  })
}
