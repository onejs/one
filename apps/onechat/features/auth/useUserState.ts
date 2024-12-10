import { mutate, useQuery } from '~/features/zero/zero'

// were using JSONB for UserState
type UserState = {
  serversSort?: string[]
  activeServer?: string
  activeChannel?: string
  showSidePanel?: 'user' | 'settings'
  showHotMenu?: boolean
}

// TODO
let currentUser = null as any

export const useUserState = () => {
  const user = useQuery((q) => q.user)[0]
  const state = (user?.state ?? null) as UserState | null
  currentUser = user
  return state
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
