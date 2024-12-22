import { proxy, useSnapshot } from 'valtio'

type SessionState = {
  showHotMenu: boolean
}

const sessionState = proxy<SessionState>({
  showHotMenu: false,
})

export const useSessionState = () => {
  return useSnapshot(sessionState)
}

export const updateSessionState = (next: Partial<SessionState>) => {
  for (const key in next) {
    // @ts-expect-error
    sessionState[key] = next[key]
  }
}
